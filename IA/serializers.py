from rest_framework import serializers

from IA.models import MensajeIA


class IAChatSerializer(serializers.Serializer):
    consulta = serializers.CharField(max_length=2000, trim_whitespace=True)
    sesion_id = serializers.UUIDField(required=False)

    def validate(self, attrs):
        if 'empresa_id' in self.initial_data:
            raise serializers.ValidationError({
                'empresa_id': 'La empresa activa se resuelve por X-Empresa-Id.',
            })
        return attrs


class MensajeIASerializer(serializers.ModelSerializer):
    sesion_id = serializers.UUIDField(format='hex_verbose')

    class Meta:
        model = MensajeIA
        fields = [
            'id',
            'sesion_id',
            'consulta',
            'respuesta',
            'herramienta_usada',
            'parametros_herramienta',
            'metadatos_resultado',
            'feedback',
            'feedback_comentario',
            'tiempo_respuesta',
            'tokens_entrada',
            'tokens_salida',
            'created_at',
        ]
        read_only_fields = fields


class IAFeedbackSerializer(serializers.Serializer):
    mensaje_id = serializers.IntegerField(min_value=1)
    feedback = serializers.ChoiceField(choices=MensajeIA.Feedback.choices)
    comentario = serializers.CharField(
        required=False,
        allow_blank=True,
        max_length=1000,
    )
