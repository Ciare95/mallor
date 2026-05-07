from datetime import date, datetime, time, timedelta, timezone as dt_timezone
from decimal import Decimal, InvalidOperation
from typing import Any
from zoneinfo import ZoneInfo

from django.core.exceptions import ValidationError
from django.db import models
from django.db.models import DecimalField, Q, Sum
from django.db.models.functions import Coalesce
from django.utils import timezone
from django.utils.translation import gettext_lazy as _

from ventas.models import Abono, DetalleVenta, Venta


ZERO = Decimal('0.00')
QUANTIZER = Decimal('0.01')
BUSINESS_TIMEZONE = ZoneInfo('America/Bogota')


def _local_day_start_utc(target_date: date) -> datetime:
    local_start = datetime.combine(
        target_date,
        time.min,
        tzinfo=BUSINESS_TIMEZONE,
    )
    return local_start.astimezone(dt_timezone.utc)


def _next_local_day_start_utc(target_date: date) -> datetime:
    return _local_day_start_utc(target_date + timedelta(days=1))


class CierreCaja(models.Model):
    """
    Modelo que registra el cierre diario de caja.

    Consolida ventas, abonos en efectivo, gastos operativos y la
    diferencia entre el efectivo esperado y el efectivo contado al
    final del dia.
    """

    id = models.AutoField(primary_key=True)
    empresa = models.ForeignKey(
        'empresa.Empresa',
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name='cierres_caja',
        verbose_name=_('empresa'),
    )
    fecha_cierre = models.DateField(
        _('fecha de cierre'),
        help_text=_('Fecha correspondiente al cierre diario de caja.'),
    )
    fecha_registro = models.DateTimeField(
        _('fecha de registro'),
        auto_now_add=True,
        help_text=_('Fecha y hora en que se registro el cierre.'),
    )
    total_ventas = models.DecimalField(
        _('total de ventas'),
        max_digits=12,
        decimal_places=2,
        default=ZERO,
        help_text=_('Valor total de las ventas terminadas del dia.'),
    )
    total_efectivo = models.DecimalField(
        _('total en efectivo'),
        max_digits=12,
        decimal_places=2,
        default=ZERO,
        help_text=_('Total vendido en efectivo durante el dia.'),
    )
    total_tarjeta = models.DecimalField(
        _('total en tarjeta'),
        max_digits=12,
        decimal_places=2,
        default=ZERO,
        help_text=_('Total vendido por pagos con tarjeta.'),
    )
    total_transferencia = models.DecimalField(
        _('total en transferencia'),
        max_digits=12,
        decimal_places=2,
        default=ZERO,
        help_text=_('Total vendido por transferencias bancarias.'),
    )
    total_credito = models.DecimalField(
        _('total a credito'),
        max_digits=12,
        decimal_places=2,
        default=ZERO,
        help_text=_('Total vendido a credito durante el dia.'),
    )
    total_abonos = models.DecimalField(
        _('total de abonos'),
        max_digits=12,
        decimal_places=2,
        default=ZERO,
        help_text=_('Total de abonos en efectivo recibidos en el dia.'),
    )
    total_gastos = models.DecimalField(
        _('total de gastos'),
        max_digits=12,
        decimal_places=2,
        default=ZERO,
        help_text=_('Valor total de los gastos operativos registrados.'),
    )
    gastos_operativos = models.JSONField(
        _('gastos operativos'),
        default=dict,
        blank=True,
        help_text=_(
            'Desglose JSON de gastos operativos del dia por concepto.'
        ),
    )
    ventas_por_categoria = models.JSONField(
        _('ventas por categoria'),
        default=dict,
        blank=True,
        help_text=_(
            'Resumen JSON de ventas del dia agrupadas por categoria.'
        ),
    )
    efectivo_esperado = models.DecimalField(
        _('efectivo esperado'),
        max_digits=12,
        decimal_places=2,
        default=ZERO,
        help_text=_(
            'Efectivo esperado segun ventas en efectivo y abonos del dia.'
        ),
    )
    efectivo_real = models.DecimalField(
        _('efectivo real'),
        max_digits=12,
        decimal_places=2,
        default=ZERO,
        help_text=_('Efectivo contado fisicamente al cerrar la caja.'),
    )
    diferencia = models.DecimalField(
        _('diferencia'),
        max_digits=12,
        decimal_places=2,
        default=ZERO,
        help_text=_(
            'Diferencia entre el efectivo real y el efectivo esperado.'
        ),
    )
    observaciones = models.TextField(
        _('observaciones'),
        blank=True,
        help_text=_('Observaciones adicionales sobre el cierre.'),
    )
    usuario_cierre = models.ForeignKey(
        'usuario.Usuario',
        on_delete=models.PROTECT,
        related_name='cierres_caja',
        verbose_name=_('usuario de cierre'),
        help_text=_('Usuario responsable de registrar el cierre.'),
    )

    class Meta:
        db_table = 'cierres_caja'
        ordering = ['-fecha_cierre', '-fecha_registro']
        verbose_name = _('cierre de caja')
        verbose_name_plural = _('cierres de caja')
        indexes = [
            models.Index(fields=['empresa']),
            models.Index(fields=['fecha_cierre']),
            models.Index(fields=['fecha_registro']),
            models.Index(fields=['usuario_cierre']),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=['empresa', 'fecha_cierre'],
                name='cierre_caja_empresa_fecha_unique',
            ),
        ]

    def __str__(self):
        return f"Cierre de caja {self.fecha_cierre:%Y-%m-%d}"

    def _ventas_queryset(self):
        return Venta.objects.filter(
            empresa=self.empresa,
            estado=Venta.Estado.TERMINADA,
            fecha_venta__gte=_local_day_start_utc(self.fecha_cierre),
            fecha_venta__lt=_next_local_day_start_utc(self.fecha_cierre),
        )

    def _abonos_queryset(self):
        return Abono.objects.filter(
            venta__empresa=self.empresa,
            venta__estado=Venta.Estado.TERMINADA,
            fecha_abono__gte=_local_day_start_utc(self.fecha_cierre),
            fecha_abono__lt=_next_local_day_start_utc(self.fecha_cierre),
            metodo_pago=Abono.MetodoPago.EFECTIVO,
        )

    def _quantize(self, value: Decimal) -> Decimal:
        return (value or ZERO).quantize(QUANTIZER)

    def _coerce_decimal(self, value: Any) -> Decimal:
        if value in (None, '', [], {}):
            return ZERO

        if isinstance(value, Decimal):
            return value

        try:
            return Decimal(str(value))
        except (InvalidOperation, TypeError, ValueError):
            return ZERO

    def _extraer_total_gasto(self, data: Any) -> Decimal:
        if isinstance(data, dict):
            for key in ('valor', 'monto', 'total'):
                if key in data:
                    return self._coerce_decimal(data.get(key))

            return sum(
                (
                    self._extraer_total_gasto(valor)
                    for valor in data.values()
                ),
                start=ZERO,
            )

        if isinstance(data, list):
            return sum(
                (self._extraer_total_gasto(item) for item in data),
                start=ZERO,
            )

        return self._coerce_decimal(data)

    def _calcular_total_gastos_operativos(self) -> Decimal:
        return self._quantize(
            self._extraer_total_gasto(self.gastos_operativos),
        )

    def _calcular_ventas_por_categoria(self) -> dict[str, float]:
        ventas_por_categoria = {}
        categorias = DetalleVenta.objects.filter(
            venta__empresa=self.empresa,
            venta__estado=Venta.Estado.TERMINADA,
            venta__fecha_venta__gte=_local_day_start_utc(self.fecha_cierre),
            venta__fecha_venta__lt=_next_local_day_start_utc(
                self.fecha_cierre,
            ),
        ).values(
            'producto__categoria__nombre',
        ).annotate(
            total_categoria=Coalesce(
                Sum('total'),
                ZERO,
                output_field=DecimalField(
                    max_digits=12,
                    decimal_places=2,
                ),
            ),
        ).order_by('producto__categoria__nombre')

        for categoria in categorias:
            nombre_categoria = (
                categoria['producto__categoria__nombre'] or 'Sin categoria'
            )
            total_categoria = self._quantize(
                categoria['total_categoria'],
            )
            ventas_por_categoria[nombre_categoria] = float(total_categoria)

        return ventas_por_categoria

    def calcular_totales(self):
        """
        Calcula ventas, abonos, gastos y clasificacion por categoria.
        """
        agregados_ventas = self._ventas_queryset().aggregate(
            total_ventas=Coalesce(
                Sum('total'),
                ZERO,
                output_field=DecimalField(
                    max_digits=12,
                    decimal_places=2,
                ),
            ),
            total_efectivo=Coalesce(
                Sum(
                    'total',
                    filter=Q(metodo_pago=Venta.MetodoPago.EFECTIVO),
                ),
                ZERO,
                output_field=DecimalField(
                    max_digits=12,
                    decimal_places=2,
                ),
            ),
            total_tarjeta=Coalesce(
                Sum(
                    'total',
                    filter=Q(metodo_pago=Venta.MetodoPago.TARJETA),
                ),
                ZERO,
                output_field=DecimalField(
                    max_digits=12,
                    decimal_places=2,
                ),
            ),
            total_transferencia=Coalesce(
                Sum(
                    'total',
                    filter=Q(
                        metodo_pago=Venta.MetodoPago.TRANSFERENCIA,
                    ),
                ),
                ZERO,
                output_field=DecimalField(
                    max_digits=12,
                    decimal_places=2,
                ),
            ),
            total_credito=Coalesce(
                Sum(
                    'total',
                    filter=Q(metodo_pago=Venta.MetodoPago.CREDITO),
                ),
                ZERO,
                output_field=DecimalField(
                    max_digits=12,
                    decimal_places=2,
                ),
            ),
        )
        total_abonos = self._abonos_queryset().aggregate(
            total=Coalesce(
                Sum('monto_abonado'),
                ZERO,
                output_field=DecimalField(
                    max_digits=12,
                    decimal_places=2,
                ),
            ),
        )['total']

        self.total_ventas = self._quantize(
            agregados_ventas['total_ventas'],
        )
        self.total_efectivo = self._quantize(
            agregados_ventas['total_efectivo'],
        )
        self.total_tarjeta = self._quantize(
            agregados_ventas['total_tarjeta'],
        )
        self.total_transferencia = self._quantize(
            agregados_ventas['total_transferencia'],
        )
        self.total_credito = self._quantize(
            agregados_ventas['total_credito'],
        )
        self.total_abonos = self._quantize(total_abonos)
        self.total_gastos = self._calcular_total_gastos_operativos()
        self.ventas_por_categoria = self._calcular_ventas_por_categoria()
        self.efectivo_esperado = self._quantize(
            self.total_efectivo + self.total_abonos,
        )
        self.calcular_diferencia()

        return {
            'total_ventas': self.total_ventas,
            'total_efectivo': self.total_efectivo,
            'total_tarjeta': self.total_tarjeta,
            'total_transferencia': self.total_transferencia,
            'total_credito': self.total_credito,
            'total_abonos': self.total_abonos,
            'total_gastos': self.total_gastos,
            'ventas_por_categoria': self.ventas_por_categoria,
            'efectivo_esperado': self.efectivo_esperado,
            'diferencia': self.diferencia,
        }

    def calcular_diferencia(self):
        """
        Calcula la diferencia entre el efectivo real y el esperado.
        """
        self.diferencia = self._quantize(
            self.efectivo_real - self.efectivo_esperado,
        )
        return self.diferencia

    def generar_resumen(self):
        """
        Genera un resumen estructurado del cierre de caja.
        """
        return {
            'fecha_cierre': self.fecha_cierre.isoformat(),
            'fecha_registro': (
                self.fecha_registro.isoformat()
                if self.fecha_registro else None
            ),
            'usuario_cierre': self.usuario_cierre_id,
            'total_ventas': str(self.total_ventas),
            'total_efectivo': str(self.total_efectivo),
            'total_tarjeta': str(self.total_tarjeta),
            'total_transferencia': str(self.total_transferencia),
            'total_credito': str(self.total_credito),
            'total_abonos': str(self.total_abonos),
            'total_gastos': str(self.total_gastos),
            'efectivo_esperado': str(self.efectivo_esperado),
            'efectivo_real': str(self.efectivo_real),
            'diferencia': str(self.diferencia),
            'gastos_operativos': self.gastos_operativos,
            'ventas_por_categoria': self.ventas_por_categoria,
            'observaciones': self.observaciones,
        }

    def clean(self):
        if self.fecha_cierre and self.fecha_cierre > timezone.localdate():
            raise ValidationError({
                'fecha_cierre': _(
                    'La fecha de cierre no puede estar en el futuro.'
                ),
            })

        if not isinstance(self.gastos_operativos, dict):
            raise ValidationError({
                'gastos_operativos': _(
                    'Los gastos operativos deben almacenarse como un '
                    'objeto JSON.'
                ),
            })

        if not isinstance(self.ventas_por_categoria, dict):
            raise ValidationError({
                'ventas_por_categoria': _(
                    'Las ventas por categoria deben almacenarse como un '
                    'objeto JSON.'
                ),
            })

        campos_no_negativos = (
            'total_ventas',
            'total_efectivo',
            'total_tarjeta',
            'total_transferencia',
            'total_credito',
            'total_abonos',
            'total_gastos',
            'efectivo_esperado',
            'efectivo_real',
        )

        for campo in campos_no_negativos:
            valor = getattr(self, campo)
            if valor < ZERO:
                raise ValidationError({
                    campo: _(
                        'El campo %(campo)s no puede ser negativo.'
                    ) % {
                        'campo': campo,
                    },
                })

    def save(self, *args, **kwargs):
        if self.empresa_id is None:
            from empresa.context import get_empresa_actual_or_default

            self.empresa = get_empresa_actual_or_default()
        self.calcular_totales()
        self.full_clean()
        super().save(*args, **kwargs)


