from typing import Optional
from pydantic import BaseModel

class SendOtpRequest(BaseModel):
    phone: str

class VerifyOtpRequest(BaseModel):
    phone: str
    otp: str
    name: Optional[str] = None
    language: Optional[str] = "hi"

class OfficerLoginRequest(BaseModel):
    email: str
    password: str

class AuthTokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: dict
