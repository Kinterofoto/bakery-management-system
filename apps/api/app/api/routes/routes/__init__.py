"""Routes module - Route management endpoints.

This module handles:
- Route CRUD operations (create, list, update)
- Order assignment to routes
- Delivery sequence management
"""

from fastapi import APIRouter

from .crud import router as crud_router
from .orders import router as orders_router

router = APIRouter(prefix="/routes", tags=["routes"])

# Include sub-routers
# Orders router first for static paths like /unassigned
router.include_router(orders_router)
router.include_router(crud_router)
