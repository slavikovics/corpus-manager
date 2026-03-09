from fastapi import APIRouter, HTTPException, Depends, Query
from sqlalchemy import select, func, and_
from sqlalchemy.ext.asyncio import AsyncSession
from ...models.token import *
from ...core.database import get_db, Token

router = APIRouter(prefix="/tokens", tags=["tokens"])


@router.get("/", response_model=TokenListResponse)
async def list_tokens(
        skip: int = Query(0, ge=0),
        limit: int = Query(100, ge=1, le=1000),
        doc_id: Optional[int] = Query(None, description="Filter by document ID"),
        pos: Optional[str] = Query(None, description="Filter by part of speech"),
        search_word: Optional[str] = Query(None, description="Search by word"),
        search_lemma: Optional[str] = Query(None, description="Search by lemma"),
        sentence_id: Optional[int] = Query(None, description="Filter by sentence ID"),
        is_punctuation: Optional[bool] = Query(None, description="Filter punctuation tokens"),
        is_stopword: Optional[bool] = Query(None, description="Filter stopwords"),
        db: AsyncSession = Depends(get_db)
):
    query = select(Token)

    if doc_id is not None:
        query = query.where(Token.doc_id == doc_id)

    if pos is not None:
        query = query.where(Token.pos == pos)

    if search_word is not None:
        query = query.where(Token.word.ilike(f"%{search_word}%"))

    if search_lemma is not None:
        query = query.where(Token.lemma.ilike(f"%{search_lemma}%"))

    if sentence_id is not None:
        query = query.where(Token.sentence_id == sentence_id)

    if is_punctuation is not None:
        query = query.where(Token.is_punctuation == is_punctuation)

    if is_stopword is not None:
        query = query.where(Token.is_stopword == is_stopword)

    count_query = select(func.count()).select_from(query.subquery())
    total_result = await db.execute(count_query)
    total = total_result.scalar()

    query = query.order_by(Token.doc_id, Token.position).offset(skip).limit(limit)

    result = await db.execute(query)
    items = result.scalars().all()

    return TokenListResponse(
        items=items,
        total=total,
        skip=skip,
        limit=limit
    )


@router.get("/{doc_id}/{position}", response_model=TokenDetailResponse)
async def get_token_detail(
        doc_id: int,
        position: int,
        db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(Token).where(
            and_(
                Token.doc_id == doc_id,
                Token.position == position
            )
        )
    )
    token = result.scalar_one_or_none()

    if not token:
        raise HTTPException(
            status_code=404,
            detail=f"Token with doc_id={doc_id} and position={position} not found"
        )

    return token


@router.get("/pos", response_model=TokenPosListResponse)
async def aggregate_tokens_by_pos(
        db: AsyncSession = Depends(get_db)
):
    total_result = await db.execute(
        select(func.count()).select_from(Token)
    )
    total_tokens = total_result.scalar()

    pos_result = await db.execute(
        select(
            Token.pos,
            func.count().label('count')
        )
        .where(Token.pos.isnot(None))
        .group_by(Token.pos)
        .order_by(func.count().desc())
    )
    pos_distribution = [TokenPosAggregationResponse(pos=row[0], count=int(row[1])) for row in pos_result.all()]

    return TokenPosListResponse(
        items=pos_distribution,
        total=total_tokens
    )


@router.get("/document/{doc_id}/stats")
async def get_document_token_stats(
        doc_id: int,
        db: AsyncSession = Depends(get_db)
):
    from ...core.database import Document
    doc_result = await db.execute(
        select(Document).where(Document.id == doc_id)
    )
    doc = doc_result.scalar_one_or_none()

    if not doc:
        raise HTTPException(status_code=404, detail=f"Document with id={doc_id} not found")

    total_result = await db.execute(
        select(func.count()).where(Token.doc_id == doc_id)
    )
    total_tokens = total_result.scalar()

    unique_result = await db.execute(
        select(func.count(func.distinct(Token.lemma)))
        .where(Token.doc_id == doc_id)
    )
    unique_tokens = unique_result.scalar()

    pos_result = await db.execute(
        select(
            Token.pos,
            func.count().label('count')
        )
        .where(and_(Token.doc_id == doc_id, Token.pos.isnot(None)))
        .group_by(Token.pos)
        .order_by(func.count().desc())
    )
    pos_distribution = [{"pos": row[0], "count": row[1]} for row in pos_result.all()]

    punctuation_result = await db.execute(
        select(func.count()).where(
            and_(Token.doc_id == doc_id, Token.is_punctuation == True)
        )
    )
    punctuation_count = punctuation_result.scalar()

    stopword_result = await db.execute(
        select(func.count()).where(
            and_(Token.doc_id == doc_id, Token.is_stopword == True)
        )
    )
    stopword_count = stopword_result.scalar()

    return {
        "doc_id": doc_id,
        "total_tokens": total_tokens,
        "unique_tokens": unique_tokens,
        "punctuation_count": punctuation_count,
        "stopword_count": stopword_count,
        "pos_distribution": pos_distribution
    }