import pytest

from tests.factories import FactusCredentialFactory


@pytest.mark.django_db
@pytest.mark.factus
@pytest.mark.multitenant
def test_factus_credential_guarda_secretos_cifrados_y_expone_mask(
    empresa_a,
):
    credential = FactusCredentialFactory(
        empresa=empresa_a,
        client_id='client-public-1234',
        client_secret='secret-value',
        password='password-value',
    )

    assert credential.client_secret != 'secret-value'
    assert credential.password != 'password-value'
    assert credential.get_client_secret() == 'secret-value'
    assert credential.get_password() == 'password-value'
    assert credential.client_id_masked == '***1234'
