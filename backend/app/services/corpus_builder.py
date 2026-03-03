from typing import List, Dict, Any, Optional
import logging
from datetime import datetime
import asyncio
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, insert, update

from ..core.database import Document, WordStatistics, DocumentWordStats
from ..core.elastic import es_client
from ..services.text_processor import text_processor
from ..services.file_handlers import FileHandler

logger = logging.getLogger(__name__)


class CorpusBuilder:

    def __init__(self):
        self.file_handler = FileHandler()

    async def process_document(
            self,
            file_path: str,
            file_type: str,
            metadata: Dict[str, Any],
            db: AsyncSession
    ) -> Dict[str, Any]:
        start_time = datetime.utcnow()

        try:
            logger.info(f"Reading file: {file_path}")
            text = await self.file_handler.read_file(file_path, file_type)

            if not text.strip():
                raise ValueError("Empty file")

            if not metadata.get('title'):
                lines = text.strip().split('\n')
                if lines:
                    metadata['title'] = lines[0][:200]

            logger.info("Saving document to PostgreSQL")
            doc = Document(
                title=metadata.get('title', 'Untitled'),
                author=metadata.get('author'),
                year=metadata.get('year'),
                language=metadata.get('language', 'en'),
                source_file=file_path,
                file_type=file_type,
                metadata=metadata,
                word_count=0
            )
            db.add(doc)
            await db.flush()

            logger.info(f"Processing text with spaCy, document ID: {doc.id}")
            tokens = text_processor.process_text(text)

            es_actions = []
            word_stats = {}

            for token in tokens:
                token['doc_id'] = doc.id
                token['metadata'] = {
                    'title': metadata.get('title'),
                    'author': metadata.get('author'),
                    'year': metadata.get('year'),
                    'language': metadata.get('language', 'en')
                }

                es_actions.append({
                    "_id": f"{doc.id}_{token['position']}",
                    "_source": token
                })

                key = (token['lemma'], token['pos'])
                if key not in word_stats:
                    word_stats[key] = 0
                word_stats[key] += 1

            logger.info(f"Indexing {len(es_actions)} tokens in Elasticsearch")
            if es_actions:
                batch_size = 1000
                for i in range(0, len(es_actions), batch_size):
                    batch = es_actions[i:i + batch_size]
                    await es_client.index_document_batch(batch)

            logger.info("Updating statistics in PostgreSQL")
            for (lemma, pos), freq in word_stats.items():
                stmt = select(WordStatistics).where(
                    WordStatistics.lemma == lemma,
                    WordStatistics.pos == pos
                )
                result = await db.execute(stmt)
                stats = result.scalar_one_or_none()

                if stats:
                    stats.total_frequency += freq
                    stats.document_count += 1
                    stats.last_updated = datetime.utcnow()
                else:
                    db.add(WordStatistics(
                        lemma=lemma,
                        pos=pos,
                        total_frequency=freq,
                        document_count=1
                    ))

                db.add(DocumentWordStats(
                    doc_id=doc.id,
                    lemma=lemma,
                    pos=pos,
                    frequency=freq
                ))

            doc.word_count = len(es_actions)
            await db.commit()

            processing_time = (datetime.utcnow() - start_time).total_seconds()

            return {
                "document_id": doc.id,
                "word_count": len(es_actions),
                "unique_words": len(word_stats),
                "processing_time": processing_time
            }

        except Exception as e:
            logger.error(f"Error processing document: {e}")
            await db.rollback()
            raise

    async def get_document_status(self, doc_id: int, db: AsyncSession) -> Dict[str, Any]:
        result = await db.execute(
            select(Document).where(Document.id == doc_id)
        )
        doc = result.scalar_one_or_none()

        if not doc:
            return None

        return {
            "id": doc.id,
            "title": doc.title,
            "word_count": doc.word_count,
            "created_at": doc.created_at,
            "status": "completed" if doc.word_count > 0 else "processing"
        }


# Глобальный экземпляр
corpus_builder = CorpusBuilder()