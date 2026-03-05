from fastapi import APIRouter, HTTPException, Depends, Query
from sqlalchemy import select, func, and_, update
from sqlalchemy.ext.asyncio import AsyncSession
from ...models.words import *
from ...core.database import WordStatistics, DocumentWordStats, Document, get_db

router = APIRouter(prefix="/word-stats", tags=["word statistics"])

@router.post("/global/", response_model=WordStatisticsResponse, status_code=201)
async def create_word_statistics(
        word_stat: WordStatisticsCreate,
        db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(WordStatistics).where(
            and_(
                WordStatistics.lemma == word_stat.lemma,
                WordStatistics.pos == word_stat.pos
            )
        )
    )
    existing = result.scalar_one_or_none()

    if existing:
        raise HTTPException(status_code=400, detail="Word statistics already exists")

    db_word_stat = WordStatistics(**word_stat.model_dump())
    db.add(db_word_stat)
    await db.commit()
    await db.refresh(db_word_stat)
    return db_word_stat


@router.get("/global/", response_model=WordStatisticsListResponse)
async def list_word_statistics(
        skip: int = Query(0, ge=0),
        limit: int = Query(100, ge=1, le=1000),
        search: Optional[str] = Query(None, description="Search by lemma"),
        min_frequency: Optional[int] = Query(None, ge=0),
        pos: Optional[str] = Query(None, description="Filter by part of speech"),
        db: AsyncSession = Depends(get_db)
):
    query = select(WordStatistics)

    if search:
        query = query.where(WordStatistics.lemma.ilike(f"%{search}%"))

    if min_frequency:
        query = query.where(WordStatistics.total_frequency >= min_frequency)

    if pos:
        query = query.where(WordStatistics.pos == pos)

    count_query = select(func.count()).select_from(query.subquery())
    total_result = await db.execute(count_query)
    total = total_result.scalar()

    query = query.order_by(WordStatistics.total_frequency.desc()).offset(skip).limit(limit)

    result = await db.execute(query)
    items = result.scalars().all()

    return WordStatisticsListResponse(
        items=items,
        total=total,
        skip=skip,
        limit=limit
    )


@router.put("/global/{stat_id}", response_model=WordStatisticsResponse)
async def update_word_statistics(
        stat_id: int,
        stat_update: WordStatisticsUpdate,
        db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(WordStatistics).where(WordStatistics.id == stat_id)
    )
    stat = result.scalar_one_or_none()

    if not stat:
        raise HTTPException(status_code=404, detail="Word statistics not found")

    update_data = stat_update.model_dump(exclude_unset=True)
    if update_data:
        update_data["last_updated"] = datetime.utcnow()
        for field, value in update_data.items():
            setattr(stat, field, value)

    await db.commit()
    await db.refresh(stat)
    return stat


@router.delete("/global/{stat_id}", status_code=204)
async def delete_word_statistics(
        stat_id: int,
        db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(WordStatistics).where(WordStatistics.id == stat_id)
    )
    stat = result.scalar_one_or_none()

    if not stat:
        raise HTTPException(status_code=404, detail="Word statistics not found")

    await db.delete(stat)
    await db.commit()
    return None


@router.get("/document/", response_model=DocumentWordStatsListResponse)
async def list_document_word_stats(
        skip: int = Query(0, ge=0),
        limit: int = Query(100, ge=1, le=1000),
        doc_id: Optional[int] = Query(None, description="Filter by document ID"),
        lemma: Optional[str] = Query(None, description="Filter by lemma"),
        pos: Optional[str] = Query(None, description="Filter by part of speech"),
        min_tfidf: Optional[float] = Query(None, ge=0, le=1),
        db: AsyncSession = Depends(get_db)
):
    query = select(DocumentWordStats)

    if doc_id:
        query = query.where(DocumentWordStats.doc_id == doc_id)

    if lemma:
        query = query.where(DocumentWordStats.lemma == lemma)

    if pos:
        query = query.where(DocumentWordStats.pos == pos)

    if min_tfidf:
        query = query.where(DocumentWordStats.tfidf >= min_tfidf)

    count_query = select(func.count()).select_from(query.subquery())
    total_result = await db.execute(count_query)
    total = total_result.scalar()

    query = query.order_by(DocumentWordStats.frequency.desc()).offset(skip).limit(limit)

    result = await db.execute(query)
    items = result.scalars().all()

    return DocumentWordStatsListResponse(
        items=items,
        total=total,
        skip=skip,
        limit=limit
    )