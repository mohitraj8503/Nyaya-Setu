from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from backend.app.database import get_db
from backend.app.schemas.auth import SendOtpRequest, VerifyOtpRequest, OfficerLoginRequest, AuthTokenResponse
from backend.app.utils.security import generate_otp, verify_otp, create_access_token
from backend.app.models.models import User

router = APIRouter(prefix="/v2/auth", tags=["v2-auth"])

@router.post("/send-otp")
def send_otp(payload: SendOtpRequest):
    phone = payload.phone.strip()
    if not phone:
        raise HTTPException(status_code=400, detail="Phone number is required")
        
    otp = generate_otp(phone)
    # In development, return mock OTP for ease of testing
    return {
        "ok": True,
        "message": f"OTP sent to {phone}",
        "dev_otp": otp
    }

@router.post("/verify-otp", response_model=AuthTokenResponse)
def verify_mobile_otp(payload: VerifyOtpRequest, db: Session = Depends(get_db)):
    phone = payload.phone.strip()
    if not verify_otp(phone, payload.otp):
        raise HTTPException(status_code=400, detail="Invalid or expired OTP")
        
    user = db.query(User).filter(User.phone == phone).first()
    if not user:
        user = User(
            phone=phone,
            name=payload.name or "Verified Citizen",
            language=payload.language or "hi",
            role="CITIZEN",
            is_verified=True
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        
    token = create_access_token({"sub": user.id, "phone": user.phone, "role": user.role})
    
    return AuthTokenResponse(
        access_token=token,
        user={
            "id": user.id,
            "phone": user.phone,
            "name": user.name,
            "role": user.role,
            "language": user.language
        }
    )

@router.post("/officer-login", response_model=AuthTokenResponse)
def officer_login(payload: OfficerLoginRequest, db: Session = Depends(get_db)):
    email = payload.email.strip().lower()
    # Simple verified mock officer login for dev / testing
    user = db.query(User).filter(User.email == email).first()
    if not user:
        user = User(
            email=email,
            name="Ward 12 Nodal Officer",
            role="OFFICER",
            is_verified=True
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        
    token = create_access_token({"sub": user.id, "email": user.email, "role": "OFFICER"})
    return AuthTokenResponse(
        access_token=token,
        user={
            "id": user.id,
            "email": user.email,
            "name": user.name,
            "role": "OFFICER",
            "department": "Municipal Ward Grievance Cell"
        }
    )
