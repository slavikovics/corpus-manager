from pydantic import BaseModel, ConfigDict
from typing import List, Optional, Any, Dict
from datetime import datetime


class DocumentBase(BaseModel):
    title: str
    author: Optional[str] = None
    year: Optional[int] = None
    language: str = "en"
    source_file: str
    file_type: str
    meta_info: Optional[Dict[str, Any]] = None
    word_count: int = 0


class DocumentCreate(DocumentBase):
    pass


class DocumentUpdate(BaseModel):
    title: Optional[str] = None
    author: Optional[str] = None
    year: Optional[int] = None
    language: Optional[str] = None
    source_file: Optional[str] = None
    file_type: Optional[str] = None
    meta_info: Optional[Dict[str, Any]] = None
    word_count: Optional[int] = None


class DocumentResponse(DocumentBase):
    id: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class DocumentListResponse(BaseModel):
    items: List[DocumentResponse]
    total: int
    skip: int
    limit: int


class LemmaStatsBase(BaseModel):
    lemma: str
    pos: Optional[str] = None
    total_frequency: int = 0


class LemmaStatsCreate(LemmaStatsBase):
    pass


class LemmaStatsUpdate(BaseModel):
    total_frequency: Optional[int] = None
    last_updated: Optional[datetime] = None


class LemmaStatsResponse(LemmaStatsBase):
    id: int
    last_updated: datetime

    model_config = ConfigDict(from_attributes=True)


class LemmaStatsListResponse(BaseModel):
    items: List[LemmaStatsResponse]
    total: int
    skip: int
    limit: int


class WordFormStatsBase(BaseModel):
    word: str
    pos: Optional[str] = None
    total_frequency: int = 0


class WordFormStatsCreate(WordFormStatsBase):
    pass


class WordFormStatsUpdate(BaseModel):
    total_frequency: Optional[int] = None
    last_updated: Optional[datetime] = None


class WordFormStatsResponse(WordFormStatsBase):
    id: int
    last_updated: datetime

    model_config = ConfigDict(from_attributes=True)


class WordFormStatsListResponse(BaseModel):
    items: List[WordFormStatsResponse]
    total: int
    skip: int
    limit: int


class DocumentLemmaStatsBase(BaseModel):
    doc_id: int
    lemma: str
    pos: Optional[str] = None
    frequency: int = 0
    tfidf: Optional[float] = None


class DocumentLemmaStatsCreate(DocumentLemmaStatsBase):
    pass


class DocumentLemmaStatsUpdate(BaseModel):
    frequency: Optional[int] = None
    tfidf: Optional[float] = None


class DocumentLemmaStatsResponse(DocumentLemmaStatsBase):
    model_config = ConfigDict(from_attributes=True)


class DocumentLemmaStatsListResponse(BaseModel):
    items: List[DocumentLemmaStatsResponse]
    total: int
    skip: int
    limit: int


class DocumentWordFormStatsBase(BaseModel):
    doc_id: int
    word: str
    pos: Optional[str] = None
    frequency: int = 0
    tfidf: Optional[float] = None


class DocumentWordFormStatsCreate(DocumentWordFormStatsBase):
    pass


class DocumentWordFormStatsUpdate(BaseModel):
    frequency: Optional[int] = None
    tfidf: Optional[float] = None


class DocumentWordFormStatsResponse(DocumentWordFormStatsBase):
    model_config = ConfigDict(from_attributes=True)


class DocumentWordFormStatsListResponse(BaseModel):
    items: List[DocumentWordFormStatsResponse]
    total: int
    skip: int
    limit: int


class TokenBase(BaseModel):
    doc_id: int
    position: int
    sentence_id: Optional[int] = None
    word: Optional[str] = None
    lemma: Optional[str] = None
    pos: Optional[str] = None
    morph: Optional[str] = None
    dep: Optional[str] = None
    head: Optional[str] = None
    is_punctuation: Optional[bool] = None
    is_stopword: Optional[bool] = None
    left_context: Optional[str] = None
    right_context: Optional[str] = None


class TokenCreate(TokenBase):
    pass


class TokenUpdate(BaseModel):
    sentence_id: Optional[int] = None
    word: Optional[str] = None
    lemma: Optional[str] = None
    pos: Optional[str] = None
    morph: Optional[str] = None
    dep: Optional[str] = None
    head: Optional[str] = None
    is_punctuation: Optional[bool] = None
    is_stopword: Optional[bool] = None
    left_context: Optional[str] = None
    right_context: Optional[str] = None


class TokenResponse(TokenBase):
    model_config = ConfigDict(from_attributes=True)


class TokenListResponse(BaseModel):
    items: List[TokenResponse]
    total: int
    skip: int
    limit: int