from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Body
from fastapi.responses import Response, StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from datetime import datetime
import json
import logging

from ...core.database import get_db
from ...services.db_export_service import DBExportImportService

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/db-export", tags=["database-export"])


@router.get("/export")
async def export_full_database(
    db: AsyncSession = Depends(get_db)
):
    try:
        service = DBExportImportService(db)
        data = await service.export_full_database()
        
        json_str = json.dumps(data, indent=2, default=str, ensure_ascii=False)
        filename = f"db_export_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        
        return StreamingResponse(
            iter([json_str.encode('utf-8')]),
            media_type="application/json",
            headers={
                "Content-Disposition": f"attachment; filename={filename}"
            }
        )
        
    except Exception as e:
        logger.error(f"Export error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/export-preview")
async def export_preview(
    db: AsyncSession = Depends(get_db)
):
    try:
        service = DBExportImportService(db)
        data = await service.export_full_database()
        
        preview = {
            "metadata": data["export_metadata"],
            "table_stats": {
                "documents": len(data.get("documents", [])),
                "tokens": len(data.get("tokens", [])),
                "sentences": len(data.get("sentences", [])),
                "lemma_stats": len(data.get("lemma_stats", [])),
                "word_form_stats": len(data.get("word_form_stats", [])),
                "document_lemma_stats": len(data.get("document_lemma_stats", [])),
                "document_word_form_stats": len(data.get("document_word_form_stats", []))
            }
        }
        
        return preview
        
    except Exception as e:
        logger.error(f"Export preview error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/import")
async def import_full_database(
    file: UploadFile = File(..., description="JSON файл с экспортированными данными"),
    clear_existing: bool = Body(True, description="Очистить существующие данные перед импортом"),
    db: AsyncSession = Depends(get_db)
):
    try:
        if not file.filename.endswith('.json'):
            raise HTTPException(400, "Only JSON files are allowed")
        
        content = await file.read()
        
        try:
            data = json.loads(content.decode('utf-8'))
        except json.JSONDecodeError as e:
            raise HTTPException(400, f"Invalid JSON format: {e}")
        
        required_tables = ['documents', 'tokens', 'sentences']
        for table in required_tables:
            if table not in data:
                raise HTTPException(400, f"Invalid export file: missing {table} table")
        
        import_data = {k: v for k, v in data.items() if k != 'export_metadata'}
        service = DBExportImportService(db)
        stats = await service.import_full_database(import_data, clear_existing)
        
        return {
            "message": "Import completed successfully",
            "statistics": stats
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Import error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/validate-import")
async def validate_import_file(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db)
):
    try:
        if not file.filename.endswith('.json'):
            raise HTTPException(400, "Only JSON files are allowed")
        
        content = await file.read()
        
        try:
            data = json.loads(content.decode('utf-8'))
        except json.JSONDecodeError as e:
            raise HTTPException(400, f"Invalid JSON format: {e}")
        
        required_tables = ['documents', 'tokens', 'sentences']
        missing_tables = [t for t in required_tables if t not in data]
        
        if missing_tables:
            return {
                "valid": False,
                "error": f"Missing required tables: {missing_tables}",
                "found_tables": list(data.keys())
            }
        
        valid_tables = [
            'documents', 'tokens', 'sentences', 
            'lemma_stats', 'word_form_stats', 
            'document_lemma_stats', 'document_word_form_stats'
        ]
        
        validation_results = {
            "valid": True,
            "tables": {},
            "warnings": []
        }
        
        for table_name, records in data.items():
            if table_name == 'export_metadata':
                validation_results["export_version"] = records.get("version")
                validation_results["exported_at"] = records.get("exported_at")
                continue
            
            if table_name not in valid_tables:
                validation_results["warnings"].append(f"Unknown table: {table_name}")
                continue
            
            if not isinstance(records, list):
                validation_results["valid"] = False
                validation_results["error"] = f"Table {table_name} should be an array, got {type(records).__name__}"
                break
            
            validation_results["tables"][table_name] = {
                "record_count": len(records),
                "has_data": len(records) > 0
            }
            
            if records and len(records) > 0:
                sample = records[0]
                if isinstance(sample, dict):
                    validation_results["tables"][table_name]["sample_keys"] = list(sample.keys())[:10]
        
        if not validation_results["tables"]:
            validation_results["valid"] = False
            validation_results["error"] = "No valid tables found in the export file"
        
        return validation_results
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Validation error: {e}")
        raise HTTPException(status_code=500, detail=str(e))