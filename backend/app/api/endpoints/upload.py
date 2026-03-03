from fastapi import APIRouter, UploadFile, File, Form, Depends, HTTPException, BackgroundTasks
from typing import Optional
import os
import uuid
from sqlalchemy.ext.asyncio import AsyncSession
import logging
logger = logging.getLogger(__name__)

from ...core.database import get_db
from ...core.config import settings
from ...services.corpus_builder import corpus_builder
from ...services.file_handlers import FileHandler
from ...models.search import UploadResponse

router = APIRouter(prefix="/upload", tags=["upload"])
ALLOWED_EXTENSIONS = ['.docx', '.doc', '.rtf', '.txt', '.pdf']


@router.post("/file", response_model=UploadResponse)
async def upload_file(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    title: Optional[str] = Form(None),
    author: Optional[str] = Form(None),
    year: Optional[int] = Form(None),
    db: AsyncSession = Depends(get_db)
):
    file_ext = os.path.splitext(file.filename)[1].lower()
    if file_ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"File type {file_ext} not allowed. Allowed: {ALLOWED_EXTENSIONS}"
        )
    file_size = 0
    content = await file.read()
    file_size = len(content)
    await file.seek(0)
    
    if file_size > settings.MAX_FILE_SIZE:
        raise HTTPException(
            status_code=400,
            detail=f"File too large. Max size: {settings.MAX_FILE_SIZE / (1024*1024)} MB"
        )
    
    file_handler = FileHandler()
    safe_filename = f"{uuid.uuid4()}{file_ext}"
    file_path = await file_handler.save_upload_file(
        file,
        settings.UPLOAD_DIR,
        safe_filename
    )
    
    metadata = {
        "title": title or file.filename,
        "author": author,
        "year": year,
        "original_filename": file.filename
    }
    
    background_tasks.add_task(
        process_document_task,
        file_path,
        file_ext.lstrip('.'),
        metadata,
        db
    )
    
    return UploadResponse(
        filename=file.filename,
        document_id=0,
        word_count=0,
        processing_time=0
    )


async def process_document_task(
    file_path: str,
    file_type: str,
    metadata: dict,
    db: AsyncSession
):
    try:
        result = await corpus_builder.process_document(
            file_path,
            file_type,
            metadata,
            db
        )
        logger.info(f"Document processed: {result}")
    except Exception as e:
        logger.error(f"Error processing document: {e}")