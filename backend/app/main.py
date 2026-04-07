from PIL import report
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import logging
from contextlib import asynccontextmanager

from .core.config import settings
from .core.database import engine, Base
from .core.elastic import es_client
from .services.text_processor import text_processor
from .api.endpoints import upload, search, documents, lemma, word_form, token, reports, sentence, db_export, semantics

logging.basicConfig(
    level=logging.INFO if not settings.DEBUG else logging.DEBUG,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(fast_api_app):
    logger.info("Starting up...")
    
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        logger.info("Database tables created (if they didn't exist)")
    
    await es_client.initialize()
    await text_processor.initialize()
    
    logger.info("Application startup complete")
    
    yield
    
    logger.info("Shutting down...")
    
    await engine.dispose()
    await es_client.close()
    
    logger.info("Application shutdown complete")


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    debug=settings.DEBUG,
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(upload.router, prefix="/api")
app.include_router(search.router, prefix="/api")
app.include_router(documents.router, prefix="/api")
app.include_router(lemma.router, prefix="/api")
app.include_router(word_form.router, prefix="/api")
app.include_router(token.router, prefix="/api")
app.include_router(reports.router, prefix="/api")
app.include_router(sentence.router, prefix="/api")
app.include_router(db_export.router, prefix="/api")
app.include_router(semantics.router, prefix="/semantics")


@app.get("/")
async def root():
    return {
        "app": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "status": "running"
    }


@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "database": "connected",
        "elasticsearch": "connected"
    }