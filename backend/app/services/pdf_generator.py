import io
from datetime import datetime
from typing import Optional, List
from sqlalchemy import select, func, and_, desc
from sqlalchemy.ext.asyncio import AsyncSession
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
)
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
import logging
import os
from io import BytesIO

from ..core.database import (
    Document, Token, LemmaStats, WordFormStats,
    DocumentLemmaStats, DocumentWordFormStats
)

logger = logging.getLogger(__name__)


class PDFReportGenerator:
    def __init__(self, db_session: AsyncSession):
        self.db = db_session
        self._register_fonts()
        self.styles = getSampleStyleSheet()
        self._setup_styles()

    def _register_fonts(self):
        try:
            font_paths = [
                "/app/fonts/DejaVuSans.ttf",
                "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
            ]

            bold_font_paths = [
                "/app/fonts/DejaVuSans-Bold.ttf",
                "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
            ]

            for path in font_paths:
                if os.path.exists(path):
                    pdfmetrics.registerFont(TTFont('DejaVu', path))
                    logger.info(f"Registered regular font: {path}")
                    break
            else:
                pdfmetrics.registerFont(TTFont('DejaVu', 'Helvetica'))
                logger.warning("Using Helvetica as fallback")

            for path in bold_font_paths:
                if os.path.exists(path):
                    pdfmetrics.registerFont(TTFont('DejaVu-Bold', path))
                    logger.info(f"Registered bold font: {path}")
                    break
            else:
                pdfmetrics.registerFont(TTFont('DejaVu-Bold', 'Helvetica-Bold'))

        except Exception as e:
            logger.error(f"Font registration error: {e}")
            pdfmetrics.registerFont(TTFont('DejaVu', 'Helvetica'))
            pdfmetrics.registerFont(TTFont('DejaVu-Bold', 'Helvetica-Bold'))

    def _setup_styles(self):
        self.styles.add(ParagraphStyle(
            name='CustomTitle',
            fontName='DejaVu-Bold',
            fontSize=24,
            alignment=TA_CENTER,
            spaceAfter=30,
            textColor=colors.HexColor('#2E4053')
        ))

        self.styles.add(ParagraphStyle(
            name='SectionHeader',
            fontName='DejaVu-Bold',
            fontSize=16,
            alignment=TA_LEFT,
            spaceBefore=20,
            spaceAfter=10,
            textColor=colors.HexColor('#2874A6')
        ))

        self.styles.add(ParagraphStyle(
            name='StatsText',
            fontName='DejaVu',
            fontSize=11,
            alignment=TA_LEFT,
            spaceBefore=5,
            spaceAfter=5,
            textColor=colors.HexColor('#1C2833')
        ))

    async def generate_corpus_report(
            self,
            start_date: Optional[datetime] = None,
            end_date: Optional[datetime] = None
    ) -> bytes:
        buffer = BytesIO()

        doc = SimpleDocTemplate(
            buffer,
            pagesize=A4,
            rightMargin=72,
            leftMargin=72,
            topMargin=72,
            bottomMargin=72,
            title="Корпусный отчёт"
        )

        story = []

        story.append(Paragraph(
            "Отчёт по корпусу текстов",
            self.styles['CustomTitle']
        ))
        story.append(Paragraph(
            f"Сгенерировано: {datetime.now().strftime('%d.%m.%Y %H:%M')}",
            self.styles['StatsText']
        ))
        story.append(Spacer(1, 0.3 * inch))

        filters = []
        if start_date:
            filters.append(Document.created_at >= start_date)
        if end_date:
            filters.append(Document.created_at <= end_date)

        if start_date or end_date:
            story.append(Paragraph("Фильтры:", self.styles['SectionHeader']))
            filter_text = []
            if start_date:
                filter_text.append(f"с {start_date.strftime('%d.%m.%Y')}")
            if end_date:
                filter_text.append(f"по {end_date.strftime('%d.%m.%Y')}")
            story.append(Paragraph(" ".join(filter_text), self.styles['StatsText']))
            story.append(Spacer(1, 0.2 * inch))

        await self._add_summary_stats(story, filters)
        await self._add_top_lemmas(story, limit=100)
        await self._add_top_wordforms(story, limit=100)
        await self._add_top_documents(story, filters, limit=20)

        doc.build(story)

        pdf_bytes = buffer.getvalue()
        buffer.close()

        return pdf_bytes

    async def generate_document_report(self, doc_id: int) -> bytes:
        buffer = BytesIO()

        doc_query = await self.db.execute(
            select(Document).where(Document.id == doc_id)
        )
        doc = doc_query.scalar_one_or_none()

        if not doc:
            raise ValueError(f"Документ {doc_id} не найден")

        doc_template = SimpleDocTemplate(
            buffer,
            pagesize=A4,
            title=f"Отчёт: {doc.title}"
        )

        story = []

        story.append(Paragraph(
            "Анализ документа",
            self.styles['CustomTitle']
        ))
        story.append(Spacer(1, 0.2 * inch))

        story.append(Paragraph("Метаданные", self.styles['SectionHeader']))
        story.append(Paragraph(f"Название: {doc.title}", self.styles['StatsText']))
        story.append(Paragraph(f"Автор: {doc.author or 'Не указан'}", self.styles['StatsText']))
        story.append(Paragraph(f"Язык: {doc.language}", self.styles['StatsText']))
        story.append(Paragraph(f"Год: {doc.year or 'Не указан'}", self.styles['StatsText']))
        story.append(Paragraph(f"Токенов: {doc.word_count}", self.styles['StatsText']))
        story.append(Spacer(1, 0.2 * inch))

        await self._add_document_stats(story, doc_id)
        await self._add_document_lemmas(story, doc_id, limit=50)
        await self._add_document_wordforms(story, doc_id, limit=50)

        doc_template.build(story)

        pdf_bytes = buffer.getvalue()
        buffer.close()

        return pdf_bytes

    async def _add_summary_stats(self, story: list, filters: list):
        story.append(Paragraph("Общая статистика", self.styles['SectionHeader']))

        query = select(func.count(Document.id))
        if filters:
            query = query.where(and_(*filters))
        total_docs = (await self.db.execute(query)).scalar() or 0

        query = select(func.coalesce(func.sum(Document.word_count), 0))
        if filters:
            query = query.where(and_(*filters))
        total_words = (await self.db.execute(query)).scalar() or 0

        unique_lemmas = (await self.db.execute(
            select(func.count(LemmaStats.id))
        )).scalar() or 0

        unique_wordforms = (await self.db.execute(
            select(func.count(WordFormStats.id))
        )).scalar() or 0

        data = [
            ['Показатель', 'Значение'],
            ['Всего документов', str(total_docs)],
            ['Всего токенов', str(total_words)],
            ['Средний размер', f"{round(total_words / total_docs, 1) if total_docs > 0 else 0}"],
            ['Уникальных лемм', str(unique_lemmas)],
            ['Уникальных словоформ', str(unique_wordforms)]
        ]

        table = Table(data, colWidths=[250, 200])
        table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#2874A6')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('FONTNAME', (0, 0), (-1, 0), 'DejaVu-Bold'),
            ('FONTNAME', (0, 1), (-1, -1), 'DejaVu'),
            ('BACKGROUND', (0, 1), (-1, -1), colors.HexColor('#F8F9F9')),
            ('GRID', (0, 0), (-1, -1), 1, colors.HexColor('#CCD1D1')),
        ]))

        story.append(table)
        story.append(Spacer(1, 0.3 * inch))

    async def _add_top_lemmas(self, story: list, limit: int = 50):
        story.append(Paragraph(f"Топ-{limit} самых частотных лемм", self.styles['SectionHeader']))

        lemmas = (await self.db.execute(
            select(LemmaStats.lemma, LemmaStats.pos, LemmaStats.total_frequency)
            .order_by(desc(LemmaStats.total_frequency))
            .limit(limit)
        )).all()

        if not lemmas:
            story.append(Paragraph("Нет данных", self.styles['StatsText']))
            return

        data = [['№', 'Лемма', 'Часть речи', 'Частотность']]
        for i, (lemma, pos, freq) in enumerate(lemmas, 1):
            data.append([str(i), lemma, pos or '-', str(freq)])

        table = Table(data, colWidths=[30, 200, 120, 100])
        table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#2874A6')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('ALIGN', (0, 0), (0, -1), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'DejaVu-Bold'),
            ('FONTNAME', (0, 1), (-1, -1), 'DejaVu'),
            ('GRID', (0, 0), (-1, -1), 1, colors.HexColor('#CCD1D1')),
        ]))

        story.append(table)
        story.append(Spacer(1, 0.3 * inch))

    async def _add_top_wordforms(self, story: list, limit: int = 50):
        story.append(Paragraph(f"Топ-{limit} самых частотных словоформ", self.styles['SectionHeader']))

        wordforms = (await self.db.execute(
            select(WordFormStats.word, WordFormStats.pos, WordFormStats.total_frequency)
            .order_by(desc(WordFormStats.total_frequency))
            .limit(limit)
        )).all()

        if not wordforms:
            story.append(Paragraph("Нет данных", self.styles['StatsText']))
            return

        data = [['№', 'Словоформа', 'Часть речи', 'Частотность']]
        for i, (word, pos, freq) in enumerate(wordforms, 1):
            data.append([str(i), word, pos or '-', str(freq)])

        table = Table(data, colWidths=[30, 200, 120, 100])
        table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#2874A6')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('ALIGN', (0, 0), (0, -1), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'DejaVu-Bold'),
            ('FONTNAME', (0, 1), (-1, -1), 'DejaVu'),
            ('GRID', (0, 0), (-1, -1), 1, colors.HexColor('#CCD1D1')),
        ]))

        story.append(table)
        story.append(Spacer(1, 0.3 * inch))

    async def _add_top_documents(self, story: list, filters: list, limit: int = 20):
        story.append(Paragraph(f"Топ-{limit} крупнейших документов", self.styles['SectionHeader']))

        query = select(Document)
        if filters:
            query = query.where(and_(*filters))
        query = query.order_by(desc(Document.word_count)).limit(limit)

        docs = (await self.db.execute(query)).scalars().all()

        if not docs:
            story.append(Paragraph("Нет данных", self.styles['StatsText']))
            return

        data = [['№', 'Название', 'Автор', 'Язык', 'Слов']]
        for i, doc in enumerate(docs, 1):
            title = doc.title[:40] + '...' if len(doc.title) > 40 else doc.title
            data.append([str(i), title, doc.author or '-', doc.language, str(doc.word_count)])

        table = Table(data, colWidths=[30, 180, 100, 60, 80])
        table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#2874A6')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('ALIGN', (0, 0), (0, -1), 'CENTER'),
            ('ALIGN', (-1, 0), (-1, -1), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'DejaVu-Bold'),
            ('FONTNAME', (0, 1), (-1, -1), 'DejaVu'),
            ('GRID', (0, 0), (-1, -1), 1, colors.HexColor('#CCD1D1')),
        ]))

        story.append(table)
        story.append(Spacer(1, 0.3 * inch))

    async def _add_document_stats(self, story: list, doc_id: int):
        story.append(Paragraph("Статистика документа", self.styles['SectionHeader']))

        total_tokens = (await self.db.execute(
            select(func.count(Token.position)).where(Token.doc_id == doc_id)
        )).scalar() or 0

        unique_lemmas = (await self.db.execute(
            select(func.count(func.distinct(Token.lemma)))
            .where(and_(Token.doc_id == doc_id, Token.lemma.isnot(None)))
        )).scalar() or 0

        unique_wordforms = (await self.db.execute(
            select(func.count(func.distinct(Token.word)))
            .where(and_(Token.doc_id == doc_id, Token.word.isnot(None)))
        )).scalar() or 0

        sentences = (await self.db.execute(
            select(func.count(func.distinct(Token.sentence_id)))
            .where(Token.doc_id == doc_id)
        )).scalar() or 0

        data = [
            ['Показатель', 'Значение'],
            ['Всего токенов', str(total_tokens)],
            ['Уникальных лемм', str(unique_lemmas)],
            ['Уникальных словоформ', str(unique_wordforms)],
            ['Предложений', str(sentences)],
            ['Средняя длина предложения', f"{round(total_tokens / sentences, 1) if sentences > 0 else 0}"]
        ]

        table = Table(data, colWidths=[250, 200])
        table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#2874A6')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('FONTNAME', (0, 0), (-1, 0), 'DejaVu-Bold'),
            ('FONTNAME', (0, 1), (-1, -1), 'DejaVu'),
            ('BACKGROUND', (0, 1), (-1, -1), colors.HexColor('#F8F9F9')),
            ('GRID', (0, 0), (-1, -1), 1, colors.HexColor('#CCD1D1')),
        ]))

        story.append(table)
        story.append(Spacer(1, 0.3 * inch))

    async def _add_document_lemmas(self, story: list, doc_id: int, limit: int = 50):
        story.append(Paragraph(f"Топ-{limit} лемм в документе", self.styles['SectionHeader']))

        lemmas = (await self.db.execute(
            select(DocumentLemmaStats.lemma, DocumentLemmaStats.pos, DocumentLemmaStats.frequency)
            .where(DocumentLemmaStats.doc_id == doc_id)
            .order_by(desc(DocumentLemmaStats.frequency))
            .limit(limit)
        )).all()

        if not lemmas:
            story.append(Paragraph("Нет данных", self.styles['StatsText']))
            return

        data = [['№', 'Лемма', 'Часть речи', 'Частота']]
        for i, (lemma, pos, freq) in enumerate(lemmas, 1):
            data.append([str(i), lemma, pos or '-', str(freq)])

        table = Table(data, colWidths=[30, 200, 120, 100])
        table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#2874A6')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('ALIGN', (0, 0), (0, -1), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'DejaVu-Bold'),
            ('FONTNAME', (0, 1), (-1, -1), 'DejaVu'),
            ('GRID', (0, 0), (-1, -1), 1, colors.HexColor('#CCD1D1')),
        ]))

        story.append(table)
        story.append(Spacer(1, 0.3 * inch))

    async def _add_document_wordforms(self, story: list, doc_id: int, limit: int = 50):
        story.append(Paragraph(f"Топ-{limit} словоформ в документе", self.styles['SectionHeader']))

        wordforms = (await self.db.execute(
            select(DocumentWordFormStats.word, DocumentWordFormStats.pos, DocumentWordFormStats.frequency)
            .where(DocumentWordFormStats.doc_id == doc_id)
            .order_by(desc(DocumentWordFormStats.frequency))
            .limit(limit)
        )).all()

        if not wordforms:
            story.append(Paragraph("Нет данных", self.styles['StatsText']))
            return

        data = [['№', 'Словоформа', 'Часть речи', 'Частота']]
        for i, (word, pos, freq) in enumerate(wordforms, 1):
            data.append([str(i), word, pos or '-', str(freq)])

        table = Table(data, colWidths=[30, 200, 120, 100])
        table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#2874A6')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('ALIGN', (0, 0), (0, -1), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'DejaVu-Bold'),
            ('FONTNAME', (0, 1), (-1, -1), 'DejaVu'),
            ('GRID', (0, 0), (-1, -1), 1, colors.HexColor('#CCD1D1')),
        ]))

        story.append(table)
        story.append(Spacer(1, 0.3 * inch))