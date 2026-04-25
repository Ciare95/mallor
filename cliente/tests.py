from datetime import timedelta
from decimal import Decimal

from django.core.exceptions import ValidationError
from django.test import TestCase
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient

from cliente.models import Cliente
from cliente.serializers import (
    ClienteCreateSerializer,
    ClienteDetailSerializer,
    ClienteListSerializer,
    ClienteUpdateSerializer,
)
from cliente.services import ClienteService
from core.exceptions import (
    ClienteConVentasError,
    ClienteCreditoInsuficienteError,
    ClienteDuplicadoError,
    ClienteNoEncontradoError,
)
from usuario.models import Usuario
from ventas.models import Venta


class ClienteModelTest(TestCase):
    def setUp(self):
        self.usuario = Usuario.objects.create_user(
            username='cliente_tester',
            email='cliente_tester@example.com',
            password='Admin1234',
        )

    def crear_cliente(self, **overrides):
        data = {
            'tipo_documento': Cliente.TipoDocumento.CC,
            'numero_documento': '123456789',
            'nombre': 'Cliente Base',
            'telefono': '3001234567',
            'direccion': 'Calle 1 # 2-3',
            'ciudad': 'Bogota',
            'departamento': 'Cundinamarca',
            'tipo_cliente': Cliente.TipoCliente.NATURAL,
            'limite_credito': Decimal('0.00'),
        }
        data.update(overrides)
        return Cliente.objects.create(**data)

    def crear_venta(
        self,
        cliente,
        numero_venta,
        total,
        total_abonado=Decimal('0.00'),
        estado=Venta.Estado.TERMINADA,
    ):
        return Venta.objects.create(
            numero_venta=numero_venta,
            cliente=cliente,
            subtotal=total,
            impuestos=Decimal('0.00'),
            total=total,
            descuento=Decimal('0.00'),
            total_abonado=total_abonado,
            estado=estado,
            usuario_registro=self.usuario,
        )

    def test_get_consumidor_final_crea_registro_por_defecto(self):
        cliente = Cliente.get_consumidor_final()

        self.assertEqual(cliente.nombre, 'Consumidor Final')
        self.assertEqual(
            cliente.numero_documento,
            Cliente.CONSUMIDOR_FINAL_DOCUMENTO,
        )
        self.assertEqual(
            cliente.tipo_documento,
            Cliente.TipoDocumento.CC,
        )

    def test_documento_es_unico_por_tipo(self):
        self.crear_cliente(numero_documento='900123456')

        with self.assertRaises(ValidationError) as exc:
            self.crear_cliente(
                numero_documento='900123456',
                nombre='Cliente Duplicado',
            )

        self.assertIn('numero_documento', exc.exception.message_dict)

    def test_permita_mismo_numero_con_tipo_documento_distinto(self):
        self.crear_cliente(numero_documento='445566', tipo_documento='CC')

        cliente = self.crear_cliente(
            numero_documento='445566',
            tipo_documento=Cliente.TipoDocumento.CE,
            nombre='Cliente Extranjero',
        )

        self.assertEqual(cliente.tipo_documento, Cliente.TipoDocumento.CE)

    def test_get_nombre_completo_retorna_razon_social_para_juridico(self):
        cliente = self.crear_cliente(
            tipo_documento=Cliente.TipoDocumento.NIT,
            numero_documento='901234567',
            tipo_cliente=Cliente.TipoCliente.JURIDICO,
            nombre='',
            razon_social='Drogueria Central SAS',
        )

        self.assertEqual(
            cliente.get_nombre_completo(),
            'Drogueria Central SAS',
        )

    def test_calcula_saldo_pendiente_y_total_compras(self):
        cliente = self.crear_cliente(
            numero_documento='700100200',
            limite_credito=Decimal('200.00'),
        )

        self.crear_venta(
            cliente=cliente,
            numero_venta='V-00000001',
            total=Decimal('100.00'),
        )
        self.crear_venta(
            cliente=cliente,
            numero_venta='V-00000002',
            total=Decimal('80.00'),
            total_abonado=Decimal('50.00'),
        )
        self.crear_venta(
            cliente=cliente,
            numero_venta='V-00000003',
            total=Decimal('60.00'),
            estado=Venta.Estado.CANCELADA,
        )

        self.assertEqual(
            cliente.calcular_saldo_pendiente(),
            Decimal('130.00'),
        )
        self.assertEqual(
            cliente.calcular_total_compras(),
            Decimal('180.00'),
        )

    def test_tiene_credito_disponible_se_basa_en_cartera_actual(self):
        cliente = self.crear_cliente(
            numero_documento='300400500',
            limite_credito=Decimal('150.00'),
        )
        self.crear_venta(
            cliente=cliente,
            numero_venta='V-00000004',
            total=Decimal('90.00'),
        )
        self.crear_venta(
            cliente=cliente,
            numero_venta='V-00000005',
            total=Decimal('50.00'),
            total_abonado=Decimal('20.00'),
        )

        self.assertTrue(cliente.tiene_credito_disponible(Decimal('30.00')))
        self.assertFalse(cliente.tiene_credito_disponible(Decimal('31.00')))

    def test_no_permite_limite_credito_negativo(self):
        with self.assertRaises(ValidationError) as exc:
            self.crear_cliente(
                numero_documento='800900100',
                limite_credito=Decimal('-1.00'),
            )

        self.assertIn('limite_credito', exc.exception.message_dict)

    def test_no_permite_dias_plazo_negativos(self):
        with self.assertRaises(ValidationError) as exc:
            self.crear_cliente(
                numero_documento='800900101',
                dias_plazo=-5,
            )

        self.assertIn('dias_plazo', exc.exception.message_dict)


