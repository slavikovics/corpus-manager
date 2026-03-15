from fastapi import APIRouter, HTTPException, Depends, Query
from sqlalchemy import select, func, and_, or_
from sqlalchemy.ext.asyncio import AsyncSession
from ...models.sentence import *
from ...core.database import get_db, Token, Document, Sentence

router = APIRouter(prefix="/sentences", tags=["sentences"])


@router.get("/", response_model=SentenceListResponse)
async def list_sentences(
        skip: int = Query(0, ge=0),
        limit: int = Query(100, ge=1, le=1000),
        doc_id: Optional[int] = Query(None, description="Filter by document ID"),
        search_text: Optional[str] = Query(None, description="Search in sentence text"),
        min_tokens: Optional[int] = Query(None, ge=1, description="Minimum number of tokens in sentence"),
        max_tokens: Optional[int] = Query(None, ge=1, description="Maximum number of tokens in sentence"),
        include_document_metadata: bool = Query(True, description="Include document metadata"),
        db: AsyncSession = Depends(get_db)
):
    query = select(Sentence)

    if doc_id is not None:
        query = query.where(Sentence.doc_id == doc_id)

    if search_text is not None:
        query = query.where(Sentence.text.ilike(f"%{search_text}%"))

    if min_tokens is not None:
        query = query.where(Sentence.token_count >= min_tokens)

    if max_tokens is not None:
        query = query.where(Sentence.token_count <= max_tokens)

    count_query = select(func.count()).select_from(query.subquery())
    total_result = await db.execute(count_query)
    total = total_result.scalar()

    query = query.order_by(Sentence.doc_id, Sentence.sentence_id).offset(skip).limit(limit)

    result = await db.execute(query)
    sentences = result.scalars().all()

    sentence_responses = []
    for sentence in sentences:
        document = None
        if include_document_metadata:
            doc_result = await db.execute(
                select(Document).where(Document.id == sentence.doc_id)
            )
            doc = doc_result.scalar_one_or_none()
            if doc:
                document = DocumentInDB.model_validate(doc)

        sentence_responses.append(
            SentenceResponse(
                id=sentence.id,
                doc_id=sentence.doc_id,
                sentence_id=sentence.sentence_id,
                document_title=document.title if document else None,
                document=document,
                start_position=sentence.start_position,
                end_position=sentence.end_position,
                token_count=sentence.token_count,
                text=sentence.text,
                created_at=sentence.created_at
            )
        )

    return SentenceListResponse(
        items=sentence_responses,
        total=total,
        skip=skip,
        limit=limit
    )


@router.get("/{doc_id}/{sentence_id}", response_model=SentenceDetailResponse)
async def get_sentence_detail(
        doc_id: int,
        sentence_id: int,
        include_context: bool = Query(False, description="Include surrounding context"),
        context_size: int = Query(5, ge=1, le=20, description="Number of context tokens"),
        db: AsyncSession = Depends(get_db)
):
    sentence_query = select(Sentence).where(
        and_(
            Sentence.doc_id == doc_id,
            Sentence.sentence_id == sentence_id
        )
    )

    sentence_result = await db.execute(sentence_query)
    sentence = sentence_result.scalar_one_or_none()

    if not sentence:
        raise HTTPException(
            status_code=404,
            detail=f"Sentence with doc_id={doc_id} and sentence_id={sentence_id} not found"
        )

    doc_result = await db.execute(
        select(Document).where(Document.id == doc_id)
    )
    doc = doc_result.scalar_one_or_none()
    document = DocumentInDB.model_validate(doc) if doc else None

    token_query = select(Token).where(
        and_(
            Token.doc_id == doc_id,
            Token.sentence_id == sentence_id
        )
    ).order_by(Token.position)

    token_result = await db.execute(token_query)
    tokens = token_result.scalars().all()

    token_responses = [TokenDetailResponse.model_validate(t) for t in tokens]

    response = SentenceDetailResponse(
        id=sentence.id,
        doc_id=sentence.doc_id,
        sentence_id=sentence.sentence_id,
        document_title=document.title if document else None,
        document=document,
        start_position=sentence.start_position,
        end_position=sentence.end_position,
        token_count=sentence.token_count,
        text=sentence.text,
        created_at=sentence.created_at,
        tokens=token_responses
    )

    if include_context and context_size > 0:
        before_query = select(Token).where(
            and_(
                Token.doc_id == doc_id,
                Token.position < sentence.start_position,
                Token.sentence_id != sentence_id
            )
        ).order_by(Token.position.desc()).limit(context_size)

        before_result = await db.execute(before_query)
        before_tokens = before_result.scalars().all()

        after_query = select(Token).where(
            and_(
                Token.doc_id == doc_id,
                Token.position > sentence.end_position,
                Token.sentence_id != sentence_id
            )
        ).order_by(Token.position).limit(context_size)

        after_result = await db.execute(after_query)
        after_tokens = after_result.scalars().all()

        response_dict = response.model_dump()
        response_dict["context_before"] = [TokenDetailResponse.model_validate(t) for t in before_tokens]
        response_dict["context_after"] = [TokenDetailResponse.model_validate(t) for t in after_tokens]
        return response_dict

    return response


