import json
import logging
from datetime import datetime
from typing import Dict, Any, List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, text
from sqlalchemy.exc import IntegrityError

from ..core.database import Base, engine
from ..core.database import (
    Document, Token, Sentence, LemmaStats, WordFormStats,
    DocumentLemmaStats, DocumentWordFormStats
)

logger = logging.getLogger(__name__)


class DBExportImportService:
    
    def __init__(self, db: AsyncSession):
        self.db = db
    
    async def export_full_database(self) -> Dict[str, Any]:
        try:
            logger.info("Starting full database export")
            
            data = {
                "export_metadata": {
                    "exported_at": datetime.utcnow().isoformat(),
                    "version": "1.0",
                    "table_count": 8
                },
                "documents": await self._export_table(Document),
                "lemma_stats": await self._export_table(LemmaStats),
                "word_form_stats": await self._export_table(WordFormStats),
                "sentences": await self._export_table(Sentence),
                "tokens": await self._export_table(Token),
                "document_lemma_stats": await self._export_table(DocumentLemmaStats),
                "document_word_form_stats": await self._export_table(DocumentWordFormStats)
            }
            
            logger.info(f"Export completed: {len(data['documents'])} documents, "
                       f"{len(data['tokens'])} tokens exported")
            
            return data
            
        except Exception as e:
            logger.error(f"Export failed: {e}")
            raise
    
    async def _export_table(self, model_class) -> List[Dict]:
        try:
            result = await self.db.execute(select(model_class))
            rows = result.scalars().all()
            
            exported = []
            for row in rows:
                row_dict = {}
                for column in model_class.__table__.columns:
                    value = getattr(row, column.name)
                    if isinstance(value, datetime):
                        value = value.isoformat()
                    row_dict[column.name] = value
                exported.append(row_dict)
            
            return exported
            
        except Exception as e:
            logger.error(f"Failed to export table {model_class.__tablename__}: {e}")
            raise
    
    async def import_full_database(self, data: Dict[str, Any], clear_existing: bool = True) -> Dict[str, Any]:
        try:
            logger.info("Starting full database import")
            
            if clear_existing:
                await self._clear_all_tables()
            
            import_stats = {
                "imported_at": datetime.utcnow().isoformat(),
                "tables": {}
            }
            
            import_order = [
                ("documents", Document),
                ("lemma_stats", LemmaStats),
                ("word_form_stats", WordFormStats),
                ("sentences", Sentence),
                ("tokens", Token),
                ("document_lemma_stats", DocumentLemmaStats),
                ("document_word_form_stats", DocumentWordFormStats)
            ]
            
            for table_name, model_class in import_order:
                if table_name in data:
                    count = await self._import_table(model_class, data[table_name])
                    import_stats["tables"][table_name] = {"imported": count}
                    logger.info(f"Imported {count} records into {table_name}")
            
            await self._update_sequences()
            
            await self.db.commit()
            
            logger.info("Import completed successfully")
            return import_stats
            
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Import failed: {e}")
            raise
    
    async def _import_table(self, model_class, records: List[Dict]) -> int:
        if not records:
            return 0
        
        imported_count = 0
        for record in records:
            try:
                for key, value in record.items():
                    if isinstance(value, str) and 'T' in value and ':' in value:
                        try:
                            record[key] = datetime.fromisoformat(value)
                        except (ValueError, TypeError):
                            pass
                
                instance = model_class(**record)
                self.db.add(instance)
                imported_count += 1
                
                if imported_count % 1000 == 0:
                    await self.db.flush()
                    
            except IntegrityError as e:
                logger.warning(f"Integrity error while importing {model_class.__tablename__}: {e}")
                await self.db.rollback()
                continue
        
        await self.db.flush()
        return imported_count
    
    async def _clear_all_tables(self):
        logger.info("Clearing all tables before import")
        
        tables_to_clear = [
            "tokens",
            "sentences",
            "document_lemma_stats",
            "document_word_form_stats",
            "documents",
            "lemma_stats",
            "word_form_stats"
        ]
        
        for table_name in tables_to_clear:
            try:
                await self.db.execute(text(f"DELETE FROM {table_name}"))
                logger.info(f"Cleared table {table_name}")
            except Exception as e:
                logger.error(f"Failed to clear table {table_name}: {e}")
                raise
        
        await self.db.flush()
    
    async def _update_sequences(self):
        try:
            tables_with_sequences = [
                ("documents", "id"),
                ("lemma_stats", "id"),
                ("word_form_stats", "id"),
                ("sentences", "id")
            ]
            
            for table_name, column_name in tables_with_sequences:
                sequence_name = f"{table_name}_{column_name}_seq"
                try:
                    result = await self.db.execute(
                        text(f"SELECT COALESCE(MAX({column_name}), 0) FROM {table_name}")
                    )
                    max_id = result.scalar()
                    
                    await self.db.execute(
                        text(f"SELECT setval('{sequence_name}', :max_id, true)"),
                        {"max_id": max_id}
                    )
                    logger.info(f"Updated sequence {sequence_name} to {max_id}")
                    
                except Exception as e:
                    logger.warning(f"Failed to update sequence {sequence_name}: {e}")
                    
        except Exception as e:
            logger.error(f"Failed to update sequences: {e}")
            raise