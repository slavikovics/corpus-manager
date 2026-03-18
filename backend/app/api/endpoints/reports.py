from fastapi import APIRouter, Depends, HTTPException, Response, Query
from sqlalchemy.ext.asyncio import AsyncSession
from datetime import datetime, date
from typing import Optional
import logging

from ...core.database import get_db
from ...services.pdf_generator import PDFReportGenerator

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/reports", tags=["reports"])


@router.get("/corpus")
async def generate_corpus_report(
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
        db: AsyncSession = Depends(get_db)
):
    try:
        start = datetime.combine(start_date, datetime.min.time()) if start_date else None
        end = datetime.combine(end_date, datetime.max.time()) if end_date else None

        generator = PDFReportGenerator(db)
        pdf_bytes = await generator.generate_corpus_report(
            start_date=start,
            end_date=end
        )

        filename = f"corpus_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.pdf"

        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={"Content-Disposition": f"attachment; filename={filename}"}
        )
    except Exception as e:
        logger.error(f"Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/document/{doc_id}")
async def generate_document_report(
        doc_id: int,
        db: AsyncSession = Depends(get_db)
):
    try:
        generator = PDFReportGenerator(db)
        pdf_bytes = await generator.generate_document_report(doc_id)

        filename = f"document_{doc_id}_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.pdf"

        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={"Content-Disposition": f"attachment; filename={filename}"}
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/document/{doc_id}/sentence/{sentence_id}")
async def generate_sentence_report(
        doc_id: int,
        sentence_id: int,
        include_context: bool = Query(False, description="Include surrounding context"),
        context_size: int = Query(5, ge=1, le=20, description="Number of context tokens"),
        db: AsyncSession = Depends(get_db)
):
    try:
        generator = PDFReportGenerator(db)
        pdf_bytes = await generator.generate_sentence_report(
            doc_id=doc_id,
            sentence_id=sentence_id,
            include_context=include_context,
            context_size=context_size
        )

        filename = f"document_{doc_id}_sentence_{sentence_id}_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.pdf"

        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={"Content-Disposition": f"attachment; filename={filename}"}
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/document/{doc_id}/syntax")
async def generate_document_syntax_report(
        doc_id: int,
        db: AsyncSession = Depends(get_db)
):
    try:
        generator = PDFReportGenerator(db)
        pdf_bytes = await generator.generate_document_syntax_report(doc_id)

        filename = f"document_{doc_id}_syntax_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.pdf"

        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={"Content-Disposition": f"attachment; filename={filename}"}
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))