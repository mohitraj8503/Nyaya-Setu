import os
import pytest
import httpx
from backend.app.config import settings

@pytest.mark.skipif(
    not settings.SARVAM_API_KEY or settings.USE_MOCK_AI,
    reason="Requires active SARVAM_API_KEY and USE_MOCK_AI=False"
)
@pytest.mark.asyncio
async def test_live_sarvam_stt():
    """Live integration test with Sarvam AI STT service."""
    async with httpx.AsyncClient() as client:
        headers = {"api-subscription-key": settings.SARVAM_API_KEY}
        # Health / translation test probe
        payload = {
            "input": "नमस्ते, मुझे शिकायत दर्ज करनी है।",
            "source_language_code": "hi",
            "target_language_code": "en",
            "speaker_gender": "Male",
            "mode": "formal"
        }
        res = await client.post("https://api.sarvam.ai/translate", json=payload, headers=headers, timeout=10.0)
        assert res.status_code == 200
        assert "translated_text" in res.json()

@pytest.mark.skipif(
    not settings.LLM_API_KEY or settings.USE_MOCK_AI,
    reason="Requires active LLM_API_KEY and USE_MOCK_AI=False"
)
@pytest.mark.asyncio
async def test_live_llm_classification():
    """Live integration test with LLM Structured Output classifier."""
    from backend.app.ai.classification import ClassificationEngine
    engine = ClassificationEngine()
    result = engine.classify("सड़क पर बड़ा गड्ढा और सीवर बह रहा है", language="hi")
    assert result["category"] in ["roads_potholes", "drainage_sewage", "garbage_collection"]
    assert result["confidence"] > 0.6
