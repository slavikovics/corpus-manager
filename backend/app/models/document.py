from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, Dict, Any, Union
from datetime import datetime


class DocumentBase(BaseModel):
    title: str
    author: Optional[str] = None
    year: Optional[int] = None
    language: str = "en"


class DocumentInDB(DocumentBase):
    id: int
    source_file: str
    file_type: str
    word_count: int
    created_at: datetime
    updated_at: datetime
    model_config = ConfigDict(from_attributes=True)


class DocumentResponse(DocumentInDB):
    pass