from fastapi import APIRouter, Depends
from supabase import Client
from datetime import datetime

from ...core.supabase import get_supabase
from ...core.config import get_settings

router = APIRouter(tags=["health"])


@router.get("/health")
async def health_check():
    """Basic health check endpoint."""
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "service": "bakery-api"
    }


@router.get("/health/detailed")
async def detailed_health_check(
    supabase: Client = Depends(get_supabase)
):
    """Detailed health check including database connectivity."""
    settings = get_settings()

    # Test Supabase connection
    db_status = "healthy"
    db_error = None
    try:
        # Simple query to test connection
        result = supabase.table("clients").select("id").limit(1).execute()
    except Exception as e:
        db_status = "unhealthy"
        db_error = str(e)

    return {
        "status": "healthy" if db_status == "healthy" else "degraded",
        "timestamp": datetime.utcnow().isoformat(),
        "service": "bakery-api",
        "environment": settings.environment,
        "checks": {
            "database": {
                "status": db_status,
                "error": db_error
            }
        }
    }
