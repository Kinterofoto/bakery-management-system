"""Production routes module."""

from fastapi import APIRouter
from .cascade import router as cascade_router

router = APIRouter()
router.include_router(cascade_router, prefix="/cascade", tags=["production-cascade"])
