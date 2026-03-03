from pydantic import BaseModel
from typing import Optional, Dict, Any


class Token(BaseModel):
    doc_id: int
    position: int
    sentence_id: int
    word: str
    lemma: str
    pos: str
    tag: str
    is_punctuation: bool
    is_stopword: bool
    left_context: str
    right_context: str
    metadata: Optional[Dict[str, Any]] = None


class ConcordanceResult(BaseModel):
    doc_id: int
    position: int
    word: str
    lemma: str
    pos: str
    left_context: str
    right_context: str
    metadata: Optional[Dict[str, Any]] = None
    highlight: Optional[Dict[str, Any]] = None


class WordStatisticsResponse(BaseModel):
    lemma: str
    total_frequency: int
    by_pos: Dict[str, int]
    by_document: list