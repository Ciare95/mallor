from contextlib import contextmanager

from rest_framework.test import APIClient

from empresa.context import reset_empresa_actual, set_empresa_actual


@contextmanager
def empresa_context(empresa):
    token = set_empresa_actual(empresa)
    try:
        yield empresa
    finally:
        reset_empresa_actual(token)


def auth_basic_header(username, password='Secret123'):
    import base64

    credentials = f'{username}:{password}'.encode('utf-8')
    token = base64.b64encode(credentials).decode('ascii')
    return f'Basic {token}'


def api_client_for_empresa(user, empresa, password='Secret123'):
    client = APIClient()
    client.credentials(
        HTTP_AUTHORIZATION=auth_basic_header(user.username, password),
        HTTP_X_EMPRESA_ID=str(empresa.id),
    )
    return client
