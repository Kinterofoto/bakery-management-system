"""Dispatch module - Order dispatch and statistics endpoints.

This module handles:
- Dispatch operations (send orders to delivery)
- Inventory movements on dispatch
- Dispatch statistics for dashboard
"""

from fastapi import APIRouter

from .operations import router as operations_router
from .stats import router as stats_router

router = APIRouter(prefix="/dispatch", tags=["dispatch"])

# Include sub-routers
# Stats router first for static paths
router.include_router(stats_router)
router.include_router(operations_router)
