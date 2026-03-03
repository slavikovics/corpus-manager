import os
import aiofiles
from typing import BinaryIO, Optional
import logging
from pathlib import Path
import PyPDF2
from io import BytesIO
from docx import Document
import re

logger = logging.getLogger(__name__)


class FileHandler:
    
    @staticmethod
    async def read_text_file(file_path: str) -> str:
        async with aiofiles.open(file_path, 'r', encoding='utf-8') as f:
            return await f.read()
    
    @staticmethod
    async def read_pdf(file_path: str) -> str:
        text = ""
        try:
            with open(file_path, 'rb') as file:
                pdf_reader = PyPDF2.PdfReader(file)
                for page in pdf_reader.pages:
                    text += page.extract_text() + "\n"
        except Exception as e:
            logger.error(f"Error reading PDF {file_path}: {e}")
            raise
        return text
    
    @staticmethod
    async def read_docx(file_path: str) -> str:
        text = ""
        try:
            doc = Document(file_path)
            for paragraph in doc.paragraphs:
                text += paragraph.text + "\n"
        except Exception as e:
            logger.error(f"Error reading DOCX {file_path}: {e}")
            raise
        return text
    
    @staticmethod
    async def read_rtf(file_path: str) -> str:
        try:
            async with aiofiles.open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                content = await f.read()
                text = re.sub(r'\\[a-z]+[\d-]*', ' ', content)
                text = re.sub(r'[{}]', '', text)
                text = re.sub(r'\s+', ' ', text)
                return text
        except Exception as e:
            logger.error(f"Error reading RTF {file_path}: {e}")
            raise
    
    @classmethod
    async def read_file(cls, file_path: str, file_type: str) -> str:
        file_type = file_type.lower().lstrip('.')
        
        handlers = {
            'txt': cls.read_text_file,
            'pdf': cls.read_pdf,
            'docx': cls.read_docx,
            'rtf': cls.read_rtf
        }
        
        handler = handlers.get(file_type)
        if not handler:
            raise ValueError(f"Unsupported file type: {file_type}")
        
        return await handler(file_path)
    
    @staticmethod
    async def save_upload_file(upload_file, upload_dir: str, filename: str) -> str:
        os.makedirs(upload_dir, exist_ok=True)
        file_path = os.path.join(upload_dir, filename)
        
        async with aiofiles.open(file_path, 'wb') as out_file:
            content = await upload_file.read()
            await out_file.write(content)
        
        return file_path