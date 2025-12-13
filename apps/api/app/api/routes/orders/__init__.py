"""Orders API Module - Enterprise-ready modular router."""

from fastapi import APIRouter

from .crud import router as crud_router
from .items import router as items_router
from .workflow import router as workflow_router
from .views.stats import router as stats_router

# Main orders router
router = APIRouter(prefix="/orders", tags=["orders"])

# Include sub-routers
# IMPORTANT: Order matters! Static paths must come before dynamic paths
# stats_router has /stats and /dashboard which would match /{order_id} if crud comes first
router.include_router(stats_router)      # /stats, /dashboard
router.include_router(workflow_router)   # /{order_id}/transition, /{order_id}/cancel, etc.
router.include_router(items_router)      # /{order_id}/items
router.include_router(crud_router)       # /, /{order_id}

__all__ = ["router"]
