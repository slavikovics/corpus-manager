from pydantic import BaseModel, ConfigDict
from typing import List, Optional
from datetime import datetime


class WordStatisticsBase(BaseModel):
    lemma: str
    pos: Optional[str] = None
    total_frequency: int = 0

class WordStatisticsCreate(WordStatisticsBase):
    pass


class WordStatisticsUpdate(BaseModel):
    total_frequency: Optional[int] = None
    last_updated: Optional[datetime] = None


class WordStatisticsResponse(WordStatisticsBase):
    id: int
    last_updated: datetime

    model_config = ConfigDict(from_attributes=True)


class WordStatisticsListResponse(BaseModel):
    items: List[WordStatisticsResponse]
    total: int
    skip: int
    limit: int


class DocumentWordStatsBase(BaseModel):
    doc_id: int
    lemma: str
    pos: Optional[str] = None
    frequency: int = 0
    tfidf: Optional[float] = None


class DocumentWordStatsCreate(DocumentWordStatsBase):
    pass


class DocumentWordStatsUpdate(BaseModel):
    frequency: Optional[int] = None
    tfidf: Optional[float] = None


class DocumentWordStatsResponse(DocumentWordStatsBase):
    model_config = ConfigDict(from_attributes=True)


class DocumentWordStatsListResponse(BaseModel):
    items: List[DocumentWordStatsResponse]
    total: int
    skip: int
    limit: int