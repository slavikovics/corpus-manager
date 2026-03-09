import weakref

from fastapi import APIRouter, UploadFile, File, Form, Depends, HTTPException, BackgroundTasks
from typing import Optional
import os
import uuid

from sqlalchemy import update
from sqlalchemy.ext.asyncio import AsyncSession, async_session
import asyncio
import logging
logger = logging.getLogger(__name__)

from ...core.database import get_db, AsyncSessionLocal, Document, ProcessingStatus
from ...core.config import settings
from ...services.corpus_builder import corpus_builder
from ...services.file_handlers import FileHandler
from ...models.search import UploadResponse

router = APIRouter(prefix="/upload", tags=["upload"])
ALLOWED_EXTENSIONS = ['.docx', '.doc', '.rtf', '.txt', '.pdf']
background_tasks_set = weakref.WeakSet()


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

    new_document = Document(
        title=title or file.filename,
        author=author,
        year=year,
        source_file=safe_filename,
        file_type=file_ext.lstrip('.'),
        meta_info={
            "original_filename": file.filename,
            "file_size": file_size,
            "upload_path": file_path
        },
        processing_status=ProcessingStatus.PENDING,
        word_count=0
    )

    db.add(new_document)
    await db.commit()
    await db.refresh(new_document)

    task = asyncio.create_task(
        process_document_background(
            new_document.id,
            file_path,
            file_ext.lstrip('.'),
            metadata
        )
    )

    background_tasks_set.add(task)
    task.add_done_callback(background_tasks_set.discard)
    
    return UploadResponse(
        filename=file.filename,
        document_id=new_document.id,
        word_count=0,
        processing_time=0
    )


async def process_document_background(document_id, file_path: str, file_type: str, metadata: dict):
    db = None
    try:
        db = AsyncSessionLocal()
        logger.debug(f"Background task: created new session for {file_path}")
        await db.execute(
            update(Document)
            .where(Document.id == document_id)
            .values(processing_status=ProcessingStatus.PROCESSING)
        )
        await db.commit()
        await process_document_task(file_path, file_type, metadata, db, document_id)

    except Exception as e:
        logger.error(f"Background task failed for {file_path}: {e}")
        await db.execute(
            update(Document)
            .where(Document.id == document_id)
            .values(processing_status=ProcessingStatus.FAILED)
        )
        if db:
            await db.rollback()
    finally:
        if db:
            await db.close()
            logger.debug(f"Background task: closed session for {file_path}")


async def process_document_task(
    file_path: str,
    file_type: str,
    metadata: dict,
    db: AsyncSession,
    doc_id: int
):
    try:
        result = await corpus_builder.process_document(
            file_path,
            file_type,
            metadata,
            db,
            doc_id
        )
        logger.info(f"Document processed: {result}")
    except Exception as e:
        logger.error(f"Error processing document: {e}")