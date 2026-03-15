from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker, declarative_base, relationship
from sqlalchemy import Column, Integer, String, DateTime, JSON, Text, Float, MetaData, UniqueConstraint, Boolean, \
    ForeignKey
import datetime
from .config import settings
import logging
from enum import Enum

logger = logging.getLogger(__name__)
db_url = str(settings.DATABASE_URL).replace("postgresql://", "postgresql+asyncpg://")

engine = create_async_engine(
    db_url,
    echo=settings.DEBUG,
    future=True,
    pool_size=20,
    max_overflow=10,
    pool_pre_ping=True,
    pool_timeout=30,
    pool_recycle=3600,
    pool_use_lifo=True
)

AsyncSessionLocal = sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False
)

Base = declarative_base()
db_metadata = MetaData()


class ProcessingStatus(str, Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"


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
    processing_status = Column(String(50), default=ProcessingStatus.PENDING)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    tokens = relationship("Token", back_populates="document", cascade="all, delete-orphan")
    sentences = relationship("Sentence", back_populates="document", cascade="all, delete-orphan")


class LemmaStats(Base):
    __tablename__ = "lemma_stats"
    __table_args__ = (
        UniqueConstraint('lemma', 'pos', name='uq_lemma_stats_lemma_pos'),
    )

    id = Column(Integer, primary_key=True, index=True)
    lemma = Column(String(255), nullable=False, index=True)
    pos = Column(String(50), nullable=True)
    total_frequency = Column(Integer, default=0)
    last_updated = Column(DateTime, default=datetime.datetime.now)


class WordFormStats(Base):
    __tablename__ = "word_form_stats"
    __table_args__ = (
        UniqueConstraint('word', 'pos', name='uq_word_form_stats_lemma_pos'),
    )

    id = Column(Integer, primary_key=True, index=True)
    word = Column(String(255), nullable=False, index=True)
    pos = Column(String(50), nullable=True)
    total_frequency = Column(Integer, default=0)
    last_updated = Column(DateTime, default=datetime.datetime.now)


class DocumentLemmaStats(Base):
    __tablename__ = "document_lemma_stats"
    __table_args__ = (
        UniqueConstraint('doc_id', 'lemma', 'pos', name='uq_doc_lemma_stats'),
    )

    doc_id = Column(Integer, ForeignKey('documents.id', ondelete='CASCADE'), primary_key=True)
    lemma = Column(String(255), primary_key=True)
    pos = Column(String(50), primary_key=True)
    frequency = Column(Integer, default=0)


class DocumentWordFormStats(Base):
    __tablename__ = "document_word_form_stats"
    __table_args__ = (
        UniqueConstraint('doc_id', 'word', 'pos', name='uq_doc_word_form_stats'),
    )

    doc_id = Column(Integer, ForeignKey('documents.id', ondelete='CASCADE'), primary_key=True)
    word = Column(String(255), primary_key=True)
    pos = Column(String(50), primary_key=True)
    frequency = Column(Integer, default=0)


class Token(Base):
    __tablename__ = "tokens"
    __table_args__ = (
        UniqueConstraint('doc_id', 'position', name='uq_doc_position'),
    )

    doc_id = Column(Integer, ForeignKey('documents.id', ondelete='CASCADE'), primary_key=True, nullable=False, index=True)
    position = Column(Integer, primary_key=True, index=True)
    sentence_id = Column(Integer, index=True)
    word = Column(String(255))
    lemma = Column(String(255))
    pos = Column(String(50))
    morph = Column(JSON, nullable=True)
    dep = Column(String(255), nullable=True)
    head = Column(String(255), nullable=True)
    is_punctuation = Column(Boolean, nullable=True)
    is_stopword = Column(Boolean, nullable=True)
    left_context = Column(String(510), nullable=True)
    right_context = Column(String(510), nullable=True)

    document = relationship("Document", back_populates="tokens")
    sentence = relationship("Sentence", back_populates="tokens",
                            foreign_keys="[Token.doc_id, Token.sentence_id]",
                            primaryjoin="and_(Token.doc_id == Sentence.doc_id, Token.sentence_id == Sentence.sentence_id)")


class Sentence(Base):
    __tablename__ = "sentences"
    __table_args__ = (
        UniqueConstraint('doc_id', 'sentence_id', name='uq_doc_sentence'),
    )

    id = Column(Integer, primary_key=True, index=True)
    doc_id = Column(Integer, ForeignKey('documents.id', ondelete='CASCADE'), nullable=False, index=True)
    sentence_id = Column(Integer, nullable=False, index=True)
    start_position = Column(Integer, nullable=False)
    end_position = Column(Integer, nullable=False)
    token_count = Column(Integer, nullable=False, default=0)
    text = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.now())

    document = relationship("Document", back_populates="sentences")
    tokens = relationship("Token", back_populates="sentence",
                          foreign_keys="[Token.doc_id, Token.sentence_id]",
                          primaryjoin="and_(Token.doc_id == Sentence.doc_id, Token.sentence_id == Sentence.sentence_id)")


async def get_db() -> AsyncSession:
    session = AsyncSessionLocal()
    try:
        logger.debug("Database session created")
        yield session
    except Exception as e:
        logger.error(f"Database session error: {e}")
        await session.rollback()
        raise
    finally:
        await session.close()
        logger.debug("Database session closed")


class DatabaseSession:
    async def __aenter__(self) -> AsyncSession:
        self.session = AsyncSessionLocal()
        return self.session

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        if exc_type is not None:
            await self.session.rollback()
        await self.session.close()


async def check_pool_status():
    pool = engine.pool
    logger.info(f"Pool status: size={pool.size()}, checked_in={pool.checkedin()}, overflow={pool.overflow()}")