class ClienteSerializerTest(TestCase):
    def setUp(self):
        self.usuario = Usuario.objects.create_user(
            username='cliente_serializer',
            email='cliente_serializer@example.com',
            password='Admin1234',
        )
        self.cliente = Cliente.objects.create(
            tipo_documento=Cliente.TipoDocumento.CC,
            numero_documento='100200300',
            nombre='Cliente Serializado',
            telefono='3007654321',
            direccion='Carrera 10 # 20-30',
            ciudad='Bogota',
            departamento='Cundinamarca',
            tipo_cliente=Cliente.TipoCliente.NATURAL,
            limite_credito=Decimal('300.00'),
        )
        Venta.objects.create(
            numero_venta='V-00000100',
            cliente=self.cliente,
            subtotal=Decimal('120.00'),
            impuestos=Decimal('0.00'),
            total=Decimal('120.00'),
            descuento=Decimal('0.00'),
            total_abonado=Decimal('20.00'),
            estado=Venta.Estado.TERMINADA,
            usuario_registro=self.usuario,
        )

    def test_cliente_detail_serializer_expone_campos_calculados(self):
        serializer = ClienteDetailSerializer(instance=self.cliente)

        self.assertEqual(
            serializer.data['nombre_completo'],
            'Cliente Serializado',
        )
        self.assertEqual(serializer.data['saldo_pendiente'], '100.00')
        self.assertEqual(serializer.data['total_compras'], '120.00')
        self.assertEqual(serializer.data['cantidad_compras'], 1)
        self.assertIsNotNone(serializer.data['ultima_compra'])

    def test_cliente_list_serializer_incluye_resumen(self):
        serializer = ClienteListSerializer(instance=self.cliente)

        self.assertEqual(
            serializer.data['numero_documento'],
            self.cliente.numero_documento,
        )
        self.assertEqual(serializer.data['saldo_pendiente'], '100.00')

    def test_create_serializer_valida_documento_unico_por_tipo(self):
        serializer = ClienteCreateSerializer(data={
            'tipo_documento': Cliente.TipoDocumento.CC,
            'numero_documento': '100200300',
            'nombre': 'Cliente Duplicado',
            'telefono': '3000000000',
            'direccion': 'Calle 5 # 1-2',
            'ciudad': 'Bogota',
            'departamento': 'Cundinamarca',
            'tipo_cliente': Cliente.TipoCliente.NATURAL,
        })

        self.assertFalse(serializer.is_valid())
        self.assertIn('numero_documento', serializer.errors)

    def test_create_serializer_valida_email(self):
        serializer = ClienteCreateSerializer(data={
            'tipo_documento': Cliente.TipoDocumento.CC,
            'numero_documento': '700800900',
            'nombre': 'Cliente Email',
            'email': 'correo-invalido',
            'telefono': '3000000001',
            'direccion': 'Calle 6 # 3-4',
            'ciudad': 'Bogota',
            'departamento': 'Cundinamarca',
            'tipo_cliente': Cliente.TipoCliente.NATURAL,
        })

        self.assertFalse(serializer.is_valid())
        self.assertIn('email', serializer.errors)

    def test_create_serializer_requiere_telefono(self):
        serializer = ClienteCreateSerializer(data={
            'tipo_documento': Cliente.TipoDocumento.CC,
            'numero_documento': '900800700',
            'nombre': 'Cliente Sin Telefono',
            'telefono': '   ',
            'direccion': 'Calle 7 # 8-9',
            'ciudad': 'Bogota',
            'departamento': 'Cundinamarca',
            'tipo_cliente': Cliente.TipoCliente.NATURAL,
        })

        self.assertFalse(serializer.is_valid())
        self.assertIn('telefono', serializer.errors)

    def test_update_serializer_valida_limite_credito_contra_saldo(self):
        serializer = ClienteUpdateSerializer(
            instance=self.cliente,
            data={
                'limite_credito': '90.00',
            },
            partial=True,
        )

        self.assertFalse(serializer.is_valid())
        self.assertIn('limite_credito', serializer.errors)