class Informe(models.Model):
    """
    Modelo que almacena informes generados por el sistema.

    Conserva el rango consultado, el usuario que genero el informe,
    los datos consolidados y los archivos exportados asociados.
    """

    class TipoInforme(models.TextChoices):
        VENTAS_PERIODO = 'VENTAS_PERIODO', _('Ventas por periodo')
        PRODUCTOS_MAS_VENDIDOS = (
            'PRODUCTOS_MAS_VENDIDOS',
            _('Productos mas vendidos'),
        )
        CLIENTES_TOP = 'CLIENTES_TOP', _('Clientes top')
        INVENTARIO_VALORIZADO = (
            'INVENTARIO_VALORIZADO',
            _('Inventario valorizado'),
        )
        CUENTAS_POR_COBRAR = (
            'CUENTAS_POR_COBRAR',
            _('Cuentas por cobrar'),
        )
        CIERRE_CAJA = 'CIERRE_CAJA', _('Cierre de caja')

    id = models.AutoField(primary_key=True)
    empresa = models.ForeignKey(
        'empresa.Empresa',
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name='informes',
        verbose_name=_('empresa'),
    )
    tipo_informe = models.CharField(
        _('tipo de informe'),
        max_length=40,
        choices=TipoInforme.choices,
        help_text=_('Categoria funcional del informe generado.'),
    )
    fecha_generacion = models.DateTimeField(
        _('fecha de generacion'),
        default=timezone.now,
        help_text=_('Fecha y hora en que se genero el informe.'),
    )
    fecha_inicio = models.DateField(
        _('fecha de inicio'),
        help_text=_('Fecha inicial del periodo consultado.'),
    )
    fecha_fin = models.DateField(
        _('fecha de fin'),
        help_text=_('Fecha final del periodo consultado.'),
    )
    datos = models.JSONField(
        _('datos'),
        default=dict,
        blank=True,
        help_text=_('Datos estructurados utilizados para el informe.'),
    )
    archivo_pdf = models.FileField(
        _('archivo PDF'),
        upload_to='informes/pdfs/',
        blank=True,
        help_text=_('Archivo PDF generado para el informe.'),
    )
    archivo_excel = models.FileField(
        _('archivo Excel'),
        upload_to='informes/excel/',
        blank=True,
        help_text=_('Archivo Excel generado para el informe.'),
    )
    usuario_genero = models.ForeignKey(
        'usuario.Usuario',
        on_delete=models.PROTECT,
        related_name='informes_generados',
        verbose_name=_('usuario que genero'),
        help_text=_('Usuario responsable de generar el informe.'),
    )

    class Meta:
        db_table = 'informes_generados'
        ordering = ['-fecha_generacion', '-id']
        verbose_name = _('informe')
        verbose_name_plural = _('informes')
        indexes = [
            models.Index(fields=['empresa']),
            models.Index(fields=['tipo_informe']),
            models.Index(fields=['fecha_generacion']),
            models.Index(fields=['fecha_inicio']),
            models.Index(fields=['fecha_fin']),
            models.Index(fields=['usuario_genero']),
        ]

    def __str__(self):
        return (
            f"{self.get_tipo_informe_display()} "
            f"({self.fecha_inicio:%Y-%m-%d} - {self.fecha_fin:%Y-%m-%d})"
        )

    def clean(self):
        if self.fecha_inicio and self.fecha_fin:
            if self.fecha_inicio > self.fecha_fin:
                raise ValidationError({
                    'fecha_fin': _(
                        'La fecha de fin no puede ser anterior a la fecha '
                        'de inicio.'
                    ),
                })

        if self.fecha_generacion and self.fecha_generacion > timezone.now():
            raise ValidationError({
                'fecha_generacion': _(
                    'La fecha de generacion no puede estar en el futuro.'
                ),
            })

        if not isinstance(self.datos, dict):
            raise ValidationError({
                'datos': _(
                    'Los datos del informe deben almacenarse como un '
                    'objeto JSON.'
                ),
            })

    def save(self, *args, **kwargs):
        if self.empresa_id is None:
            from empresa.context import get_empresa_actual_or_default

            self.empresa = get_empresa_actual_or_default()
        self.full_clean()
        super().save(*args, **kwargs)
