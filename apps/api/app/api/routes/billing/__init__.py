"""Billing API Module - Enterprise-ready modular router."""

from fastapi import APIRouter

from .crud import router as crud_router
from .config import router as config_router
from .export import router as export_router
from .remisions import router as remisions_router

# Main billing router
router = APIRouter(prefix="/billing", tags=["billing"])

# Include sub-routers
# IMPORTANT: Order matters! Static paths must come before dynamic paths
router.include_router(config_router)     # /config/*
router.include_router(export_router)     # /process, /history/*
router.include_router(remisions_router)  # /remisions/*
router.include_router(crud_router)       # /pending, /unfactured

__all__ = ["router"]
