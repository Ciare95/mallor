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

    def __init__(self):
        self.config = settings.FACTUS_CONFIG
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
        cache.set(self.TOKEN_CACHE_KEY, access_token, cache_timeout)
        if refresh_token:
            cache.set(self.REFRESH_CACHE_KEY, refresh_token, 60 * 60 * 24)
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
        refresh_token = cache.get(self.REFRESH_CACHE_KEY)
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
        token = cache.get(self.TOKEN_CACHE_KEY)
        if token:
            return token
        return self._obtain_access_token()

    def validar_conexion(self) -> Dict[str, Any]:
        return self.ver_empresa()

    def ver_empresa(self) -> Dict[str, Any]:
        response = self._request('GET', '/v2/companies')
        return response.json()

    def listar_rangos(self) -> Dict[str, Any]:
        response = self._request('GET', '/v2/numbering-ranges/dian')
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

    def consultar_factura(self, bill_number: str) -> Dict[str, Any]:
        response = self._request('GET', f'/v2/bills/{bill_number}')
        return response.json()

    def descargar_pdf(self, bill_number: str) -> Dict[str, Any]:
        response = self._request(
            'GET',
            f'/v2/bills/{bill_number}/download-pdf',
            stream=True,
        )
        return {
            'content': response.content,
            'content_type': response.headers.get('Content-Type', 'application/pdf'),
            'filename': f'{bill_number}.pdf',
        }

    def descargar_xml(self, bill_number: str) -> Dict[str, Any]:
        response = self._request(
            'GET',
            f'/v2/bills/{bill_number}/download-xml',
            stream=True,
        )
        return {
            'content': response.content,
            'content_type': response.headers.get('Content-Type', 'application/xml'),
            'filename': f'{bill_number}.xml',
        }

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

