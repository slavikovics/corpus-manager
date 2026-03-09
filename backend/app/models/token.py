from typing import Optional, List, Dict
from pydantic import BaseModel


class TokenBasicResponse(BaseModel):
    doc_id: int
    position: int
    word: str
    lemma: str
    pos: str
    sentence_id: int
    is_punctuation: Optional[bool] = None
    is_stopword: Optional[bool] = None

    class Config:
        from_attributes = True


class TokenDetailResponse(TokenBasicResponse):
    morph: Optional[Dict] = None
    dep: Optional[str] = None
    head: Optional[str] = None
    left_context: Optional[str] = None
    right_context: Optional[str] = None


class TokenListResponse(BaseModel):
    items: List[TokenBasicResponse]
    total: int
    skip: int
    limit: int


class TokenPosAggregationResponse(BaseModel):
    pos: str
    count: int


class TokenPosListResponse(BaseModel):
    items: List[TokenPosAggregationResponse]
    total: int