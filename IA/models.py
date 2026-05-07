import uuid

from django.conf import settings
from django.db import models
from django.utils.translation import gettext_lazy as _


class MensajeIA(models.Model):
    """
    Registro auditado de una interaccion del asistente IA.

    El historial guarda solo metadatos y resultados saneados. No debe persistir
    prompts completos, credenciales, payloads Factus ni documentos electronicos.
    """

    class Feedback(models.TextChoices):
        UTIL = 'UTIL', _('Util')
        NO_UTIL = 'NO_UTIL', _('No util')

    empresa = models.ForeignKey(
        'empresa.Empresa',
        on_delete=models.CASCADE,
        related_name='mensajes_ia',
    )
    usuario = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='mensajes_ia',
    )
    sesion_id = models.UUIDField(default=uuid.uuid4, db_index=True)
    rol_empresa = models.CharField(max_length=20)
    consulta = models.TextField()
    respuesta = models.TextField()
    herramienta_usada = models.CharField(max_length=100, blank=True)
    parametros_herramienta = models.JSONField(default=dict, blank=True)
    metadatos_resultado = models.JSONField(default=dict, blank=True)
    feedback = models.CharField(
        max_length=20,
        choices=Feedback.choices,
        blank=True,
    )
    feedback_comentario = models.TextField(blank=True)
    tiempo_respuesta = models.FloatField(default=0.0)
    tokens_entrada = models.PositiveIntegerField(default=0)
    tokens_salida = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'ia_mensajes'
        ordering = ['-created_at', '-id']
        indexes = [
            models.Index(
                fields=['empresa', 'usuario', 'sesion_id', 'created_at'],
                name='ia_msg_emp_usr_ses_fecha_idx',
            ),
            models.Index(
                fields=['empresa', 'created_at'],
                name='ia_msg_empresa_fecha_idx',
            ),
            models.Index(
                fields=['herramienta_usada'],
                name='ia_msg_herramienta_idx',
            ),
        ]
        verbose_name = _('mensaje IA')
        verbose_name_plural = _('mensajes IA')

    def __str__(self):
        return f'{self.usuario} - {self.empresa} - {self.sesion_id}'
