from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import PostgresDsn, field_validator
from typing import Optional, List
import os


class Settings(BaseSettings):
    APP_NAME: str = "Corpus Manager"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = True
    SECRET_KEY: str = "dev-secret-key-change-in-production"
    DATABASE_URL: PostgresDsn = "postgresql://corpus:corpus_password@postgres:5432/corpus_db"
    
    @field_validator("DATABASE_URL", mode="before")
    @classmethod
    def validate_database_url(cls, v):
        if isinstance(v, str):
            return v
        return str(v)
    
    ELASTICSEARCH_URL: str = "http://elasticsearch:9200"
    ELASTICSEARCH_INDEX: str = "corpus_words"
    
    UPLOAD_DIR: str = "/uploads"
    MAX_FILE_SIZE: int = 50 * 1024 * 1024    
    SPACY_MODEL: str = "en_core_web_md"
    BATCH_SIZE: int = 1000
    
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore"
    )


settings = Settings()