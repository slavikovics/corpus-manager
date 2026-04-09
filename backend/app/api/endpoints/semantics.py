from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import and_, func, or_, select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession

from ...core.database import (
    Document,
    Sentence,
    SentenceSemanticAnalysis,
    Token,
    get_db,
)
from ...models.semantics import SemanticAnalysisResponse
from ...models.sentence import *
from ...services.semantic_analysis.semantic_analysis import OpenAIService

router = APIRouter(prefix="/semantics", tags=["semantics"])


async def upsert_semantic_analysis(db, doc_id, sentence_id, response):
    stmt = insert(SentenceSemanticAnalysis).values(
        doc_id=doc_id,
        sentence_id=sentence_id,
        analysis=response.model_dump(),
    )

    stmt = stmt.on_conflict_do_update(
        index_elements=["doc_id", "sentence_id"],
        set_={"analysis": response.model_dump()},
    )

    await db.execute(stmt)
    await db.commit()


@router.get("/{doc_id}/{sentence_id}", response_model=SemanticAnalysisResponse)
async def get_sentence_semantic_analysis(
    doc_id: int,
    sentence_id: int,
    model_name: str = Query("deepseek/deepseek-v3.2"),
    force_refresh: bool = Query(False),
    db: AsyncSession = Depends(get_db),
):
    if not force_refresh:
        cached_query = select(SentenceSemanticAnalysis).where(
            and_(
                SentenceSemanticAnalysis.doc_id == doc_id,
                SentenceSemanticAnalysis.sentence_id == sentence_id,
            )
        )

        cached_result = await db.execute(cached_query)
        cached = cached_result.scalar_one_or_none()

        if cached:
            return SemanticAnalysisResponse.model_validate(cached.analysis)

    sentence_query = select(Sentence).where(
        and_(Sentence.doc_id == doc_id, Sentence.sentence_id == sentence_id)
    )
    sentence_result = await db.execute(sentence_query)
    sentence = sentence_result.scalar_one_or_none()

    if not sentence:
        raise HTTPException(
            status_code=404,
            detail=f"Sentence with doc_id={doc_id} and sentence_id={sentence_id} not found",
        )

    semantic_analysis_service = OpenAIService(model=model_name)
    response: SemanticAnalysisResponse = (
        await semantic_analysis_service.analyze_with_default_prompts(sentence.text)
    )

    await upsert_semantic_analysis(db, doc_id, sentence_id, response)

    return response
