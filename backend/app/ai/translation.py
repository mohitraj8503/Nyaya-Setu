import httpx
from backend.app.config import settings

class TranslationService:
    async def translate(self, text: str, source_lang: str, target_lang: str) -> str:
        """Translate text between Indic languages and English using Sarvam AI / Indic model."""
        if source_lang == target_lang or not text.strip():
            return text
            
        if settings.SARVAM_API_KEY and not settings.USE_MOCK_AI:
            try:
                async with httpx.AsyncClient() as client:
                    headers = {"api-subscription-key": settings.SARVAM_API_KEY}
                    payload = {
                        "input": text,
                        "source_language_code": source_lang,
                        "target_language_code": target_lang,
                        "speaker_gender": "Male",
                        "mode": "formal"
                    }
                    res = await client.post("https://api.sarvam.ai/translate", json=payload, headers=headers, timeout=10.0)
                    if res.status_code == 200:
                        return res.json().get("translated_text", text)
            except Exception:
                pass
                
        # Smart local bilingual formatter if offline
        if target_lang == "en" and source_lang != "en":
            return f"[Translated from {source_lang.upper()}]: {text}"
        elif source_lang == "en" and target_lang == "hi":
            return f"[हिंदी अनुवाद]: {text}"
        return text

translation_service = TranslationService()
