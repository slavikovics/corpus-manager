from typing import Optional, List, Dict
from pydantic import BaseModel, ConfigDict
from .document import DocumentInDB
from .token import TokenDetailResponse
import datetime


class SentenceResponse(BaseModel):
    id: int
    doc_id: int
    sentence_id: int
    document_title: Optional[str] = None
    document: Optional[DocumentInDB] = None
    start_position: int
    end_position: int
    token_count: int
    text: Optional[str] = None
    created_at: Optional[datetime.datetime] = None

    model_config = ConfigDict(from_attributes=True)


class SentenceListResponse(BaseModel):
    items: List[SentenceResponse]
    total: int
    skip: int
    limit: int

    model_config = ConfigDict(from_attributes=True)


class SentenceDetailResponse(SentenceResponse):
    tokens: List[TokenDetailResponse]

    model_config = ConfigDict(from_attributes=True)


class SentenceSearchResponse(BaseModel):
    doc_id: int
    sentence_id: int
    document_title: Optional[str] = None
    document: Optional[DocumentInDB] = None
    text: Optional[str] = None
    matching_positions: List[int]
    context_before: Optional[List[TokenDetailResponse]] = None
    context_after: Optional[List[TokenDetailResponse]] = None

    model_config = ConfigDict(from_attributes=True)