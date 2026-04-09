from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import and_, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from ...core.database import Document, Sentence, Token, get_db
from ...models.semantics import SemanticAnalysisResponse
from ...models.sentence import *
from ...services.semantic_analysis.semantic_analysis import OpenAIService

router = APIRouter(prefix="/semantics", tags=["semantics"])


@router.get("/{doc_id}/{sentence_id}", response_model=SemanticAnalysisResponse)
async def get_sentence_semantic_analysis(
    doc_id: int, sentence_id: int, db: AsyncSession = Depends(get_db)
):
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

    semantic_analysis_service = OpenAIService()
    response = await semantic_analysis_service.analyze_with_default_prompts(
        sentence.text
    )
    return response