class ClienteServiceTest(TestCase):
    def setUp(self):
        self.usuario = Usuario.objects.create_user(
            username='cliente_service',
            email='cliente_service@example.com',
            password='Admin1234',
        )
        self.cliente = Cliente.objects.create(
            tipo_documento=Cliente.TipoDocumento.CC,
            numero_documento='555666777',
            nombre='Cliente Servicio',
            telefono='3010000000',
            direccion='Avenida 1 # 1-1',
            ciudad='Bogota',
            departamento='Cundinamarca',
            tipo_cliente=Cliente.TipoCliente.NATURAL,
            limite_credito=Decimal('500.00'),
            dias_plazo=15,
        )
        self.venta_1 = Venta.objects.create(
            numero_venta='V-00000200',
            cliente=self.cliente,
            subtotal=Decimal('200.00'),
            impuestos=Decimal('0.00'),
            total=Decimal('200.00'),
            descuento=Decimal('0.00'),
            total_abonado=Decimal('20.00'),
            estado=Venta.Estado.TERMINADA,
            usuario_registro=self.usuario,
        )
        self.venta_2 = Venta.objects.create(
            numero_venta='V-00000201',
            cliente=self.cliente,
            subtotal=Decimal('100.00'),
            impuestos=Decimal('0.00'),
            total=Decimal('100.00'),
            descuento=Decimal('0.00'),
            total_abonado=Decimal('100.00'),
            estado=Venta.Estado.TERMINADA,
            usuario_registro=self.usuario,
        )
        Venta.objects.filter(pk=self.venta_1.pk).update(
            fecha_venta=self.venta_1.fecha_venta - timedelta(days=20),
        )
        self.venta_1.refresh_from_db()

    def test_crear_cliente_valida_documento_unico(self):
        with self.assertRaises(ClienteDuplicadoError):
            ClienteService.crear_cliente({
                'tipo_documento': Cliente.TipoDocumento.CC,
                'numero_documento': self.cliente.numero_documento,
                'nombre': 'Cliente Repetido',
                'telefono': '3009999999',
                'direccion': 'Calle 1',
                'ciudad': 'Bogota',
                'departamento': 'Cundinamarca',
                'tipo_cliente': Cliente.TipoCliente.NATURAL,
            })

    def test_obtener_cliente_asigna_estadisticas(self):
        cliente = ClienteService.obtener_cliente(self.cliente.id)

        self.assertEqual(cliente.id, self.cliente.id)
        self.assertEqual(
            cliente.estadisticas['saldo_pendiente'],
            Decimal('180.00'),
        )
        self.assertEqual(cliente.estadisticas['cantidad_compras'], 2)

    def test_listar_clientes_aplica_filtro(self):
        otro = Cliente.objects.create(
            tipo_documento=Cliente.TipoDocumento.NIT,
            numero_documento='900111222',
            razon_social='Otro Cliente SAS',
            telefono='3020000000',
            direccion='Calle 10',
            ciudad='Medellin',
            departamento='Antioquia',
            tipo_cliente=Cliente.TipoCliente.JURIDICO,
        )

        resultados = ClienteService.listar_clientes({
            'q': 'Servicio',
        })

        self.assertEqual([cliente.id for cliente in resultados], [self.cliente.id])
        self.assertNotIn(otro.id, [cliente.id for cliente in resultados])

    def test_actualizar_cliente_modifica_datos(self):
        actualizado = ClienteService.actualizar_cliente(
            self.cliente.id,
            {
                'telefono': '3011111111',
                'ciudad': 'Soacha',
            },
        )

        self.assertEqual(actualizado.telefono, '3011111111')
        self.assertEqual(actualizado.ciudad, 'Soacha')

    def test_eliminar_cliente_con_ventas_lanza_error(self):
        with self.assertRaises(ClienteConVentasError):
            ClienteService.eliminar_cliente(self.cliente.id)

    def test_eliminar_cliente_sin_ventas_hace_soft_delete(self):
        cliente = Cliente.objects.create(
            tipo_documento=Cliente.TipoDocumento.CE,
            numero_documento='123123123',
            nombre='Sin Ventas',
            telefono='3030000000',
            direccion='Calle 3',
            ciudad='Bogota',
            departamento='Cundinamarca',
            tipo_cliente=Cliente.TipoCliente.NATURAL,
        )

        eliminado = ClienteService.eliminar_cliente(cliente.id)

        self.assertFalse(eliminado.activo)
        cliente.refresh_from_db()
        self.assertFalse(cliente.activo)

    def test_activar_desactivar_cliente_cambia_estado(self):
        ClienteService.activar_desactivar_cliente(self.cliente.id, False)
        self.cliente.refresh_from_db()
        self.assertFalse(self.cliente.activo)

        ClienteService.activar_desactivar_cliente(self.cliente.id, True)
        self.cliente.refresh_from_db()
        self.assertTrue(self.cliente.activo)

    def test_obtener_historial_compras_filtra_canceladas_y_ordena(self):
        Venta.objects.create(
            numero_venta='V-00000202',
            cliente=self.cliente,
            subtotal=Decimal('50.00'),
            impuestos=Decimal('0.00'),
            total=Decimal('50.00'),
            descuento=Decimal('0.00'),
            total_abonado=Decimal('0.00'),
            estado=Venta.Estado.CANCELADA,
            usuario_registro=self.usuario,
        )

        historial = ClienteService.obtener_historial_compras(self.cliente.id)

        self.assertEqual(len(historial), 2)
        self.assertEqual(historial[0].id, self.venta_2.id)

    def test_obtener_cartera_cliente_retorna_solo_ventas_con_saldo(self):
        cartera = ClienteService.obtener_cartera_cliente(self.cliente.id)

        self.assertEqual(len(cartera), 1)
        self.assertEqual(cartera[0].id, self.venta_1.id)

    def test_calcular_estadisticas_cliente_retorna_resumen(self):
        estadisticas = ClienteService.calcular_estadisticas_cliente(
            self.cliente.id,
        )

        self.assertEqual(estadisticas['cantidad_compras'], 2)
        self.assertEqual(estadisticas['saldo_pendiente'], Decimal('180.00'))
        self.assertEqual(estadisticas['ventas_con_saldo'], 1)
        self.assertEqual(estadisticas['ventas_vencidas'], 1)

    def test_validar_credito_disponible(self):
        self.assertTrue(
            ClienteService.validar_credito_disponible(
                self.cliente.id,
                Decimal('320.00'),
            )
        )

        with self.assertRaises(ClienteCreditoInsuficienteError):
            ClienteService.validar_credito_disponible(
                self.cliente.id,
                Decimal('321.00'),
            )

    def test_validar_documento_unico(self):
        self.assertTrue(
            ClienteService.validar_documento_unico(
                Cliente.TipoDocumento.CE,
                self.cliente.numero_documento,
            )
        )

        with self.assertRaises(ClienteDuplicadoError):
            ClienteService.validar_documento_unico(
                Cliente.TipoDocumento.CC,
                self.cliente.numero_documento,
            )

    def test_obtener_mejores_clientes_ordenados_por_total(self):
        otro = Cliente.objects.create(
            tipo_documento=Cliente.TipoDocumento.CC,
            numero_documento='111222333',
            nombre='Cliente Menor',
            telefono='3040000000',
            direccion='Calle 4',
            ciudad='Bogota',
            departamento='Cundinamarca',
            tipo_cliente=Cliente.TipoCliente.NATURAL,
        )
        Venta.objects.create(
            numero_venta='V-00000203',
            cliente=otro,
            subtotal=Decimal('50.00'),
            impuestos=Decimal('0.00'),
            total=Decimal('50.00'),
            descuento=Decimal('0.00'),
            total_abonado=Decimal('0.00'),
            estado=Venta.Estado.TERMINADA,
            usuario_registro=self.usuario,
        )

        clientes = ClienteService.obtener_mejores_clientes(limite=2)

        self.assertEqual(clientes[0].id, self.cliente.id)
        self.assertEqual(clientes[1].id, otro.id)

    def test_obtener_clientes_morosos(self):
        morosos = ClienteService.obtener_clientes_morosos()

        self.assertEqual(len(morosos), 1)
        self.assertEqual(morosos[0]['cliente'].id, self.cliente.id)
        self.assertEqual(morosos[0]['total_vencido'], Decimal('180.00'))

    def test_obtener_clientes_nuevos(self):
        recientes = ClienteService.obtener_clientes_nuevos(dias=1)

        self.assertIn(self.cliente.id, [cliente.id for cliente in recientes])

    def test_obtener_cliente_inexistente_lanza_error(self):
        with self.assertRaises(ClienteNoEncontradoError):
            ClienteService.obtener_cliente(999999)


