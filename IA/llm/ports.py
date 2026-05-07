from dataclasses import dataclass
from typing import Any, Dict, List, Optional, Protocol


@dataclass
class LLMResponse:
    content: str
    tokens_entrada: int = 0
    tokens_salida: int = 0


class LLMClient(Protocol):
    def chat(
        self,
        messages: List[Dict[str, str]],
        *,
        temperature: Optional[float] = None,
    ) -> LLMResponse:
        ...


class LLMConfigurationError(Exception):
    pass


def estimate_tokens_from_messages(messages: List[Dict[str, Any]]) -> int:
    text = ' '.join(str(message.get('content', '')) for message in messages)
    return max(1, len(text) // 4)
