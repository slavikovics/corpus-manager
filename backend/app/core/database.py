from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker, declarative_base
from sqlalchemy import Column, Integer, String, DateTime, JSON, Text, Float, MetaData, UniqueConstraint
import datetime
from .config import settings

db_url = str(settings.DATABASE_URL).replace("postgresql://", "postgresql+asyncpg://")
engine = create_async_engine(
    db_url,
    echo=settings.DEBUG,
    future=True,
    pool_size=20,
    max_overflow=10
)

AsyncSessionLocal = sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False
)

Base = declarative_base()
db_metadata = MetaData()

class Document(Base):
    __tablename__ = "documents"
    
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(500), nullable=False)
    author = Column(String(255), nullable=True)
    year = Column(Integer, nullable=True)
    language = Column(String(10), default="en")
    source_file = Column(String(1000))
    file_type = Column(String(50))
    meta_info = Column(JSON, nullable=True)
    word_count = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)


class WordStatistics(Base):
    __tablename__ = "word_statistics"
    __table_args__ = (
        UniqueConstraint('lemma', 'pos', name='uq_word_statistics_lemma_pos'),
    )

    id = Column(Integer, primary_key=True, index=True)
    lemma = Column(String(255), nullable=False, index=True)
    pos = Column(String(50), nullable=True)
    total_frequency = Column(Integer, default=0)
    last_updated = Column(DateTime, default=datetime.datetime.utcnow)


class DocumentWordStats(Base):
    __tablename__ = "document_word_stats"

    doc_id = Column(Integer, primary_key=True)
    lemma = Column(String(255), primary_key=True)
    pos = Column(String(50), primary_key=True)
    frequency = Column(Integer, default=0)
    tfidf = Column(Float, nullable=True)


async def get_db() -> AsyncSession:
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()