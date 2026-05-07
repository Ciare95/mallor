from typing import Dict, List, Optional

import requests
from django.conf import settings

from IA.llm.ports import (
    LLMConfigurationError,
    LLMResponse,
    estimate_tokens_from_messages,
)


class DeepSeekClient:
    """
    Adaptador HTTP para DeepSeek compatible con el contrato tipo OpenAI.
    """

    def __init__(self):
        api_key = getattr(settings, 'DEEPSEEK_API_KEY', '')
        if not api_key:
            raise LLMConfigurationError('DEEPSEEK_API_KEY no esta configurada.')

        self.api_key = api_key
        self.model = getattr(settings, 'DEEPSEEK_MODEL', 'deepseek-chat')
        self.temperature = getattr(settings, 'DEEPSEEK_TEMPERATURE', 0.1)
        self.timeout = getattr(settings, 'DEEPSEEK_TIMEOUT', 30)
        self.base_url = getattr(
            settings,
            'DEEPSEEK_BASE_URL',
            'https://api.deepseek.com/v1',
        ).rstrip('/')
        self.session = requests.Session()

    def _headers(self) -> Dict[str, str]:
        return {
            'Authorization': f'Bearer {self.api_key}',
            'Content-Type': 'application/json',
            'Accept': 'application/json',
        }

    def _extract_text_content(self, content) -> str:
        if isinstance(content, str):
            return content
        if isinstance(content, list):
            parts = []
            for item in content:
                if isinstance(item, dict) and item.get('type') == 'text':
                    parts.append(str(item.get('text', '')))
            return ''.join(parts)
        return ''

    def _post_chat_completion(self, payload: Dict[str, object]) -> Dict[str, object]:
        try:
            response = self.session.post(
                f'{self.base_url}/chat/completions',
                json=payload,
                headers=self._headers(),
                timeout=self.timeout,
            )
            response.raise_for_status()
        except requests.RequestException as exc:
            raise LLMConfigurationError(
                f'Error al comunicarse con DeepSeek: {exc}',
            ) from exc

        try:
            return response.json()
        except ValueError as exc:
            raise LLMConfigurationError(
                'DeepSeek devolvio una respuesta no JSON.',
            ) from exc

    def chat(
        self,
        messages: List[Dict[str, str]],
        *,
        temperature: Optional[float] = None,
    ) -> LLMResponse:
        payload = {
            'model': self.model,
            'messages': messages,
            'temperature': self.temperature if temperature is None else temperature,
        }
        response = self._post_chat_completion(payload)
        choices = response.get('choices') or []
        if not choices:
            raise LLMConfigurationError('DeepSeek no devolvio choices.')

        message = choices[0].get('message') or {}
        content = self._extract_text_content(message.get('content'))
        usage = response.get('usage') or {}
        return LLMResponse(
            content=content,
            tokens_entrada=(
                int(usage.get('prompt_tokens', 0))
                if usage else estimate_tokens_from_messages(messages)
            ),
            tokens_salida=(
                int(usage.get('completion_tokens', 0))
                if usage else max(1, len(content) // 4)
            ),
        )