class ClienteApiTest(TestCase):
    def setUp(self):
        self.client_api = APIClient()
        self.admin = Usuario.objects.create_user(
            username='cliente_admin',
            email='cliente_admin@example.com',
            password='Admin1234',
            role=Usuario.Rol.ADMIN,
        )
        self.empleado = Usuario.objects.create_user(
            username='cliente_empleado',
            email='cliente_empleado@example.com',
            password='Admin1234',
            role=Usuario.Rol.EMPLEADO,
        )
        self.cliente = Cliente.objects.create(
            tipo_documento=Cliente.TipoDocumento.CC,
            numero_documento='80808080',
            nombre='Cliente API',
            telefono='3004444444',
            direccion='Calle API 1',
            ciudad='Bogota',
            departamento='Cundinamarca',
            tipo_cliente=Cliente.TipoCliente.NATURAL,
            limite_credito=Decimal('200.00'),
            dias_plazo=10,
        )
        self.cliente_sin_ventas = Cliente.objects.create(
            tipo_documento=Cliente.TipoDocumento.CE,
            numero_documento='90909090',
            nombre='Cliente Eliminable',
            telefono='3005555555',
            direccion='Calle API 2',
            ciudad='Cali',
            departamento='Valle',
            tipo_cliente=Cliente.TipoCliente.NATURAL,
        )
        self.venta = Venta.objects.create(
            numero_venta='V-00000300',
            cliente=self.cliente,
            subtotal=Decimal('150.00'),
            impuestos=Decimal('0.00'),
            total=Decimal('150.00'),
            descuento=Decimal('0.00'),
            total_abonado=Decimal('50.00'),
            estado=Venta.Estado.TERMINADA,
            usuario_registro=self.admin,
        )
        Venta.objects.filter(pk=self.venta.pk).update(
            fecha_venta=self.venta.fecha_venta - timedelta(days=15),
        )
        self.venta.refresh_from_db()

    def autenticar(self, usuario):
        self.client_api.force_authenticate(user=usuario)

    def test_listar_clientes_con_filtros_y_paginacion(self):
        self.autenticar(self.empleado)

        response = self.client_api.get(
            reverse('cliente-list'),
            {
                'q': 'Cliente API',
                'ciudad': 'Bogota',
                'activo': 'true',
                'page_size': 5,
            },
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['count'], 1)
        self.assertEqual(response.data['current_page'], 1)
        self.assertEqual(response.data['results'][0]['id'], self.cliente.id)

    def test_crear_cliente(self):
        self.autenticar(self.empleado)

        response = self.client_api.post(
            reverse('cliente-list'),
            {
                'tipo_documento': Cliente.TipoDocumento.NIT,
                'numero_documento': '900777888',
                'razon_social': 'Nuevo Cliente SAS',
                'telefono': '3017777777',
                'direccion': 'Carrera Nueva 1',
                'ciudad': 'Medellin',
                'departamento': 'Antioquia',
                'tipo_cliente': Cliente.TipoCliente.JURIDICO,
            },
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['numero_documento'], '900777888')

    def test_detalle_historial_cartera_y_estadisticas(self):
        self.autenticar(self.empleado)

        detalle = self.client_api.get(
            reverse('cliente-detail', args=[self.cliente.id]),
        )
        historial = self.client_api.get(
            reverse('cliente-historial', args=[self.cliente.id]),
        )
        cartera = self.client_api.get(
            reverse('cliente-cartera', args=[self.cliente.id]),
        )
        estadisticas = self.client_api.get(
            reverse('cliente-estadisticas', args=[self.cliente.id]),
        )

        self.assertEqual(detalle.status_code, status.HTTP_200_OK)
        self.assertEqual(historial.status_code, status.HTTP_200_OK)
        self.assertEqual(cartera.status_code, status.HTTP_200_OK)
        self.assertEqual(estadisticas.status_code, status.HTTP_200_OK)
        self.assertEqual(historial.data['count'], 1)
        self.assertEqual(cartera.data['count'], 1)
        self.assertEqual(estadisticas.data['saldo_pendiente'], '100.00')

    def test_busqueda_funciona(self):
        self.autenticar(self.empleado)

        response = self.client_api.get(
            reverse('cliente-buscar'),
            {'q': '80808080'},
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['count'], 1)

    def test_actualizar_cliente(self):
        self.autenticar(self.empleado)

        response = self.client_api.patch(
            reverse('cliente-detail', args=[self.cliente.id]),
            {'ciudad': 'Soacha'},
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['ciudad'], 'Soacha')

    def test_eliminar_cliente_soft_delete(self):
        self.autenticar(self.admin)

        response = self.client_api.delete(
            reverse('cliente-detail', args=[self.cliente_sin_ventas.id]),
        )

        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.cliente_sin_ventas.refresh_from_db()
        self.assertFalse(self.cliente_sin_ventas.activo)

    def test_mejores_y_morosos_requieren_permiso_de_admin(self):
        self.autenticar(self.empleado)

        mejores = self.client_api.get(reverse('cliente-mejores'))
        morosos = self.client_api.get(reverse('cliente-morosos'))

        self.assertEqual(mejores.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(morosos.status_code, status.HTTP_403_FORBIDDEN)

        self.autenticar(self.admin)
        mejores_admin = self.client_api.get(reverse('cliente-mejores'))
        morosos_admin = self.client_api.get(reverse('cliente-morosos'))

        self.assertEqual(mejores_admin.status_code, status.HTTP_200_OK)
        self.assertEqual(morosos_admin.status_code, status.HTTP_200_OK)
        self.assertEqual(mejores_admin.data['count'], 1)
        self.assertEqual(morosos_admin.data['count'], 1)
