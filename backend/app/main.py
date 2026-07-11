from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import get_settings
from app.routers import admin, auth, dashboard, exercises, sessions, templates

settings = get_settings()

app = FastAPI(title="ProjectX API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}


app.include_router(auth.router, prefix="/auth", tags=["auth"])
app.include_router(exercises.router, prefix="/exercises", tags=["exercises"])
app.include_router(templates.router, prefix="/templates", tags=["templates"])
app.include_router(sessions.router, prefix="/sessions", tags=["sessions"])
app.include_router(dashboard.router, prefix="/dashboard", tags=["dashboard"])
app.include_router(admin.router, prefix="/admin", tags=["admin"])
