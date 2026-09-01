import re
from typing import Any

def sanitize_text(value: Any) -> str:
    """Strip HTML, script, style tags, and extra whitespace to prevent XSS injection."""
    if value is None:
        return ""
    if not isinstance(value, str):
        value = str(value)
        
    # Strip script tags & style tags
    clean = re.sub(r"<script\b[^>]*>.*?</script>", " ", value, flags=re.IGNORECASE | re.DOTALL)
    clean = re.sub(r"<style\b[^>]*>.*?</style>", " ", clean, flags=re.IGNORECASE | re.DOTALL)
    # Strip remaining HTML tags
    clean = re.sub(r"<[^>]+>", " ", clean)
    # Collapse multiple whitespaces
    clean = re.sub(r"\s+", " ", clean).strip()
    return clean

def sanitize_payload(value: Any) -> Any:
    """Recursively sanitize dictionary and list values."""
    if isinstance(value, list):
        return [sanitize_payload(item) for item in value]
    if isinstance(value, dict):
        return {k: sanitize_payload(v) for k, v in value.items()}
    if isinstance(value, str):
        return sanitize_text(value)
    return value
