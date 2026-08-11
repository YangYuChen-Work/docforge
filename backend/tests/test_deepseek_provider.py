import sys
from types import SimpleNamespace

from app.ai.deepseek_provider import DeepSeekProvider


def test_deepseek_provider_reuses_openai_client(monkeypatch):
    created = []

    class FakeOpenAI:
        def __init__(self, **kwargs):
            created.append(kwargs)

    monkeypatch.setitem(sys.modules, "openai", SimpleNamespace(OpenAI=FakeOpenAI))

    provider = DeepSeekProvider()

    assert provider._client() is provider._client()
    assert len(created) == 1
