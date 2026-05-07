from decimal import Decimal

import factory
from django.utils import timezone

from cliente.models import Cliente
from empresa.models import Empresa, EmpresaUsuario
from IA.models import MensajeIA
from inventario.models import Categoria, Producto
from usuario.models import Usuario
from ventas.models import (
    Abono,
    FacturacionElectronicaConfig,
    FacturaElectronicaIntento,
    FactusCredential,
    FactusEnvironment,
    FactusNumberingRange,
    Venta,
    VentaFacturaElectronica,
)


class EmpresaFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = Empresa
        django_get_or_create = ('nit',)

    nit = factory.Sequence(lambda n: f'900{n:06d}')
    digito_verificacion = '1'
    razon_social = factory.Sequence(lambda n: f'Empresa Test {n}')
    nombre_comercial = factory.LazyAttribute(lambda obj: obj.razon_social)
    email = factory.Sequence(lambda n: f'empresa{n}@mallor.test')
    telefono = '3000000000'
    direccion = 'Calle 1 # 2-3'
    municipio_codigo = '11001'
    ambiente_facturacion = Empresa.AmbienteFacturacion.SANDBOX
    activo = True


class UsuarioFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = Usuario
        django_get_or_create = ('username',)
        skip_postgeneration_save = True

    username = factory.Sequence(lambda n: f'usuario{n}')
    email = factory.LazyAttribute(lambda obj: f'{obj.username}@mallor.test')
    first_name = 'Usuario'
    last_name = 'Prueba'
    role = Usuario.Rol.EMPLEADO
    is_active = True

    @factory.post_generation
    def password(self, create, extracted, **kwargs):
        raw_password = extracted or 'Secret123'
        self.set_password(raw_password)
        if create:
            self.save(update_fields=['password'])


class EmpresaUsuarioFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = EmpresaUsuario
        django_get_or_create = ('empresa', 'usuario')

    empresa = factory.SubFactory(EmpresaFactory)
    usuario = factory.SubFactory(UsuarioFactory)
    rol = EmpresaUsuario.Rol.EMPLEADO
    activo = True


class ClienteFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = Cliente

    empresa = factory.SubFactory(EmpresaFactory)
    tipo_documento = Cliente.TipoDocumento.CC
    numero_documento = factory.Sequence(lambda n: f'100000{n:04d}')
    nombre = factory.Sequence(lambda n: f'Cliente {n}')
    email = factory.Sequence(lambda n: f'cliente{n}@mallor.test')
    telefono = '3000000000'
    direccion = 'Calle Cliente 123'
    ciudad = 'Bogota'
    departamento = 'Cundinamarca'
    municipio_codigo = '11001'
    tipo_cliente = Cliente.TipoCliente.NATURAL
    regimen_tributario = Cliente.RegimenTributario.SIMPLIFICADO
    responsable_iva = False
    limite_credito = Decimal('0.00')
    credito_disponible = Decimal('0.00')
    dias_plazo = 0
    activo = True


class CategoriaFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = Categoria

    empresa = factory.SubFactory(EmpresaFactory)
    nombre = factory.Sequence(lambda n: f'Categoria {n}')
    descripcion = 'Categoria para pruebas'


class ProductoFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = Producto

    empresa = factory.SubFactory(EmpresaFactory)
    categoria = factory.SubFactory(CategoriaFactory, empresa=factory.SelfAttribute('..empresa'))
    codigo_barras = factory.Sequence(lambda n: f'770000000{n:04d}')
    nombre = factory.Sequence(lambda n: f'Producto {n}')
    marca = 'Mallor'
    existencias = Decimal('100.00')
    precio_compra = Decimal('1000.00')
    precio_venta = Decimal('1500.00')
    iva = Decimal('19.00')
    unidad_medida_codigo = '94'
    estandar_codigo = '999'


class VentaFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = Venta

    empresa = factory.SubFactory(EmpresaFactory)
    cliente = factory.SubFactory(ClienteFactory, empresa=factory.SelfAttribute('..empresa'))
    usuario_registro = factory.SubFactory(UsuarioFactory)
    subtotal = Decimal('1500.00')
    impuestos = Decimal('285.00')
    descuento = Decimal('0.00')
    total = Decimal('1785.00')
    total_abonado = Decimal('0.00')
    metodo_pago = Venta.MetodoPago.EFECTIVO
    estado = Venta.Estado.TERMINADA
    estado_pago = Venta.EstadoPago.PENDIENTE
    factura_electronica = False


class AbonoFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = Abono

    venta = factory.SubFactory(VentaFactory)
    monto_abonado = Decimal('100.00')
    metodo_pago = Abono.MetodoPago.EFECTIVO
    usuario_registro = factory.SubFactory(UsuarioFactory)


class FactusCredentialFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = FactusCredential
        django_get_or_create = ('empresa', 'environment')

    empresa = factory.SubFactory(EmpresaFactory)
    environment = FactusEnvironment.SANDBOX
    base_url = 'https://api-sandbox.factus.test'
    client_id = factory.Sequence(lambda n: f'client-{n}')
    client_secret = 'secret-test-value'
    username = factory.Sequence(lambda n: f'factus-user-{n}')
    password = 'password-test-value'
    timeout = 3
    max_retries = 1
    verify_ssl = True
    activo = True


class FacturacionElectronicaConfigFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = FacturacionElectronicaConfig
        django_get_or_create = ('empresa',)

    empresa = factory.SubFactory(EmpresaFactory)
    is_enabled = True
    environment = FactusEnvironment.SANDBOX
    auto_emitir_al_terminar = True
    auto_enviar_email = False
    company_snapshot = factory.LazyAttribute(
        lambda obj: {
            'nit': obj.empresa.nit,
            'razon_social': obj.empresa.razon_social,
        },
    )


class FactusNumberingRangeFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = FactusNumberingRange
        django_get_or_create = ('empresa', 'factus_id')

    empresa = factory.SubFactory(EmpresaFactory)
    factus_id = factory.Sequence(lambda n: n + 1)
    document_code = '01'
    prefix = factory.Sequence(lambda n: f'SETT{n}')
    from_number = 1
    to_number = 999999
    current_number = 1
    resolution_number = factory.Sequence(lambda n: f'187600{n:04d}')
    start_date = factory.LazyFunction(lambda: timezone.now().date())
    end_date = factory.LazyFunction(lambda: timezone.now().date().replace(year=timezone.now().year + 1))
    is_active = True
    is_credit_note_range = False
    raw_payload = factory.LazyFunction(dict)


class VentaFacturaElectronicaFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = VentaFacturaElectronica

    venta = factory.SubFactory(VentaFactory, factura_electronica=True)
    empresa = factory.SelfAttribute('venta.empresa')
    status = VentaFacturaElectronica.Status.EMITIDA
    reference_code = factory.Sequence(lambda n: f'VE-{n:08d}')
    bill_number = factory.Sequence(lambda n: f'SETT{n:08d}')
    cufe = factory.Sequence(lambda n: f'cufe-test-{n}')
    request_payload = factory.LazyFunction(dict)
    response_payload = factory.LazyFunction(dict)


class FacturaElectronicaIntentoFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = FacturaElectronicaIntento

    factura = factory.SubFactory(VentaFacturaElectronicaFactory)
    empresa = factory.SelfAttribute('factura.empresa')
    action = FacturaElectronicaIntento.Action.EMITIR
    is_success = True
    response_status_code = 200
    request_payload = factory.LazyFunction(dict)
    response_payload = factory.LazyFunction(dict)


class MensajeIAFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = MensajeIA

    empresa = factory.SubFactory(EmpresaFactory)
    usuario = factory.SubFactory(UsuarioFactory)
    rol_empresa = EmpresaUsuario.Rol.ADMIN
    consulta = 'Resumen de ventas de hoy'
    respuesta = 'No hay ventas registradas.'
    herramienta_usada = 'resumen_ventas'
    parametros_herramienta = factory.LazyFunction(dict)
    metadatos_resultado = factory.LazyFunction(dict)
    tiempo_respuesta = 0.1
    tokens_entrada = 0
    tokens_salida = 0