@router.get("/{doc_id}/{sentence_id}/plain")
async def get_sentence_plain_text(
        doc_id: int,
        sentence_id: int,
        db: AsyncSession = Depends(get_db)
):
    sentence_query = select(Sentence).where(
        and_(
            Sentence.doc_id == doc_id,
            Sentence.sentence_id == sentence_id
        )
    )

    sentence_result = await db.execute(sentence_query)
    sentence = sentence_result.scalar_one_or_none()

    if not sentence:
        raise HTTPException(
            status_code=404,
            detail=f"Sentence with doc_id={doc_id} and sentence_id={sentence_id} not found"
        )

    return {
        "doc_id": doc_id,
        "sentence_id": sentence_id,
        "text": sentence.text or "Text not available",
        "token_count": sentence.token_count
    }


@router.get("/search/by_word/{word}")
async def search_sentences_by_word(
        word: str,
        doc_id: Optional[int] = Query(None),
        case_sensitive: bool = Query(False),
        limit: int = Query(50, ge=1, le=200),
        db: AsyncSession = Depends(get_db)
):
    word_filter = Token.word == word if case_sensitive else Token.word.ilike(f"%{word}%")

    query = select(
        Token.doc_id,
        Token.sentence_id
    ).where(word_filter).distinct()

    if doc_id is not None:
        query = query.where(Token.doc_id == doc_id)

    query = query.order_by(Token.doc_id, Token.sentence_id).limit(limit)

    result = await db.execute(query)
    sentence_keys = result.all()

    sentences = []
    for doc_id_val, sentence_id_val in sentence_keys:
        sentence_query = select(Sentence).where(
            and_(
                Sentence.doc_id == doc_id_val,
                Sentence.sentence_id == sentence_id_val
            )
        )

        sentence_result = await db.execute(sentence_query)
        sentence = sentence_result.scalar_one_or_none()

        if not sentence:
            continue

        doc_result = await db.execute(
            select(Document).where(Document.id == doc_id_val)
        )
        doc = doc_result.scalar_one_or_none()
        document = DocumentInDB.model_validate(doc) if doc else None

        pos_query = select(Token.position).where(
            and_(
                Token.doc_id == doc_id_val,
                Token.sentence_id == sentence_id_val,
                word_filter
            )
        )

        pos_result = await db.execute(pos_query)
        positions = pos_result.scalars().all()

        sentences.append(
            SentenceSearchResponse(
                doc_id=doc_id_val,
                sentence_id=sentence_id_val,
                document_title=document.title if document else None,
                document=document,
                text=sentence.text,
                matching_positions=positions
            )
        )

    return {
        "search_word": word,
        "total_sentences": len(sentences),
        "sentences": sentences
    }