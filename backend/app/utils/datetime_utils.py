from datetime import datetime, timezone

def utc_now() -> datetime:
    """Return timezone-naive UTC datetime for clean database storage."""
    return datetime.now(timezone.utc).replace(tzinfo=None)
