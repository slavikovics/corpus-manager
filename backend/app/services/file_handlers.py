import os
from typing import Dict
import logging
import PyPDF2
from docx import Document
from striprtf.striprtf import rtf_to_text

logger = logging.getLogger(__name__)


class FileHandler:

    @staticmethod
    def read_text_file(file_path: str) -> str:
        with open(file_path, 'r', encoding='utf-8') as f:
            return f.read()

    @staticmethod
    def read_pdf(file_path: str) -> str:
        text = ""
        try:
            with open(file_path, 'rb') as file:
                pdf_reader = PyPDF2.PdfReader(file)
                for page in pdf_reader.pages:
                    page_text = page.extract_text()
                    if page_text:
                        text += page_text + "\n"
        except Exception as e:
            logger.error(f"Error reading PDF {file_path}: {e}")
            raise
        return text

    @staticmethod
    def read_docx(file_path: str) -> str:
        text = ""
        try:
            doc = Document(file_path)
            for paragraph in doc.paragraphs:
                if paragraph.text:
                    text += paragraph.text + "\n"
        except Exception as e:
            logger.error(f"Error reading DOCX {file_path}: {e}")
            raise
        return text

    @staticmethod
    def read_rtf(file_path: str) -> str:
        try:
            with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                rtf_content = f.read()
                return rtf_to_text(rtf_content)
        except Exception as e:
            logger.error(f"Error reading RTF {file_path}: {e}")
            raise

    @classmethod
    def extract_text(cls, file_path: str, file_type: str) -> str:
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

        return handler(file_path)

    @staticmethod
    def save_upload_file_sync(upload_file, upload_dir: str, filename: str) -> str:
        os.makedirs(upload_dir, exist_ok=True)
        file_path = os.path.join(upload_dir, filename)

        content = upload_file.read()
        with open(file_path, 'wb') as out_file:
            out_file.write(content)

        return file_path

    @staticmethod
    def read_file(file_path: str, file_type: str, metadata: Dict) -> str:
        logger.info(f"Reading file: {file_path}")
        text = FileHandler.extract_text(file_path, file_type)

        if not text or not text.strip():
            raise ValueError("Empty file")

        if not metadata.get('title'):
            lines = text.strip().split('\n')
            if lines and lines[0].strip():
                metadata['title'] = lines[0][:200]

        return text

    @staticmethod
    async def save_upload_file(upload_file, upload_dir: str, filename: str) -> str:
        import aiofiles
        os.makedirs(upload_dir, exist_ok=True)
        file_path = os.path.join(upload_dir, filename)

        async with aiofiles.open(file_path, 'wb') as out_file:
            content = await upload_file.read()
            await out_file.write(content)

        return file_path