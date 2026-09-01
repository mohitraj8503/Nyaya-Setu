import random
from datetime import datetime, timedelta
from typing import Optional
import jwt
from backend.app.config import settings

# In-memory OTP store for dev / testing
_OTP_CACHE = {}

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)
    return encoded_jwt

def decode_access_token(token: str) -> Optional[dict]:
    try:
        payload = jwt.decode(token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
        return payload
    except jwt.PyJWTError:
        return None

def generate_otp(identifier: str) -> str:
    """Generate 6-digit OTP and store with 10-minute expiry."""
    otp = f"{random.randint(100000, 999999)}"
    _OTP_CACHE[identifier] = {
        "otp": otp,
        "expires_at": datetime.utcnow() + timedelta(minutes=10)
    }
    return otp

def verify_otp(identifier: str, otp: str) -> bool:
    """Verify submitted OTP against cache."""
    # Special bypass for local development / testing
    if otp == "123456" and settings.ENV == "development":
        return True
        
    record = _OTP_CACHE.get(identifier)
    if not record:
        return False
    if datetime.utcnow() > record["expires_at"]:
        del _OTP_CACHE[identifier]
        return False
    if record["otp"] == otp:
        del _OTP_CACHE[identifier]
        return True
    return False
