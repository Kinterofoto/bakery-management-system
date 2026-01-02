"""Routes module - Route management endpoints.

This module handles:
- Route CRUD operations (create, list, update)
- Order assignment to routes
- Delivery sequence management
- Delivery operations (receive, complete, returns)
- Route statistics and initialization
"""

from fastapi import APIRouter

from .crud import router as crud_router
from .orders import router as orders_router
from .stats import router as stats_router
from .delivery import router as delivery_router

router = APIRouter(prefix="/routes", tags=["routes"])

# Include sub-routers
# Stats router first for /init endpoint
router.include_router(stats_router)
# Delivery router for /upload-evidence, /receive, /complete-delivery, /returns
router.include_router(delivery_router)
# Orders router for static paths like /unassigned
router.include_router(orders_router)
# CRUD router last (has dynamic paths like /{route_id})
router.include_router(crud_router)
