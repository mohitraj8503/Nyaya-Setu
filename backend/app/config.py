import os
from pathlib import Path
from pydantic_settings import BaseSettings
from pydantic import Field

ROOT_DIR = Path(__file__).resolve().parent.parent.parent
BACKEND_DIR = Path(__file__).resolve().parent.parent

class Settings(BaseSettings):
    PROJECT_NAME: str = "NyayaSetu"
    VERSION: str = "2.0.0"
    API_PREFIX: str = "/api"
    ENV: str = "development"
    DEBUG: bool = True
    
    # Database
    DATABASE_URL: str = Field(default=f"sqlite:///{BACKEND_DIR}/nyayasetu_v2.db")
    
    # Paths
    DATA_DIR: Path = ROOT_DIR / "data"
    ROOT_DIR: Path = ROOT_DIR
    
    # Security
    JWT_SECRET_KEY: str = "nyayasetu-dev-secret-key-change-in-production-2026"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days
    
    # CORS
    CORS_ORIGINS: list[str] = ["*"]
    
    # AI & Indic APIs
    SARVAM_API_KEY: str = ""
    LLM_API_KEY: str = ""
    USE_MOCK_AI: bool = True  # Allows offline / test development without external API costs
    
    # Notifications (SMTP, SMS, WhatsApp)
    SMTP_HOST: str = "localhost"
    SMTP_PORT: int = 1025
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""
    SMTP_FROM: str = "grievance-bot@nyayasetu.org"
    SIMULATION_NOTIFICATIONS: bool = True
    
    class Config:
        env_file = ".env"
        extra = "allow"

settings = Settings()
