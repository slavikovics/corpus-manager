from typing import List, Dict, Any, Optional, Tuple
import logging
from datetime import datetime
import asyncio
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, insert, update, func
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.exc import SQLAlchemyError

from ..core.database import Document, WordStatistics, DocumentWordStats
from ..core.elastic import es_client
from ..services.text_processor import text_processor
from ..services.file_handlers import FileHandler

logger = logging.getLogger(__name__)


class CorpusBuilder:

    def __init__(self):
        self.file_handler = FileHandler()
        self.batch_size = 5000
        self.stats_batch_size = 1000

    async def process_document(
            self,
            file_path: str,
            file_type: str,
            metadata: Dict[str, Any],
            db: AsyncSession
    ) -> Dict[str, Any]:
        start_time = datetime.now()
        doc_id = None

        try:
            logger.info(f"Processing document: {file_path}")
            text = await FileHandler.read_file(file_path, file_type, metadata)
            tokens = text_processor.process_text(text)

            if not tokens:
                raise ValueError("No tokens extracted from document")

            logger.info(f"Extracted {len(tokens)} tokens from document")

            doc_id = await self._save_document_metadata(metadata, file_path, file_type, len(tokens), db)

            word_stats = self._calculate_word_statistics(tokens)

            await self._bulk_update_word_statistics(word_stats, db)

            await self._bulk_save_document_word_stats(doc_id, word_stats, db)

            await db.commit()
            logger.info(f"Successfully saved document {doc_id} to database")

            asyncio.create_task(
                self._bulk_index_in_elasticsearch(doc_id, tokens, metadata)
            )

            processing_time = (datetime.now() - start_time).total_seconds()

            return {
                "document_id": doc_id,
                "word_count": len(tokens),
                "unique_words": len(word_stats),
                "processing_time": processing_time
            }

        except SQLAlchemyError as e:
            logger.error(f"Database error processing document: {e}")
            if db:
                await db.rollback()
            raise
        except Exception as e:
            logger.error(f"Error processing document: {e}")
            if db:
                await db.rollback()
            raise

    async def _save_document_metadata(
            self,
            metadata: Dict,
            file_path: str,
            file_type: str,
            word_count: int,
            db: AsyncSession
    ) -> int:
        logger.info("Saving document metadata to PostgreSQL")

        stmt = (
            insert(Document)
            .values(
                title=metadata.get('title', 'Untitled'),
                author=metadata.get('author'),
                year=metadata.get('year'),
                language=metadata.get('language', 'en'),
                source_file=file_path,
                file_type=file_type,
                meta_info=metadata,
                word_count=word_count,
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow()
            )
            .returning(Document.id)
        )

        result = await db.execute(stmt)
        doc_id = result.scalar_one()

        logger.info(f"Document saved with ID: {doc_id}")
        return doc_id

    def _calculate_word_statistics(self, tokens: List[Dict]) -> List[Dict]:
        from collections import defaultdict
        stats_dict = defaultdict(int)

        for token in tokens:
            key = (token['lemma'].lower(), token['pos'])
            stats_dict[key] += 1

        word_stats = [
            {
                'lemma': lemma,
                'pos': pos,
                'frequency': freq
            }
            for (lemma, pos), freq in stats_dict.items()
        ]

        logger.info(f"Calculated statistics for {len(word_stats)} unique words")
        return word_stats

    async def _bulk_update_word_statistics(
            self,
            word_stats: List[Dict],
            db: AsyncSession
    ):
        if not word_stats:
            return

        logger.info(f"Bulk updating word statistics for {len(word_stats)} words")

        values = [
            {
                'lemma': stat['lemma'],
                'pos': stat['pos'],
                'total_frequency': stat['frequency'],
                'last_updated': datetime.utcnow()
            }
            for stat in word_stats
        ]

        for i in range(0, len(values), self.stats_batch_size):
            batch = values[i:i + self.stats_batch_size]

            stmt = pg_insert(WordStatistics).values(batch)
            stmt = stmt.on_conflict_do_update(
                index_elements=['lemma', 'pos'],
                set_={
                    'total_frequency': WordStatistics.total_frequency + stmt.excluded.total_frequency,
                    'last_updated': datetime.utcnow()
                }
            )

            await db.execute(stmt)
            logger.debug(f"Updated batch {i // self.stats_batch_size + 1} of word statistics")

    async def _bulk_save_document_word_stats(
            self,
            doc_id: int,
            word_stats: List[Dict],
            db: AsyncSession
    ):
        if not word_stats:
            return

        logger.info(f"Bulk saving document-word stats for document {doc_id}")

        values = [
            {
                'doc_id': doc_id,
                'lemma': stat['lemma'],
                'pos': stat['pos'],
                'frequency': stat['frequency']
            }
            for stat in word_stats
        ]

        for i in range(0, len(values), self.batch_size):
            batch = values[i:i + self.batch_size]

            await db.execute(
                insert(DocumentWordStats).values(batch)
            )
            logger.debug(f"Inserted batch {i // self.batch_size + 1} of document-word stats")

        logger.info(f"Saved {len(values)} document-word relationships")

    async def _bulk_index_in_elasticsearch(
            self,
            doc_id: int,
            tokens: List[Dict],
            metadata: Dict
    ):
        try:
            logger.info(f"Starting Elasticsearch bulk indexing for document {doc_id}")

            batch_size = 1000
            es_batch = []

            for i, token in enumerate(tokens):
                es_doc = {'doc_id': doc_id, 'position': token['position'], 'sentence_id': token['sentence_id'],
                          'word': token['word'], 'lemma': token['lemma'], 'pos': token['pos'],
                          'morph': token.get('morph', {}), 'dep': token.get('dep', ''), 'head': token.get('head', ''),
                          'is_punctuation': token.get('is_punctuation', False),
                          'is_stopword': token.get('is_stopword', False), 'left_context': token.get('left_context', ''),
                          'right_context': token.get('right_context', ''), 'metadata': {
                        'title': metadata.get('title'),
                        'author': metadata.get('author'),
                        'year': metadata.get('year'),
                        'language': metadata.get('language', 'en')
                    }, 'suggest': {
                        "input": [
                            token['word'],
                            token.get('lemma', ''),
                            token.get('word', '').lower()
                        ],
                        "weight": 1
                    }}

                es_batch.append({
                    "_id": f"{doc_id}_{token['position']}",
                    "_source": es_doc
                })

                if len(es_batch) >= batch_size:
                    await es_client.index_document_batch(es_batch)
                    logger.debug(f"Indexed batch of {len(es_batch)} tokens")
                    es_batch = []

            if es_batch:
                await es_client.index_document_batch(es_batch)
                logger.debug(f"Indexed final batch of {len(es_batch)} tokens")

            logger.info(f"Successfully indexed {len(tokens)} tokens for document {doc_id}")

        except Exception as e:
            logger.error(f"Error indexing to Elasticsearch: {e}")

    async def process_documents_bulk(
            self,
            documents: List[Dict[str, Any]],
            db: AsyncSession
    ) -> List[Dict[str, Any]]:
        results = []

        for doc in documents:
            try:
                result = await self.process_document(
                    file_path=doc['file_path'],
                    file_type=doc['file_type'],
                    metadata=doc.get('metadata', {}),
                    db=db
                )
                results.append(result)
            except Exception as e:
                logger.error(f"Failed to process document {doc.get('file_path')}: {e}")
                results.append({
                    "error": str(e),
                    "file_path": doc.get('file_path')
                })

        return results

    async def get_document_statistics(
            self,
            doc_id: int,
            db: AsyncSession
    ) -> Dict[str, Any]:
        doc_result = await db.execute(
            select(Document).where(Document.id == doc_id)
        )
        document = doc_result.scalar_one_or_none()

        if not document:
            raise ValueError(f"Document {doc_id} not found")

        stats_result = await db.execute(
            select(DocumentWordStats)
            .where(DocumentWordStats.doc_id == doc_id)
            .order_by(DocumentWordStats.frequency.desc())
            .limit(100)
        )
        top_words = stats_result.scalars().all()

        pos_stats = await db.execute(
            select(
                DocumentWordStats.pos,
                func.sum(DocumentWordStats.frequency).label('total'),
                func.count().label('unique_words')
            )
            .where(DocumentWordStats.doc_id == doc_id)
            .group_by(DocumentWordStats.pos)
        )

        return {
            "document_id": document.id,
            "title": document.title,
            "author": document.author,
            "year": document.year,
            "language": document.language,
            "word_count": document.word_count,
            "unique_words": len(top_words),
            "top_words": [
                {"word": w.lemma, "pos": w.pos, "frequency": w.frequency}
                for w in top_words
            ],
            "pos_distribution": [
                {"pos": row.pos, "count": row.total, "unique": row.unique_words}
                for row in pos_stats
            ]
        }


corpus_builder = CorpusBuilder()
