from pydantic import BaseModel
from typing import Optional, List, Dict, Any


class SearchResult(BaseModel):
    doc_id: int
    word: str
    lemma: Optional[str] = ""
    pos: Optional[str] = ""
    left_context: Optional[str] = ""
    right_context: Optional[str] = ""
    metadata: Optional[Dict[str, Any]] = {}
    score: Optional[float] = 0.0
    position_start: Optional[int] = None
    position_end: Optional[int] = None


class SearchResponse(BaseModel):
    total: int
    page: int
    page_size: int
    results: List[SearchResult]
    query: Optional[str] = None
    mode: Optional[str] = None
    search_type: Optional[str] = None
    slop: Optional[int] = None
    fuzziness: Optional[str] = None


class DocumentStat(BaseModel):
    doc_id: int
    frequency: int
    contexts: List[Dict[str, str]] = []


class PosStat(BaseModel):
    pos: str
    count: int
    documents: int


class WordStatisticsResponse(BaseModel):
    lemma: str
    total_frequency: int
    document_count: int
    by_pos: List[PosStat] = []
    by_document: List[DocumentStat] = []
    total_count: Optional[Dict[str, int]] = None
    by_document_agg: Optional[Dict[str, Any]] = None
    by_pos_agg: Optional[Dict[str, Any]] = None


class UploadResponse(BaseModel):
    filename: str
    document_id: int
    word_count: int
    processing_time: float