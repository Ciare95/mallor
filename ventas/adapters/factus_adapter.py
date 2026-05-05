import base64
import hashlib
import logging
from typing import Any, Dict, Optional

import requests
from django.conf import settings
from django.core.cache import cache

from core.exceptions import (
    FacturacionAutenticacionError,
    FacturacionComunicacionError,
    FacturacionConfiguracionError,
    FacturacionOperacionError,
)
from ventas.ports import FacturacionPort


logger = logging.getLogger('mallor.factus')


class FactusAdapter(FacturacionPort):
    TOKEN_CACHE_KEY = 'factus_access_token'
    REFRESH_CACHE_KEY = 'factus_refresh_token'
    TOKEN_BUFFER_SECONDS = 300

    def __init__(self, *, empresa=None, config: Optional[Dict[str, Any]] = None):
        self.empresa = empresa
        self.config = config or self._resolve_config(empresa)
        cache_suffix = hashlib.sha256(
            '|'.join([
                self.config.get('BASE_URL', ''),
                self.config.get('CLIENT_ID', ''),
                self.config.get('USERNAME', ''),
            ]).encode('utf-8'),
        ).hexdigest()[:16]
        self.token_cache_key = f'{self.TOKEN_CACHE_KEY}:{cache_suffix}'
        self.refresh_cache_key = f'{self.REFRESH_CACHE_KEY}:{cache_suffix}'
        self.base_url = self.config['BASE_URL'].rstrip('/')
        self.timeout = self.config['TIMEOUT']
        self.max_retries = self.config['MAX_RETRIES']
        self.verify_ssl = self.config['VERIFY_SSL']
        self.session = requests.Session()

        required = ['CLIENT_ID', 'CLIENT_SECRET', 'USERNAME', 'PASSWORD']
        missing = [key for key in required if not self.config.get(key)]
        if missing:
            raise FacturacionConfiguracionError(
                'Configuracion Factus incompleta en variables de entorno.',
                code='factus_config_incompleta',
            )

    @staticmethod
    def _resolve_config(empresa=None) -> Dict[str, Any]:
        if empresa is None:
            from empresa.context import get_empresa_actual

            empresa = get_empresa_actual()

        if empresa is not None:
            from ventas.models import FacturacionElectronicaConfig, FactusCredential

            facturacion_config = FacturacionElectronicaConfig.get_solo(empresa)
            credential = FactusCredential.objects.filter(
                empresa=empresa,
                environment=facturacion_config.environment,
                activo=True,
            ).first()
            if credential:
                return {
                    'BASE_URL': credential.base_url,
                    'CLIENT_ID': credential.client_id,
                    'CLIENT_SECRET': credential.client_secret,
                    'USERNAME': credential.username,
                    'PASSWORD': credential.password,
                    'TIMEOUT': credential.timeout,
                    'MAX_RETRIES': credential.max_retries,
                    'VERIFY_SSL': credential.verify_ssl,
                }

        return settings.FACTUS_CONFIG

    def _request(
        self,
        method: str,
        path: str,
        *,
        json: Optional[Dict[str, Any]] = None,
        data: Optional[Dict[str, Any]] = None,
        params: Optional[Dict[str, Any]] = None,
        with_auth: bool = True,
        stream: bool = False,
    ) -> requests.Response:
        url = f'{self.base_url}{path}'
        headers = {'Accept': 'application/json'}

        if with_auth:
            headers['Authorization'] = f'Bearer {self._get_access_token()}'

        last_exc = None
        for attempt in range(1, self.max_retries + 2):
            try:
                response = self.session.request(
                    method=method,
                    url=url,
                    headers=headers,
                    json=json,
                    data=data,
                    params=params,
                    timeout=self.timeout,
                    verify=self.verify_ssl,
                    stream=stream,
                )

                if response.status_code == 401 and with_auth:
                    logger.warning('Factus devolvio 401, intentando refresh token')
                    self._refresh_access_token()
                    headers['Authorization'] = f'Bearer {self._get_access_token()}'
                    continue

                if response.status_code >= 400:
                    detail = self._safe_json(response)
                    raise FacturacionOperacionError(
                        f'Factus respondio {response.status_code}: {detail}',
                        code=f'factus_http_{response.status_code}',
                    )
                return response
            except requests.exceptions.Timeout as exc:
                last_exc = exc
                logger.warning('Timeout llamando a Factus %s %s intento %s', method, path, attempt)
            except requests.exceptions.RequestException as exc:
                last_exc = exc
                logger.warning('Error de red llamando a Factus %s %s intento %s', method, path, attempt)
            except FacturacionOperacionError:
                raise

        raise FacturacionComunicacionError(
            f'No fue posible comunicarse con Factus: {last_exc}',
            code='factus_comunicacion',
        )

    def _safe_json(self, response: requests.Response) -> Any:
        try:
            return response.json()
        except ValueError:
            return response.text

    def _auth_payload(self, grant_type: str, **extra) -> Dict[str, Any]:
        payload = {
            'grant_type': grant_type,
            'client_id': self.config['CLIENT_ID'],
            'client_secret': self.config['CLIENT_SECRET'],
        }
        payload.update(extra)
        return payload

    def _store_tokens(self, payload: Dict[str, Any]) -> str:
        access_token = payload.get('access_token')
        refresh_token = payload.get('refresh_token')
        expires_in = int(payload.get('expires_in', 3600))

        if not access_token:
            raise FacturacionAutenticacionError(
                'Factus no devolvio access token.',
                code='factus_token_vacio',
            )

        cache_timeout = max(expires_in - self.TOKEN_BUFFER_SECONDS, 60)
        cache.set(self.token_cache_key, access_token, cache_timeout)
        if refresh_token:
            cache.set(self.refresh_cache_key, refresh_token, 60 * 60 * 24)
        return access_token

    def _obtain_access_token(self) -> str:
        response = self._request(
            'POST',
            '/oauth/token',
            data=self._auth_payload(
                'password',
                username=self.config['USERNAME'],
                password=self.config['PASSWORD'],
            ),
            with_auth=False,
        )
        return self._store_tokens(response.json())

    def _refresh_access_token(self) -> str:
        refresh_token = cache.get(self.refresh_cache_key)
        if not refresh_token:
            return self._obtain_access_token()

        response = self._request(
            'POST',
            '/oauth/token',
            data=self._auth_payload(
                'refresh_token',
                refresh_token=refresh_token,
            ),
            with_auth=False,
        )
        return self._store_tokens(response.json())

    def _get_access_token(self) -> str:
        token = cache.get(self.token_cache_key)
        if token:
            return token
        return self._obtain_access_token()

    def validar_conexion(self) -> Dict[str, Any]:
        return self.ver_empresa()

    def ver_empresa(self) -> Dict[str, Any]:
        response = self._request('GET', '/v2/companies')
        return response.json()

    def listar_rangos(self) -> Dict[str, Any]:
        try:
            response = self._request('GET', '/v2/numbering-ranges/dian')
        except FacturacionOperacionError as exc:
            if exc.code != 'factus_http_404':
                raise
            logger.info(
                'Factus no devolvio rangos DIAN asociados; usando listado general.',
            )
            response = self._request('GET', '/v2/numbering-ranges')
        return response.json()

    def consultar_adquiriente(
        self,
        identification_document_id: str,
        identification_number: str,
    ) -> Dict[str, Any]:
        response = self._request(
            'GET',
            '/v2/dian/acquirer',
            params={
                'identification_document_id': identification_document_id,
                'identification_number': identification_number,
            },
        )
        return response.json()

    def emitir_factura(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        response = self._request(
            'POST',
            '/v2/bills/validate',
            json=payload,
        )
        return response.json()

    @staticmethod
    def _decode_document_file(
        response: requests.Response,
        encoded_key: str,
        default_filename: str,
        content_type: str,
    ) -> Dict[str, Any]:
        response_content_type = response.headers.get('Content-Type', '')
        if not response_content_type.startswith('application/json'):
            return {
                'content': response.content,
                'content_type': content_type,
                'filename': default_filename,
            }

        payload = response.json()
        data = payload.get('data') or {}
        encoded_content = data.get(encoded_key)
        if not encoded_content:
            raise FacturacionOperacionError(
                'Factus no devolvio el archivo solicitado.',
                code='factus_archivo_no_disponible',
            )

        filename = data.get('file_name') or default_filename
        if '.' not in filename:
            filename = default_filename

        return {
            'content': base64.b64decode(encoded_content),
            'content_type': content_type,
            'filename': filename,
        }

    def consultar_factura(self, bill_number: str) -> Dict[str, Any]:
        response = self._request('GET', f'/v2/bills/{bill_number}')
        return response.json()

    def descargar_pdf(self, bill_number: str) -> Dict[str, Any]:
        response = self._request(
            'GET',
            f'/v2/bills/{bill_number}/download-pdf',
            stream=True,
        )
        return self._decode_document_file(
            response,
            'pdf_base_64_encoded',
            f'{bill_number}.pdf',
            'application/pdf',
        )

    def descargar_xml(self, bill_number: str) -> Dict[str, Any]:
        response = self._request(
            'GET',
            f'/v2/bills/{bill_number}/download-xml',
            stream=True,
        )
        return self._decode_document_file(
            response,
            'xml_base_64_encoded',
            f'{bill_number}.xml',
            'application/xml',
        )

    def enviar_email(self, bill_number: str, email: str) -> Dict[str, Any]:
        response = self._request(
            'POST',
            f'/v2/bills/{bill_number}/send-email',
            json={'email': email},
        )
        return response.json()

    def crear_nota_credito(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        response = self._request(
            'POST',
            '/v2/credit-notes/validate',
            json=payload,
        )
        return response.json()

    def consultar_nota_credito(self, note_number: str) -> Dict[str, Any]:
        response = self._request('GET', f'/v2/credit-notes/{note_number}')
        return response.json()
