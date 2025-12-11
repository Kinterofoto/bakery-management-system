from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import logging

from .core.config import get_settings
from .api.routes import health, jobs
from .jobs.scheduler import init_scheduler, start_scheduler, shutdown_scheduler

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager for startup/shutdown events."""
    # Startup
    logger.info("Starting Bakery API...")
    settings = get_settings()

    # Initialize scheduler (only in production or if explicitly enabled)
    if settings.environment == "production":
        init_scheduler()
        start_scheduler()
        logger.info("Scheduler started for production environment")
    else:
        logger.info("Scheduler disabled in development (use /jobs endpoints to trigger manually)")

    yield

    # Shutdown
    logger.info("Shutting down Bakery API...")
    shutdown_scheduler()


# Create FastAPI app
settings = get_settings()
app = FastAPI(
    title="Bakery Management API",
    description="Backend API for Panadería Industrial - Jobs, Integrations, and AI Agents",
    version="0.1.0",
    lifespan=lifespan,
    docs_url="/docs" if settings.environment != "production" else None,
    redoc_url="/redoc" if settings.environment != "production" else None,
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:3001",
        "https://*.vercel.app",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(health.router)
app.include_router(jobs.router, prefix="/api")


@app.get("/")
async def root():
    """Root endpoint with API information."""
    return {
        "service": "Bakery Management API",
        "version": "0.1.0",
        "docs": "/docs",
        "health": "/health"
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=True
    )
