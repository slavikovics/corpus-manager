from fastapi import APIRouter, HTTPException, Depends, Query
from sqlalchemy import select, func, and_, update
from sqlalchemy.ext.asyncio import AsyncSession
from ...models.words import *
from ...core.database import WordFormStats, DocumentWordFormStats, Document, get_db

router = APIRouter(prefix="/word-form-stats", tags=["word statistics"])


@router.get("/global/", response_model=WordFormStatsListResponse)
async def list_word_form_statistics(
        skip: int = Query(0, ge=0),
        limit: int = Query(100, ge=1, le=1000),
        search: Optional[str] = Query(None, description="Search by lemma"),
        min_frequency: Optional[int] = Query(None, ge=0),
        pos: Optional[str] = Query(None, description="Filter by part of speech"),
        db: AsyncSession = Depends(get_db)
):
    query = select(WordFormStats)

    if search:
        query = query.where(WordFormStats.lemma.ilike(f"%{search}%"))

    if min_frequency:
        query = query.where(WordFormStats.total_frequency >= min_frequency)

    if pos:
        query = query.where(WordFormStats.pos == pos)

    count_query = select(func.count()).select_from(query.subquery())
    total_result = await db.execute(count_query)
    total = total_result.scalar()

    query = query.order_by(WordFormStats.total_frequency.desc()).offset(skip).limit(limit)

    result = await db.execute(query)
    items = result.scalars().all()

    return WordFormStatsListResponse(
        items=items,
        total=total,
        skip=skip,
        limit=limit
    )


@router.put("/global/{stat_id}", response_model=WordFormStatsResponse)
async def update_word_form_statistics(
        stat_id: int,
        stat_update: WordFormStatsUpdate,
        db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(WordFormStats).where(WordFormStats.id == stat_id)
    )
    stat = result.scalar_one_or_none()

    if not stat:
        raise HTTPException(status_code=404, detail="Word form statistics not found")

    update_data = stat_update.model_dump(exclude_unset=True)
    if update_data:
        update_data["last_updated"] = datetime.now()
        for field, value in update_data.items():
            setattr(stat, field, value)

    await db.commit()
    await db.refresh(stat)
    return stat


@router.delete("/global/{stat_id}", status_code=204)
async def delete_word_form_statistics(
        stat_id: int,
        db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(WordFormStats).where(WordFormStats.id == stat_id)
    )
    stat = result.scalar_one_or_none()

    if not stat:
        raise HTTPException(status_code=404, detail="Word form statistics not found")

    await db.delete(stat)
    await db.commit()
    return None


@router.get("/document/", response_model=DocumentWordFormStatsListResponse)
async def list_document_word_form_stats(
        skip: int = Query(0, ge=0),
        limit: int = Query(100, ge=1, le=1000),
        doc_id: Optional[int] = Query(None, description="Filter by document ID"),
        pos: Optional[str] = Query(None, description="Filter by part of speech"),
        min_tfidf: Optional[float] = Query(None, ge=0, le=1),
        db: AsyncSession = Depends(get_db)
):
    query = select(DocumentWordFormStats)

    if doc_id:
        query = query.where(DocumentWordFormStats.doc_id == doc_id)

    if pos:
        query = query.where(DocumentWordFormStats.pos == pos)

    if min_tfidf:
        query = query.where(DocumentWordFormStats.tfidf >= min_tfidf)

    count_query = select(func.count()).select_from(query.subquery())
    total_result = await db.execute(count_query)
    total = total_result.scalar()

    query = query.order_by(DocumentWordFormStats.frequency.desc()).offset(skip).limit(limit)

    result = await db.execute(query)
    items = result.scalars().all()

    return DocumentWordFormStatsListResponse(
        items=items,
        total=total,
        skip=skip,
        limit=limit
    )
