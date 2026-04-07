from fastapi import APIRouter, HTTPException, Depends, Query
from sqlalchemy import select, func, and_, or_
from sqlalchemy.ext.asyncio import AsyncSession
from ...models.sentence import *
from ...core.database import get_db, Token, Document, Sentence
from ...services.openrouter.openrouter_service import OpenRouterService
from ...models.semantics import SemanticAnalysisResponse

router = APIRouter(prefix="/semantics", tags=["semantics"])

@router.get("/{doc_id}/{sentence_id}", response_model=SemanticAnalysisResponse)
async def get_sentence_semantic_analysis(
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
    
    open_router_service = OpenRouterService()
    response = await open_router_service.analyze_with_default_prompts(sentence.text)
    return response