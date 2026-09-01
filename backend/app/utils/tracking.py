import random
import string
from datetime import datetime

def generate_case_id() -> str:
    """Generate high-readability unique Case ID: NS-YYYY-XXXXXX"""
    year = datetime.utcnow().year
    random_digits = "".join(random.choices(string.digits, k=6))
    return f"NS-{year}-{random_digits}"

def generate_tracking_code() -> str:
    """Legacy tracking code generator for backward compatibility"""
    now = datetime.utcnow()
    date_stamp = now.strftime("%Y%m%d")
    random_part = "".join(random.choices(string.ascii_uppercase + string.digits, k=5))
    return f"NS-{date_stamp}-{random_part}"
