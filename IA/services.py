import json
import logging
import re
import time
from typing import Any, Dict, List, Optional

from django.conf import settings
from django.core.exceptions import PermissionDenied

from IA.context import IAContext, resolver_contexto_ia
from IA.llm.deepseek_client import DeepSeekClient
from IA.llm.ports import LLMConfigurationError, LLMResponse, estimate_tokens_from_messages
from IA.models import MensajeIA
from IA.prompts import ANSWER_SYSTEM_PROMPT, DENIAL_RESPONSE, TOOL_SELECTION_SYSTEM_PROMPT
from IA.tools import (
    IAToolError,
    allowed_tools_for_role,
    execute_tool,
    tool_catalog_for_prompt,
)


logger = logging.getLogger('mallor.ia')

SENSITIVE_PATTERNS = (
    r'\bsql\b',
    r'\bselect\b',
    r'\binsert\b',
    r'\bupdate\b',
    r'\bdelete\b',
    r'\bdrop\b',
    r'\bquery\b',
    r'\bbase de datos\b',
    r'\btabla(s)?\b',
    r'\bpassword\b',
    r'\bcontrasena\b',
    r'\bcontraseña\b',
    r'\btoken\b',
    r'\bsecret\b',
    r'\bcredencial(es)?\b',
    r'\bclient_secret\b',
    r'\bpayload\b',
    r'\bxml\b',
    r'\bpdf\b',
    r'\busuario(s)?\b',
    r'\bfactus credential\b',
)

TOOL_KEYWORDS = (
    ('resumen_facturacion_electronica', ('facturacion', 'factura electronica', 'factus', 'dian')),
    ('clientes_con_saldo_pendiente', (
        'que clientes me deben',
        'clientes que me deben',
        'cuales son los clientes que me deben',
        'el nombre de los clientes que me deben',
        'nombres de los clientes que me deben',
        'nombre de los clientes que me deben',
        'quienes me deben',
        'quien me debe',
        'clientes con saldo',
        'clientes morosos',
        'deudores',
    )),
    ('productos_bajo_stock', ('bajo stock', 'stock bajo', 'agotado', 'existencias bajas')),
    ('productos_mas_vendidos', ('mas vendido', 'mas vendidos', 'producto estrella', 'top productos')),
    ('valor_inventario', (
        'valor inventario',
        'inventario valorizado',
        'valor de inventario',
        'valor del inventario',
        'mi inventario',
        'inventario',
    )),
    ('mejores_clientes', ('mejor cliente', 'mejores clientes', 'top clientes')),
    ('cuentas_por_cobrar', ('por cobrar', 'cartera', 'deben', 'deuda', 'saldo pendiente')),
    ('resumen_ventas_periodo', ('venta', 'vendi', 'vendido', 'ingreso', 'ventas')),
)


