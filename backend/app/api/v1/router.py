from fastapi import APIRouter
from app.api.v1 import auth, employer, jobs, seeker, ai

api_router = APIRouter()

api_router.include_router(auth.router,     prefix="/auth",     tags=["auth"])
api_router.include_router(employer.router, prefix="/employer", tags=["employer"])
api_router.include_router(jobs.router,     prefix="/jobs",     tags=["jobs"])
api_router.include_router(seeker.router,   prefix="/seeker",   tags=["seeker"])
api_router.include_router(ai.router,       prefix="/ai",       tags=["ai"])
