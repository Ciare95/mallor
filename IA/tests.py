import json
from decimal import Decimal

from django.test import TestCase
from rest_framework import status
from rest_framework.test import APIClient

from IA.llm.ports import LLMConfigurationError
from IA.models import MensajeIA
from cliente.models import Cliente
from empresa.models import Empresa, EmpresaUsuario
from inventario.models import Producto
from usuario.models import Usuario
from ventas.models import (
    FacturacionElectronicaConfig,
    FactusCredential,
    FactusNumberingRange,
    Venta,
    VentaFacturaElectronica,
)


class IAAislamientoMultitenantTest(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.password = 'Secret123'
        self.empresa_a = Empresa.objects.create(
            nit='901100100',
            razon_social='Empresa IA A SAS',
            nombre_comercial='IA A',
        )
        self.empresa_b = Empresa.objects.create(
            nit='901200200',
            razon_social='Empresa IA B SAS',
            nombre_comercial='IA B',
        )
        self.admin = Usuario.objects.create_user(
            username='ia_admin',
            email='ia_admin@mallor.test',
            password=self.password,
            role=Usuario.Rol.ADMIN,
        )
        EmpresaUsuario.objects.create(
            empresa=self.empresa_a,
            usuario=self.admin,
            rol=EmpresaUsuario.Rol.ADMIN,
            activo=True,
        )
        self.client.login(username=self.admin.username, password=self.password)

        self.cliente_b = Cliente.objects.create(
            empresa=self.empresa_b,
            tipo_documento=Cliente.TipoDocumento.CC,
            numero_documento='1122334455',
            nombre='Cliente Privado B',
            telefono='3000000000',
            direccion='Calle B',
            ciudad='Bogota',
            departamento='Cundinamarca',
        )
        self.venta_b = Venta.objects.create(
            empresa=self.empresa_b,
            cliente=self.cliente_b,
            subtotal=Decimal('9999.00'),
            impuestos=Decimal('0.00'),
            total=Decimal('9999.00'),
            estado=Venta.Estado.TERMINADA,
            usuario_registro=self.admin,
        )

    def test_empresa_a_no_obtiene_datos_empresa_b_por_ia(self):
        response = self.client.post(
            '/api/ia/chat/',
            {'consulta': 'Cuanto vendi hoy?'},
            format='json',
            HTTP_X_EMPRESA_ID=str(self.empresa_a.id),
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['herramienta_usada'], 'resumen_ventas_periodo')
        self.assertNotIn('9999', json.dumps(response.data))
        self.assertEqual(
            response.data['metadatos']['datos']['resumen']['total_ventas'],
            0.0,
        )

    def test_usuario_sin_membresia_no_usa_ia_para_empresa(self):
        response = self.client.post(
            '/api/ia/chat/',
            {'consulta': 'Cuanto vendi hoy?'},
            format='json',
            HTTP_X_EMPRESA_ID=str(self.empresa_b.id),
        )

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_empresa_inactiva_no_usa_ia(self):
        empresa_inactiva = Empresa.objects.create(
            nit='901333444',
            razon_social='Empresa Inactiva IA',
            activo=False,
        )
        EmpresaUsuario.objects.create(
            empresa=empresa_inactiva,
            usuario=self.admin,
            rol=EmpresaUsuario.Rol.ADMIN,
            activo=True,
        )

        response = self.client.post(
            '/api/ia/chat/',
            {'consulta': 'Cuanto vendi hoy?'},
            format='json',
            HTTP_X_EMPRESA_ID=str(empresa_inactiva.id),
        )

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_historial_no_mezcla_empresas(self):
        EmpresaUsuario.objects.create(
            empresa=self.empresa_b,
            usuario=self.admin,
            rol=EmpresaUsuario.Rol.ADMIN,
            activo=True,
        )
        MensajeIA.objects.create(
            empresa=self.empresa_a,
            usuario=self.admin,
            rol_empresa=EmpresaUsuario.Rol.ADMIN,
            consulta='Consulta A',
            respuesta='Respuesta A',
        )
        MensajeIA.objects.create(
            empresa=self.empresa_b,
            usuario=self.admin,
            rol_empresa=EmpresaUsuario.Rol.ADMIN,
            consulta='Consulta B',
            respuesta='Respuesta B',
        )

        response = self.client.get(
            '/api/ia/historial/',
            HTTP_X_EMPRESA_ID=str(self.empresa_a.id),
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        consultas = [item['consulta'] for item in response.data['results']]
        self.assertEqual(consultas, ['Consulta A'])


class IAPermisosYSecretosTest(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.password = 'Secret123'
        self.empresa = Empresa.objects.create(
            nit='901444555',
            razon_social='Empresa IA Permisos SAS',
        )
        self.admin = Usuario.objects.create_user(
            username='ia_owner',
            email='ia_owner@mallor.test',
            password=self.password,
            role=Usuario.Rol.ADMIN,
        )
        self.empleado = Usuario.objects.create_user(
            username='ia_empleado',
            email='ia_empleado@mallor.test',
            password=self.password,
            role=Usuario.Rol.EMPLEADO,
        )
        EmpresaUsuario.objects.create(
            empresa=self.empresa,
            usuario=self.admin,
            rol=EmpresaUsuario.Rol.ADMIN,
            activo=True,
        )
        EmpresaUsuario.objects.create(
            empresa=self.empresa,
            usuario=self.empleado,
            rol=EmpresaUsuario.Rol.EMPLEADO,
            activo=True,
        )

    def test_empleado_no_consulta_factus_datos_fiscales_ni_usuarios(self):
        self.client.login(username=self.empleado.username, password=self.password)

        response = self.client.post(
            '/api/ia/chat/',
            {'consulta': 'Dame un resumen de facturacion electronica Factus'},
            format='json',
            HTTP_X_EMPRESA_ID=str(self.empresa.id),
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['herramienta_usada'], '')
        self.assertNotIn('factus_credentials', json.dumps(response.data).lower())

        sugerencias = self.client.get(
            '/api/ia/sugerencias/',
            HTTP_X_EMPRESA_ID=str(self.empresa.id),
        )
        tools = {item['tool'] for item in sugerencias.data['results']}
        self.assertNotIn('resumen_facturacion_electronica', tools)
        self.assertNotIn('mejores_clientes', tools)

    def test_no_guarda_secretos_credenciales_en_historial(self):
        self.client.login(username=self.admin.username, password=self.password)
        FactusCredential.objects.create(
            empresa=self.empresa,
            environment='SANDBOX',
            base_url='https://api-sandbox.factus.com.co',
            client_id='client-id-visible',
            client_secret='secret-no-debe-salir',
            username='factus-user',
            password='password-no-debe-salir',
        )
        rango = FactusNumberingRange.objects.create(
            empresa=self.empresa,
            factus_id=2001,
            document_code='01',
            prefix='SETI',
            from_number=1,
            to_number=100,
            current_number=5,
            is_active=True,
        )
        config = FacturacionElectronicaConfig.get_solo(self.empresa)
        config.is_enabled = True
        config.active_bill_range = rango
        config.save()
        venta = Venta.objects.create(
            empresa=self.empresa,
            subtotal=Decimal('100.00'),
            impuestos=Decimal('0.00'),
            total=Decimal('100.00'),
            estado=Venta.Estado.TERMINADA,
            usuario_registro=self.admin,
        )
        VentaFacturaElectronica.objects.create(
            empresa=self.empresa,
            venta=venta,
            reference_code='IA-FACTUS-1',
            bill_number='SETI-5',
            status=VentaFacturaElectronica.Status.EMITIDA,
            request_payload={'client_secret': 'payload-secreto'},
            response_payload={'token': 'payload-token'},
        )

        response = self.client.post(
            '/api/ia/chat/',
            {'consulta': 'Dame el estado Factus de mi empresa'},
            format='json',
            HTTP_X_EMPRESA_ID=str(self.empresa.id),
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(
            response.data['herramienta_usada'],
            'resumen_facturacion_electronica',
        )
        message = MensajeIA.objects.get(pk=response.data['id'])
        persisted = json.dumps({
            'respuesta': message.respuesta,
            'params': message.parametros_herramienta,
            'metadatos': message.metadatos_resultado,
        })
        self.assertNotIn('secret-no-debe-salir', persisted)
        self.assertNotIn('password-no-debe-salir', persisted)
        self.assertNotIn('payload-secreto', persisted)
        self.assertNotIn('payload-token', persisted)


class IADeepSeekFallbackTest(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.password = 'Secret123'
        self.empresa = Empresa.objects.create(
            nit='901666777',
            razon_social='Empresa IA Fallback SAS',
        )
        self.usuario = Usuario.objects.create_user(
            username='ia_fallback',
            email='ia_fallback@mallor.test',
            password=self.password,
            role=Usuario.Rol.ADMIN,
        )
        EmpresaUsuario.objects.create(
            empresa=self.empresa,
            usuario=self.usuario,
            rol=EmpresaUsuario.Rol.ADMIN,
            activo=True,
        )
        self.client.login(username=self.usuario.username, password=self.password)
        self.cliente = Cliente.objects.create(
            empresa=self.empresa,
            tipo_documento=Cliente.TipoDocumento.CC,
            numero_documento='123456789',
            nombre='Cliente Cartera',
            telefono='3000000001',
            direccion='Calle 1',
            ciudad='Bogota',
            departamento='Cundinamarca',
        )
        self.venta = Venta.objects.create(
            empresa=self.empresa,
            cliente=self.cliente,
            subtotal=Decimal('28019.98'),
            impuestos=Decimal('0.00'),
            total=Decimal('28019.98'),
            saldo_pendiente=Decimal('28019.98'),
            estado=Venta.Estado.TERMINADA,
            usuario_registro=self.usuario,
        )
        Producto.objects.create(
            empresa=self.empresa,
            nombre='Paracetamol',
            existencias=Decimal('8.00'),
            precio_compra=Decimal('1000.00'),
            precio_venta=Decimal('1500.00'),
        )

    def test_chat_no_rompe_si_llm_falla_por_configuracion_o_red(self):
        class BrokenLLMClient:
            def chat(self, messages, *, temperature=None):
                raise LLMConfigurationError('DNS error DeepSeek')

        from IA.services import IAService

        request = type('RequestStub', (), {
            'user': self.usuario,
            'empresa': self.empresa,
        })()

        result = IAService.procesar_consulta(
            request=request,
            consulta='Cuanto vendi hoy?',
            llm_client=BrokenLLMClient(),
        )

        self.assertIn('ventas', result['respuesta'].lower())
        self.assertEqual(result['herramienta_usada'], 'resumen_ventas_periodo')

    def test_consulta_inventario_usa_herramienta_de_inventario(self):
        response = self.client.post(
            '/api/ia/chat/',
            {'consulta': 'Cual es el valor de mi inventario?'},
            format='json',
            HTTP_X_EMPRESA_ID=str(self.empresa.id),
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['herramienta_usada'], 'valor_inventario')
        self.assertIn('inventario', response.data['respuesta'].lower())

    def test_consulta_clientes_que_deben_devuelve_detalle_por_cliente(self):
        response = self.client.post(
            '/api/ia/chat/',
            {'consulta': 'Cuales son los clientes que me deben?'},
            format='json',
            HTTP_X_EMPRESA_ID=str(self.empresa.id),
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(
            response.data['herramienta_usada'],
            'clientes_con_saldo_pendiente',
        )
        self.assertIn('cliente cartera', response.data['respuesta'].lower())

    def test_consulta_que_clientes_me_deben_tambien_usa_detalle_por_cliente(self):
        response = self.client.post(
            '/api/ia/chat/',
            {'consulta': 'que clientes me deben'},
            format='json',
            HTTP_X_EMPRESA_ID=str(self.empresa.id),
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(
            response.data['herramienta_usada'],
            'clientes_con_saldo_pendiente',
        )
        self.assertIn('cliente cartera', response.data['respuesta'].lower())

    def test_follow_up_si_continua_desde_cartera_hacia_detalle_clientes(self):
        primera = self.client.post(
            '/api/ia/chat/',
            {'consulta': 'Cuanto tengo en cuentas por cobrar?'},
            format='json',
            HTTP_X_EMPRESA_ID=str(self.empresa.id),
        )

        self.assertEqual(primera.status_code, status.HTTP_200_OK)
        self.assertEqual(primera.data['herramienta_usada'], 'cuentas_por_cobrar')

        detalle = self.client.post(
            '/api/ia/chat/',
            {
                'consulta': 'si',
                'sesion_id': primera.data['sesion_id'],
            },
            format='json',
            HTTP_X_EMPRESA_ID=str(self.empresa.id),
        )

        self.assertEqual(detalle.status_code, status.HTTP_200_OK)
        self.assertEqual(
            detalle.data['herramienta_usada'],
            'clientes_con_saldo_pendiente',
        )
        self.assertIn('cliente cartera', detalle.data['respuesta'].lower())
