import uuid
from datetime import timedelta
from decimal import Decimal

from django.conf import settings
from django.db import models
from django.utils import timezone
from django.utils.translation import gettext_lazy as _


class LocalConfig(models.Model):
    class Mode(models.TextChoices):
        LOCAL = 'local', _('Local')
        CLOUD = 'cloud', _('Cloud')

    class ConnectivityStatus(models.TextChoices):
        ONLINE = 'ONLINE', _('Online')
        OFFLINE = 'OFFLINE', _('Offline')
        UNKNOWN = 'UNKNOWN', _('Unknown')

    class OfflineInvoicePolicy(models.TextChoices):
        PREFACTURA = 'PREFACTURA', _('Prefactura interna')
        TICKET = 'TICKET', _('Ticket POS interno')
        CONTINGENCIA = 'CONTINGENCIA', _('Contingencia DIAN')

    empresa = models.OneToOneField(
        'empresa.Empresa',
        on_delete=models.CASCADE,
        related_name='local_config',
    )
    mode = models.CharField(
        max_length=20,
        choices=Mode.choices,
        default=Mode.LOCAL,
    )
    cloud_api_url = models.URLField(blank=True)
    connectivity_status = models.CharField(
        max_length=20,
        choices=ConnectivityStatus.choices,
        default=ConnectivityStatus.UNKNOWN,
    )
    last_connection_checked_at = models.DateTimeField(null=True, blank=True)
    printer_config = models.JSONField(default=dict, blank=True)
    offline_invoice_policy = models.CharField(
        max_length=20,
        choices=OfflineInvoicePolicy.choices,
        default=OfflineInvoicePolicy.PREFACTURA,
    )
    sync_enabled = models.BooleanField(default=False)
    invoice_retry_enabled = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'offline_local_config'

    def __str__(self):
        return f'{self.empresa} - {self.mode}'

    @classmethod
    def get_for_empresa(cls, empresa):
        obj, _ = cls.objects.get_or_create(
            empresa=empresa,
            defaults={
                'mode': getattr(settings, 'MALLOR_MODE', cls.Mode.LOCAL),
            },
        )
        return obj

    @property
    def is_online(self):
        return self.connectivity_status == self.ConnectivityStatus.ONLINE


class LocalDevice(models.Model):
    uuid = models.UUIDField(default=uuid.uuid4, editable=False, unique=True)
    empresa = models.ForeignKey(
        'empresa.Empresa',
        on_delete=models.CASCADE,
        related_name='local_devices',
    )
    name = models.CharField(max_length=120)
    fingerprint_hash = models.CharField(max_length=255, blank=True)
    is_server = models.BooleanField(default=False)
    app_version = models.CharField(max_length=50, blank=True)
    last_seen_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'offline_local_devices'
        indexes = [
            models.Index(fields=['empresa']),
            models.Index(fields=['is_server']),
        ]

    def __str__(self):
        return self.name


class POSTerminal(models.Model):
    uuid = models.UUIDField(default=uuid.uuid4, editable=False, unique=True)
    empresa = models.ForeignKey(
        'empresa.Empresa',
        on_delete=models.CASCADE,
        related_name='pos_terminals',
    )
    code = models.CharField(max_length=30)
    name = models.CharField(max_length=120)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    device = models.ForeignKey(
        LocalDevice,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='terminals',
    )
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'offline_pos_terminals'
        indexes = [
            models.Index(fields=['empresa']),
            models.Index(fields=['code']),
            models.Index(fields=['is_active']),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=['empresa', 'code'],
                name='pos_terminal_empresa_code_unique',
            ),
        ]

    def __str__(self):
        return f'{self.code} - {self.name}'


