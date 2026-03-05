from typing import List, Dict, Any, Optional
import logging
from datetime import datetime
import asyncio
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, insert, update
from sqlalchemy.dialects.postgresql import insert as pg_insert

from ..core.database import Document, WordStatistics, DocumentWordStats
from ..core.elastic import es_client
from ..services.text_processor import text_processor
from ..services.file_handlers import FileHandler

logger = logging.getLogger(__name__)


class CorpusBuilder:

    def __init__(self):
        self.file_handler = FileHandler()
        self.batch_size = 5000

    async def process_document(
            self,
            file_path: str,
            file_type: str,
            metadata: Dict[str, Any],
            db: AsyncSession
    ) -> Dict[str, Any]:
        start_time = datetime.utcnow()

        try:
            text = await self._read_file(file_path, file_type, metadata)
            doc_id = await self._save_document_metadata(metadata, file_path, file_type, db)
            tokens = text_processor.process_text(text)
            word_stats = self._calculate_word_statistics(tokens)
            await self._save_word_statistics(word_stats, db)
            await self._save_document_word_stats(doc_id, word_stats, db)
            await self._update_document_word_count(doc_id, len(tokens), db)
            await db.commit()
            
            asyncio.create_task(
                self._index_in_elasticsearch(doc_id, tokens, metadata)
            )

            processing_time = (datetime.utcnow() - start_time).total_seconds()

            return {
                "document_id": doc_id,
                "word_count": len(tokens),
                "unique_words": len(word_stats),
                "processing_time": processing_time
            }

        except Exception as e:
            logger.error(f"Error processing document: {e}")
            await db.rollback()
            raise

    async def _read_file(self, file_path: str, file_type: str, metadata: Dict) -> str:
        logger.info(f"Reading file: {file_path}")
        text = await self.file_handler.read_file(file_path, file_type)

        if not text.strip():
            raise ValueError("Empty file")

        if not metadata.get('title'):
            lines = text.strip().split('\n')
            if lines:
                metadata['title'] = lines[0][:200]

        return text

    async def _save_document_metadata(
            self, 
            metadata: Dict, 
            file_path: str, 
            file_type: str, 
            db: AsyncSession
    ) -> int:
        logger.info("Saving document to PostgreSQL")
        
        result = await db.execute(
            insert(Document).values(
                title=metadata.get('title', 'Untitled'),
                author=metadata.get('author'),
                year=metadata.get('year'),
                language=metadata.get('language', 'en'),
                source_file=file_path,
                file_type=file_type,
                meta_info=metadata,
                word_count=0
            ).returning(Document.id)
        )
        
        doc_id = result.scalar()
        await db.flush()
        
        logger.info(f"Document saved with ID: {doc_id}")
        return doc_id

    def _calculate_word_statistics(self, tokens: List[Dict]) -> Dict[tuple, int]:
        word_stats = {}
        
        for token in tokens:
            key = (token['lemma'], token['pos'])
            word_stats[key] = word_stats.get(key, 0) + 1
            
        logger.info(f"Calculated statistics for {len(word_stats)} unique words")
        return word_stats

    async def _save_word_statistics(self, word_stats: Dict[tuple, int], db: AsyncSession):
        if not word_stats:
            return
            
        logger.info("Updating word statistics in PostgreSQL")
        
        values = []
        for (lemma, pos), freq in word_stats.items():
            values.append({
                'lemma': lemma,
                'pos': pos,
                'total_frequency': freq,
                'last_updated': datetime.utcnow()
            })

        stmt = pg_insert(WordStatistics).values(values)
        stmt = stmt.on_conflict_do_update(
            index_elements=['lemma', 'pos'],
            set_={
                'total_frequency': WordStatistics.total_frequency + stmt.excluded.total_frequency,
                'last_updated': datetime.utcnow()
            }
        )
        
        await db.execute(stmt)
        logger.info(f"Updated statistics for {len(values)} words")

    async def _save_document_word_stats(
            self, 
            doc_id: int, 
            word_stats: Dict[tuple, int], 
            db: AsyncSession
    ):
        if not word_stats:
            return
            
        logger.info(f"Saving document-word relationships for document {doc_id}")
        
        values = []
        for (lemma, pos), freq in word_stats.items():
            values.append({
                'doc_id': doc_id,
                'lemma': lemma,
                'pos': pos,
                'frequency': freq
            })

        for i in range(0, len(values), self.batch_size):
            batch = values[i:i + self.batch_size]
            await db.execute(
                insert(DocumentWordStats).values(batch)
            )
            
        logger.info(f"Saved {len(values)} document-word relationships")

    async def _update_document_word_count(self, doc_id: int, word_count: int, db: AsyncSession):
        await db.execute(
            update(Document)
            .where(Document.id == doc_id)
            .values(word_count=word_count)
        )
        logger.info(f"Updated document {doc_id} word count: {word_count}")

    async def _index_in_elasticsearch(self, doc_id: int, tokens: List[Dict], metadata: Dict):
        try:
            logger.info(f"Starting Elasticsearch indexing for document {doc_id}")
            
            es_actions = []
            for token in tokens:
                token['doc_id'] = doc_id
                token['metadata'] = {
                    'title': metadata.get('title'),
                    'author': metadata.get('author'),
                    'year': metadata.get('year'),
                    'language': metadata.get('language', 'en')
                }
                token['suggest'] = {
                    "input": [token["word"], token.get("lemma", "")],
                    "weight": token.get("frequency", 1)
                }
                
                es_actions.append({
                    "_id": f"{doc_id}_{token['position']}",
                    "_source": token
                })

            if es_actions:
                for i in range(0, len(es_actions), self.batch_size):
                    batch = es_actions[i:i + self.batch_size]
                    await es_client.index_document_batch(batch)
                    
            logger.info(f"Successfully indexed {len(tokens)} tokens for document {doc_id}")
            
        except Exception as e:
            logger.error(f"Error indexing to Elasticsearch: {e}")

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

corpus_builder = CorpusBuilder()