class LocalRuleBasedLLMClient:
    """
    Fallback deterministico para desarrollo/tests cuando DeepSeek no esta configurado.
    """

    def chat(self, messages: List[Dict[str, str]], *, temperature=None) -> LLMResponse:
        content = messages[-1].get('content', '') if messages else ''
        return LLMResponse(
            content=content,
            tokens_entrada=estimate_tokens_from_messages(messages),
            tokens_salida=max(1, len(content) // 4),
        )


def build_llm_client():
    if getattr(settings, 'TESTING', False):
        return LocalRuleBasedLLMClient()
    if not getattr(settings, 'DEEPSEEK_API_KEY', ''):
        return LocalRuleBasedLLMClient()
    try:
        return DeepSeekClient()
    except LLMConfigurationError:
        logger.exception('DeepSeek no esta disponible; usando fallback local.')
        return LocalRuleBasedLLMClient()


class IAService:
    @staticmethod
    def procesar_consulta(
        *,
        request,
        consulta: str,
        sesion_id: Optional[str] = None,
        llm_client=None,
    ) -> Dict[str, Any]:
        inicio = time.monotonic()
        contexto = resolver_contexto_ia(request, sesion_id)
        llm = llm_client or build_llm_client()
        herramienta_usada = ''
        parametros = {}
        metadatos = {}
        tokens_entrada = 0
        tokens_salida = 0

        if IAService._es_consulta_restringida(consulta):
            respuesta = DENIAL_RESPONSE
        else:
            try:
                seleccion = IAService._seleccionar_herramienta(
                    consulta,
                    contexto,
                    llm,
                )
            except LLMConfigurationError:
                logger.exception(
                    'No fue posible usar DeepSeek para seleccionar herramienta; aplicando fallback local.',
                )
                seleccion = {
                    **IAService._heuristic_selection(consulta, contexto),
                    'tokens_entrada': 0,
                    'tokens_salida': 0,
                }
            tokens_entrada += seleccion.get('tokens_entrada', 0)
            tokens_salida += seleccion.get('tokens_salida', 0)
            herramienta_usada = seleccion.get('tool') or ''
            parametros = seleccion.get('params') or {}

            if herramienta_usada:
                try:
                    metadatos = execute_tool(herramienta_usada, parametros, contexto)
                    try:
                        respuesta_llm = IAService._generar_respuesta(
                            consulta,
                            contexto,
                            herramienta_usada,
                            metadatos,
                            llm,
                        )
                        respuesta = respuesta_llm.content
                        tokens_entrada += respuesta_llm.tokens_entrada
                        tokens_salida += respuesta_llm.tokens_salida
                    except LLMConfigurationError:
                        logger.exception(
                            'No fue posible usar DeepSeek para redactar la respuesta; aplicando fallback local.',
                        )
                        respuesta = IAService._fallback_answer(
                            herramienta_usada,
                            metadatos,
                        )
                except PermissionDenied:
                    respuesta = DENIAL_RESPONSE
                    herramienta_usada = ''
                    parametros = {}
                    metadatos = {}
                except IAToolError as exc:
                    respuesta = str(exc)
                    metadatos = {'error': str(exc)}
            else:
                respuesta = (
                    'Puedo ayudarte con ventas, inventario, clientes, cartera '
                    'y facturacion permitida. Reformula la consulta con uno de esos temas.'
                )

        tiempo = time.monotonic() - inicio
        mensaje = MensajeIA.objects.create(
            empresa=contexto.empresa,
            usuario=contexto.usuario,
            sesion_id=contexto.sesion_id,
            rol_empresa=contexto.rol_empresa,
            consulta=consulta,
            respuesta=respuesta,
            herramienta_usada=herramienta_usada,
            parametros_herramienta=IAService._sanitize_for_history(parametros),
            metadatos_resultado=IAService._summarize_result_for_history(metadatos),
            tiempo_respuesta=round(tiempo, 4),
            tokens_entrada=tokens_entrada,
            tokens_salida=tokens_salida,
        )

        return {
            'id': mensaje.id,
            'respuesta': respuesta,
            'sesion_id': str(contexto.sesion_id),
            'tiempo_respuesta': mensaje.tiempo_respuesta,
            'herramienta_usada': herramienta_usada,
            'metadatos': mensaje.metadatos_resultado,
        }

    @staticmethod
    def _es_consulta_restringida(texto: str) -> bool:
        normalized = texto.lower()
        return any(re.search(pattern, normalized) for pattern in SENSITIVE_PATTERNS)

    @staticmethod
    def _infer_period_params(texto: str) -> Dict[str, Any]:
        normalized = texto.lower()
        if 'hoy' in normalized:
            return {'periodo': 'hoy'}
        if 'semana' in normalized:
            return {'periodo': 'semana'}
        if 'mes' in normalized:
            return {'periodo': 'mes'}
        return {'periodo': 'mes'}

    @staticmethod
    def _heuristic_selection(texto: str, contexto: IAContext) -> Dict[str, Any]:
        normalized = texto.lower()
        allowed = allowed_tools_for_role(contexto.rol_empresa)
        follow_up = IAService._follow_up_selection(normalized, contexto, allowed)
        if follow_up.get('tool'):
            return follow_up
        for tool_name, keywords in TOOL_KEYWORDS:
            if tool_name not in allowed:
                continue
            if any(keyword in normalized for keyword in keywords):
                params = {}
                if tool_name in (
                    'resumen_ventas_periodo',
                    'productos_mas_vendidos',
                    'mejores_clientes',
                ):
                    params.update(IAService._infer_period_params(texto))
                if tool_name in (
                    'productos_mas_vendidos',
                    'mejores_clientes',
                    'productos_bajo_stock',
                    'clientes_con_saldo_pendiente',
                ):
                    params['limite'] = 10
                return {'tool': tool_name, 'params': params}
        return {'tool': None, 'params': {}}

    @staticmethod
    def _follow_up_selection(
        normalized_text: str,
        contexto: IAContext,
        allowed: Dict[str, Any],
    ) -> Dict[str, Any]:
        if not IAService._is_affirmative_follow_up(normalized_text):
            return {'tool': None, 'params': {}}

        ultimo_mensaje = MensajeIA.objects.filter(
            empresa=contexto.empresa,
            usuario=contexto.usuario,
            sesion_id=contexto.sesion_id,
        ).exclude(herramienta_usada='').order_by('-created_at', '-id').first()

        if not ultimo_mensaje:
            return {'tool': None, 'params': {}}

        follow_up_map = {
            'cuentas_por_cobrar': 'clientes_con_saldo_pendiente',
        }
        next_tool = follow_up_map.get(ultimo_mensaje.herramienta_usada)
        if next_tool and next_tool in allowed:
            return {'tool': next_tool, 'params': {'limite': 10}}
        return {'tool': None, 'params': {}}

    @staticmethod
    def _is_affirmative_follow_up(texto: str) -> bool:
        normalized = texto.strip().lower()
        return normalized in {
            'si',
            'sí',
            'dale',
            'ok',
            'okay',
            'hazlo',
            'muestrame',
            'muestramelo',
            'muéstrame',
            'muéstramelo',
            'quiero verlo',
            'ver detalle',
            'detalle',
        }

    @staticmethod
    def _seleccionar_herramienta(
        consulta: str,
        contexto: IAContext,
        llm_client,
    ) -> Dict[str, Any]:
        heuristic = IAService._heuristic_selection(consulta, contexto)
        if heuristic.get('tool'):
            return {**heuristic, 'tokens_entrada': 0, 'tokens_salida': 0}

        catalog = tool_catalog_for_prompt(contexto.rol_empresa)
        messages = [
            {'role': 'system', 'content': TOOL_SELECTION_SYSTEM_PROMPT},
            {
                'role': 'user',
                'content': json.dumps(
                    {
                        'consulta': consulta,
                        'rol': contexto.rol_empresa,
                        'historial_reciente': IAService._historial_saneado(contexto),
                        'herramientas_permitidas': catalog,
                    },
                    ensure_ascii=True,
                ),
            },
        ]
        response = llm_client.chat(messages, temperature=0)
        try:
            parsed = json.loads(response.content)
        except (TypeError, ValueError):
            parsed = {'tool': None, 'params': {}}

        tool = parsed.get('tool')
        if tool not in allowed_tools_for_role(contexto.rol_empresa):
            tool = None
        params = parsed.get('params') if isinstance(parsed.get('params'), dict) else {}
        return {
            'tool': tool,
            'params': params,
            'tokens_entrada': response.tokens_entrada,
            'tokens_salida': response.tokens_salida,
        }

    @staticmethod
    def _generar_respuesta(
        consulta: str,
        contexto: IAContext,
        herramienta: str,
        resultado: Dict[str, Any],
        llm_client,
    ) -> LLMResponse:
        if isinstance(llm_client, LocalRuleBasedLLMClient):
            fallback = IAService._fallback_answer(herramienta, resultado)
            return LLMResponse(
                content=fallback,
                tokens_entrada=0,
                tokens_salida=max(1, len(fallback) // 4),
            )

        messages = [
            {'role': 'system', 'content': ANSWER_SYSTEM_PROMPT},
            {
                'role': 'user',
                'content': json.dumps(
                    {
                        'consulta': consulta,
                        'rol': contexto.rol_empresa,
                        'historial_reciente': IAService._historial_saneado(contexto),
                        'herramienta': herramienta,
                        'resultado_saneado': resultado,
                    },
                    ensure_ascii=True,
                ),
            },
        ]
        response = llm_client.chat(messages, temperature=0.2)
        if not response.content.strip():
            response.content = IAService._fallback_answer(herramienta, resultado)
        return response

    @staticmethod
    def _fallback_answer(herramienta: str, resultado: Dict[str, Any]) -> str:
        if herramienta == 'resumen_ventas_periodo':
            datos = resultado.get('datos', {})
            resumen = datos.get('resumen', {})
            comparacion = datos.get('comparacion_periodo_anterior', {})
            total_ventas = resumen.get('total_ventas', 0)
            cantidad = resumen.get('cantidad_ventas', 0)
            ticket = resumen.get('ticket_promedio', 0)
            variacion = (
                comparacion.get('total_ventas', {}) or {}
            ).get('variacion_porcentual')
            respuesta = (
                f"En el periodo consultado se registraron {cantidad} ventas por "
                f"{IAService._format_currency(total_ventas)}. "
                f"El ticket promedio fue {IAService._format_currency(ticket)}."
            )
            if variacion is not None:
                respuesta += f" Frente al periodo anterior, la variacion fue {variacion}%."
            return respuesta

        if herramienta == 'productos_bajo_stock':
            resultados = resultado.get('resultados', [])
            if not resultados:
                return 'No hay productos por debajo del stock minimo configurado.'
            top = resultados[:5]
            items = ', '.join(
                f"{item.get('nombre', 'Producto')} ({item.get('existencias', 0)})"
                for item in top
            )
            return (
                f"Hay {len(resultados)} productos bajo stock. "
                f"Los mas urgentes son: {items}."
            )

        if herramienta == 'productos_mas_vendidos':
            datos = resultado.get('datos', {})
            items = datos.get('resultados', [])
            if not items:
                return 'No hubo ventas del periodo consultado.'
            top = ', '.join(
                f"{item.get('nombre', 'Producto')} ({item.get('cantidad_vendida', 0)} u.)"
                for item in items[:5]
            )
            return f"Los productos mas vendidos del periodo fueron: {top}."

        if herramienta == 'valor_inventario':
            datos = resultado.get('datos', {})
            return (
                f"El inventario actual esta valorizado en "
                f"{IAService._format_currency(datos.get('valor_compra', 0))} a costo y "
                f"{IAService._format_currency(datos.get('valor_venta', 0))} a precio de venta. "
                f"Hay {datos.get('cantidad_productos', 0)} referencias activas."
            )

        if herramienta == 'mejores_clientes':
            datos = resultado.get('datos', {})
            items = datos.get('resultados', [])
            if not items:
                return 'No hay clientes destacados para el periodo consultado.'
            top = ', '.join(
                f"{item.get('nombre', 'Cliente')} ({IAService._format_currency(item.get('total_comprado', 0))})"
                for item in items[:5]
            )
            return f"Los mejores clientes del periodo fueron: {top}."

        if herramienta == 'cuentas_por_cobrar':
            total = (resultado.get('total') or {}).get('total_cartera', 0)
            cantidad = (resultado.get('total') or {}).get('cantidad_ventas', 0)
            buckets = (resultado.get('antiguedad') or {}).get('distribucion', [])
            bucket_text = ', '.join(
                f"{bucket.get('label', '')}: {IAService._format_currency(bucket.get('total', 0))}"
                for bucket in buckets if bucket.get('total', 0)
            )
            respuesta = (
                f"La cartera por cobrar es {IAService._format_currency(total)} "
                f"distribuida en {cantidad} ventas."
            )
            if bucket_text:
                respuesta += f" Antiguedad: {bucket_text}."
            if total and cantidad:
                respuesta += ' Si quieres, puedo listar los clientes con saldo pendiente.'
            return respuesta

        if herramienta == 'clientes_con_saldo_pendiente':
            resultados = resultado.get('resultados', [])
            if not resultados:
                return 'No hay clientes con saldo pendiente en este momento.'
            top = '; '.join(
                (
                    f"{item.get('nombre', 'Cliente')} debe "
                    f"{IAService._format_currency(item.get('total_pendiente', 0))} "
                    f"en {item.get('cantidad_ventas', 0)} venta(s)"
                )
                for item in resultados[:5]
            )
            total_clientes = len(resultados)
            respuesta = f"Estos son los clientes con saldo pendiente: {top}."
            if total_clientes > 5:
                respuesta += f" Hay {total_clientes} clientes con saldo en total."
            return respuesta

        if herramienta == 'resumen_facturacion_electronica':
            config = resultado.get('configuracion', {})
            estados = resultado.get('documentos_por_estado', {})
            estados_text = ', '.join(
                f"{estado}: {total}" for estado, total in estados.items()
            ) or 'sin documentos'
            return (
                f"La facturacion electronica esta "
                f"{'habilitada' if config.get('habilitada') else 'deshabilitada'} "
                f"en ambiente {config.get('ambiente') or 'no configurado'}. "
                f"Estado documental: {estados_text}."
            )

        return 'No encontre una forma segura de resumir esta consulta.'

    @staticmethod
    def _format_currency(value: Any) -> str:
        try:
            amount = float(value or 0)
        except (TypeError, ValueError):
            amount = 0.0
        return f"${amount:,.2f}"

    @staticmethod
    def obtener_historial(contexto: IAContext, sesion_id=None):
        queryset = MensajeIA.objects.filter(
            empresa=contexto.empresa,
            usuario=contexto.usuario,
        )
        if sesion_id:
            queryset = queryset.filter(sesion_id=sesion_id)
        return queryset.order_by('-created_at', '-id')

    @staticmethod
    def limpiar_historial(contexto: IAContext, sesion_id=None) -> int:
        queryset = IAService.obtener_historial(contexto, sesion_id)
        deleted, _ = queryset.delete()
        return deleted

    @staticmethod
    def registrar_feedback(
        contexto: IAContext,
        mensaje_id: int,
        feedback: str,
        comentario: str = '',
    ) -> MensajeIA:
        mensaje = MensajeIA.objects.get(
            pk=mensaje_id,
            empresa=contexto.empresa,
            usuario=contexto.usuario,
        )
        mensaje.feedback = feedback
        mensaje.feedback_comentario = comentario[:1000]
        mensaje.save(update_fields=['feedback', 'feedback_comentario'])
        return mensaje

    @staticmethod
    def sugerencias(contexto: IAContext) -> List[Dict[str, str]]:
        suggestions = [
            {
                'tool': 'resumen_ventas_periodo',
                'label': 'Ventas de hoy',
                'consulta': 'Cuanto vendi hoy?',
            },
            {
                'tool': 'productos_bajo_stock',
                'label': 'Bajo stock',
                'consulta': 'Que productos estan bajo stock?',
            },
            {
                'tool': 'productos_mas_vendidos',
                'label': 'Mas vendidos',
                'consulta': 'Cuales son los productos mas vendidos este mes?',
            },
            {
                'tool': 'valor_inventario',
                'label': 'Valor inventario',
                'consulta': 'Cual es el valor de mi inventario?',
            },
            {
                'tool': 'cuentas_por_cobrar',
                'label': 'Cartera',
                'consulta': 'Cuanto tengo en cuentas por cobrar?',
            },
            {
                'tool': 'clientes_con_saldo_pendiente',
                'label': 'Clientes con saldo',
                'consulta': 'Cuales son los clientes que me deben?',
            },
            {
                'tool': 'mejores_clientes',
                'label': 'Mejores clientes',
                'consulta': 'Quienes son mis mejores clientes este mes?',
            },
            {
                'tool': 'resumen_facturacion_electronica',
                'label': 'Facturacion electronica',
                'consulta': 'Dame un resumen de facturacion electronica.',
            },
        ]
        allowed = allowed_tools_for_role(contexto.rol_empresa)
        return [item for item in suggestions if item['tool'] in allowed]

    @staticmethod
    def _historial_saneado(contexto: IAContext) -> List[Dict[str, str]]:
        limite = getattr(settings, 'IA_MAX_HISTORY_MESSAGES', 12)
        mensajes = MensajeIA.objects.filter(
            empresa=contexto.empresa,
            usuario=contexto.usuario,
            sesion_id=contexto.sesion_id,
        ).order_by('-created_at', '-id')[:limite]
        return [
            {
                'consulta': mensaje.consulta[:500],
                'respuesta': mensaje.respuesta[:800],
                'herramienta': mensaje.herramienta_usada,
            }
            for mensaje in reversed(list(mensajes))
        ]

    @staticmethod
    def _sanitize_for_history(value: Any) -> Any:
        if isinstance(value, dict):
            sanitized = {}
            for key, item in value.items():
                lower_key = str(key).lower()
                if any(term in lower_key for term in ('secret', 'password', 'token', 'payload', 'credential')):
                    sanitized[key] = '[REDACTED]'
                else:
                    sanitized[key] = IAService._sanitize_for_history(item)
            return sanitized
        if isinstance(value, list):
            return [IAService._sanitize_for_history(item) for item in value[:20]]
        return value

    @staticmethod
    def _summarize_result_for_history(value: Any) -> Dict[str, Any]:
        sanitized = IAService._sanitize_for_history(value)
        encoded = json.dumps(sanitized, ensure_ascii=True, default=str)
        max_chars = getattr(settings, 'IA_HISTORY_RESULT_MAX_CHARS', 4000)
        if len(encoded) > max_chars:
            return {
                'truncated': True,
                'preview': encoded[:max_chars],
            }
        return sanitized if isinstance(sanitized, dict) else {'resultado': sanitized}