class CajaSesion(models.Model):
    class Estado(models.TextChoices):
        ABIERTA = 'ABIERTA', _('Abierta')
        CERRADA = 'CERRADA', _('Cerrada')

    uuid = models.UUIDField(default=uuid.uuid4, editable=False, unique=True)
    empresa = models.ForeignKey(
        'empresa.Empresa',
        on_delete=models.PROTECT,
        related_name='cajas_sesiones',
    )
    terminal = models.ForeignKey(
        POSTerminal,
        on_delete=models.PROTECT,
        related_name='sesiones_caja',
    )
    usuario_apertura = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name='cajas_abiertas',
    )
    usuario_cierre = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name='cajas_cerradas',
    )
    estado = models.CharField(
        max_length=20,
        choices=Estado.choices,
        default=Estado.ABIERTA,
    )
    opened_at = models.DateTimeField(default=timezone.now)
    closed_at = models.DateTimeField(null=True, blank=True)
    efectivo_inicial = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal('0.00'),
    )
    efectivo_final = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        null=True,
        blank=True,
    )
    observaciones = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'offline_cajas_sesiones'
        ordering = ['-opened_at']
        indexes = [
            models.Index(fields=['empresa']),
            models.Index(fields=['terminal', 'estado']),
            models.Index(fields=['opened_at']),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=['terminal'],
                condition=models.Q(estado='ABIERTA'),
                name='caja_sesion_terminal_abierta_unique',
            ),
        ]

    def __str__(self):
        return f'{self.terminal.code} - {self.estado}'

    def cerrar(self, usuario, efectivo_final, observaciones=''):
        self.usuario_cierre = usuario
        self.efectivo_final = efectivo_final
        self.observaciones = observaciones or self.observaciones
        self.estado = self.Estado.CERRADA
        self.closed_at = timezone.now()
        self.save(
            update_fields=[
                'usuario_cierre',
                'efectivo_final',
                'observaciones',
                'estado',
                'closed_at',
                'updated_at',
            ],
        )
        return self


class SyncOutbox(models.Model):
    class Status(models.TextChoices):
        PENDING = 'PENDING', _('Pending')
        PROCESSING = 'PROCESSING', _('Processing')
        SENT = 'SENT', _('Sent')
        ERROR = 'ERROR', _('Error')

    uuid = models.UUIDField(default=uuid.uuid4, editable=False, unique=True)
    empresa = models.ForeignKey(
        'empresa.Empresa',
        on_delete=models.CASCADE,
        related_name='sync_outbox',
    )
    aggregate_type = models.CharField(max_length=80)
    aggregate_uuid = models.UUIDField()
    event_type = models.CharField(max_length=80)
    payload = models.JSONField(default=dict)
    idempotency_key = models.CharField(max_length=160, unique=True)
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.PENDING,
    )
    attempts = models.PositiveIntegerField(default=0)
    next_retry_at = models.DateTimeField(default=timezone.now)
    last_error = models.TextField(blank=True)
    sent_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'offline_sync_outbox'
        ordering = ['created_at']
        indexes = [
            models.Index(fields=['empresa', 'status']),
            models.Index(fields=['aggregate_type', 'aggregate_uuid']),
            models.Index(fields=['next_retry_at']),
        ]

    def schedule_retry(self, error):
        self.attempts += 1
        self.status = self.Status.ERROR
        self.last_error = str(error)
        self.next_retry_at = timezone.now() + timedelta(
            minutes=min(60, max(1, self.attempts * 2)),
        )
        self.save(
            update_fields=[
                'attempts',
                'status',
                'last_error',
                'next_retry_at',
                'updated_at',
            ],
        )


class LocalLicense(models.Model):
    class Status(models.TextChoices):
        ACTIVE = 'ACTIVE', _('Active')
        GRACE = 'GRACE', _('Grace')
        EXPIRED = 'EXPIRED', _('Expired')
        REVOKED = 'REVOKED', _('Revoked')

    uuid = models.UUIDField(default=uuid.uuid4, editable=False, unique=True)
    empresa = models.OneToOneField(
        'empresa.Empresa',
        on_delete=models.CASCADE,
        related_name='local_license',
    )
    license_key = models.CharField(max_length=120, unique=True)
    plan = models.CharField(max_length=60, default='LOCAL_LIFETIME')
    signature = models.TextField(blank=True)
    purchased_at = models.DateField(null=True, blank=True)
    support_until = models.DateField(null=True, blank=True)
    last_validated_at = models.DateTimeField(null=True, blank=True)
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.ACTIVE,
    )
    metadata = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'offline_local_licenses'

    def __str__(self):
        return self.license_key


class ConnectivityLog(models.Model):
    class Target(models.TextChoices):
        CLOUD = 'CLOUD', _('Cloud')
        FACTUS = 'FACTUS', _('Factus')

    empresa = models.ForeignKey(
        'empresa.Empresa',
        on_delete=models.CASCADE,
        related_name='connectivity_logs',
    )
    target = models.CharField(max_length=20, choices=Target.choices)
    is_online = models.BooleanField(default=False)
    latency_ms = models.PositiveIntegerField(null=True, blank=True)
    message = models.TextField(blank=True)
    checked_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'offline_connectivity_logs'
        ordering = ['-checked_at']
        indexes = [
            models.Index(fields=['empresa', 'target']),
            models.Index(fields=['checked_at']),
        ]
