import os
from pathlib import Path
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from backend.app.config import settings
from backend.app.seed import seed_database
from backend.app.routers import (
    v1_compat,
    intake,
    cases,
    authorities,
    officer,
    analytics,
    auth,
)

# Initialize and seed database tables
seed_database()

app = FastAPI(
    title="NyayaSetu 2.0 API",
    description="AI-Powered Citizen Grievance Orchestration Platform",
    version="2.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json"
)

# Enable CORS for Next.js frontend and Webflow templates
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 1. Mount backward-compatible /api/v1 and /api endpoints
app.include_router(v1_compat.router, prefix="/api/v1")
app.include_router(v1_compat.router, prefix="/api")

# 2. Mount 2.0 AI-powered endpoints under /api
app.include_router(intake.router, prefix="/api")
app.include_router(cases.router, prefix="/api")
app.include_router(authorities.router, prefix="/api")
app.include_router(officer.router, prefix="/api")
app.include_router(analytics.router, prefix="/api")
app.include_router(auth.router, prefix="/api")

# 3. Mount static frontend directory if running in local single-server mode
static_dir = Path(__file__).resolve().parent.parent.parent
if static_dir.exists():
    app.mount("/static", StaticFiles(directory=str(static_dir)), name="static")

@app.get("/")
def root():
    return {
        "platform": "NyayaSetu 2.0",
        "tagline": "AI-powered citizen grievance orchestration platform",
        "version": "2.0.0",
        "docs": "/api/docs",
        "health": "/api/v1/health",
        "status": "operational"
    }
