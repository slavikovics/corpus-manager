from pydantic import BaseModel
from enum import Enum
from typing import Optional, List, Dict, Any


class SearchType(str, Enum):
    EXACT = "exact"
    FUZZY = "fuzzy"
    NGRAM = "ngram"


class SearchQuery(BaseModel):
    query: str
    search_type: SearchType = SearchType.NGRAM
    field: str = "word.ngrams"
    page: int = 1
    page_size: int = 50


class SearchResult(BaseModel):
    doc_id: int
    word: str
    lemma: str
    pos: str
    left_context: str
    right_context: str
    metadata: Optional[Dict[str, Any]] = None


class SearchResponse(BaseModel):
    total: int
    page: int
    page_size: int
    results: List[SearchResult]


class ConcordanceResponse(BaseModel):
    total: int
    page: int
    page_size: int
    results: List[dict]


class UploadResponse(BaseModel):
    filename: str
    document_id: int
    word_count: int
    processing_time: float