import io
import logging
import os
from datetime import datetime
from io import BytesIO
from typing import List, Optional

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import inch
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (
    HRFlowable,
    KeepTogether,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)
from sqlalchemy import and_, desc, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from ..core.database import (
    Document,
    DocumentLemmaStats,
    DocumentWordFormStats,
    LemmaStats,
    Sentence,
    SentenceSemanticAnalysis,
    Token,
    WordFormStats,
)
from ..models.semantics import SemanticAnalysisResponse

logger = logging.getLogger(__name__)

_C_HEADER = colors.HexColor("#4C1D95")  # violet-900
_C_HEADER_ALT = colors.HexColor("#6D28D9")  # violet-700
_C_ACCENT = colors.HexColor("#7C3AED")  # violet-600
_C_ROW_ODD = colors.HexColor("#F5F3FF")  # violet-50
_C_ROW_EVEN = colors.white
_C_GRID = colors.HexColor("#DDD6FE")  # violet-200
_C_OK = colors.HexColor("#065F46")  # green-800
_C_OK_BG = colors.HexColor("#D1FAE5")  # green-100
_C_ERR = colors.HexColor("#991B1B")  # red-800
_C_ERR_BG = colors.HexColor("#FEE2E2")  # red-100
_C_MUTED = colors.HexColor("#6B7280")  # gray-500

_ROLE_RU = {
    "subject": "субъект",
    "counterpart": "контрагент",
    "head": "глава",
    "object": "объект",
    "content": "содержание",
    "addressee": "адресат",
    "recipient": "получатель",
    "mediator": "посредник",
    "source": "источник",
    "location": "место",
    "starting_point": "нач. точка",
    "end_point": "кон. точка",
    "route": "маршрут",
    "medium": "среда",
    "instrument": "инструмент",
    "manner": "способ",
    "condition": "условие",
    "motivation": "мотивировка",
    "cause": "причина",
    "result": "результат",
    "purpose": "цель",
    "aspect": "аспект",
    "quantity": "количество",
    "duration": "срок",
    "time": "время",
}


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
                "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
            ]

            bold_font_paths = [
                "/app/fonts/DejaVuSans-Bold.ttf",
                "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
            ]

            for path in font_paths:
                if os.path.exists(path):
                    pdfmetrics.registerFont(TTFont("DejaVu", path))
                    logger.info(f"Registered regular font: {path}")
                    break
            else:
                pdfmetrics.registerFont(TTFont("DejaVu", "Helvetica"))
                logger.warning("Using Helvetica as fallback")

            for path in bold_font_paths:
                if os.path.exists(path):
                    pdfmetrics.registerFont(TTFont("DejaVu-Bold", path))
                    logger.info(f"Registered bold font: {path}")
                    break
            else:
                pdfmetrics.registerFont(TTFont("DejaVu-Bold", "Helvetica-Bold"))

        except Exception as e:
            logger.error(f"Font registration error: {e}")
            pdfmetrics.registerFont(TTFont("DejaVu", "Helvetica"))
            pdfmetrics.registerFont(TTFont("DejaVu-Bold", "Helvetica-Bold"))

    def _setup_styles(self):
        self.styles.add(
            ParagraphStyle(
                name="CustomTitle",
                fontName="DejaVu-Bold",
                fontSize=24,
                alignment=TA_CENTER,
                spaceAfter=30,
                textColor=colors.HexColor("#2E4053"),
            )
        )

        self.styles.add(
            ParagraphStyle(
                name="SectionHeader",
                fontName="DejaVu-Bold",
                fontSize=16,
                alignment=TA_LEFT,
                spaceBefore=20,
                spaceAfter=10,
                textColor=colors.HexColor("#2874A6"),
            )
        )

        self.styles.add(
            ParagraphStyle(
                name="StatsText",
                fontName="DejaVu",
                fontSize=11,
                alignment=TA_LEFT,
                spaceBefore=5,
                spaceAfter=5,
                textColor=colors.HexColor("#1C2833"),
            )
        )

    def _truncate_text(self, text: str, max_length: int = 25) -> str:
        if not text or text == "-":
            return "-"
        if len(text) > max_length:
            return text[: max_length - 3] + "..."
        return text

    async def generate_corpus_report(
        self, start_date: Optional[datetime] = None, end_date: Optional[datetime] = None
    ) -> bytes:
        buffer = BytesIO()

        doc = SimpleDocTemplate(
            buffer,
            pagesize=A4,
            rightMargin=72,
            leftMargin=72,
            topMargin=72,
            bottomMargin=72,
            title="Корпусный отчёт",
        )

        story = []

        story.append(Paragraph("Отчёт по корпусу текстов", self.styles["CustomTitle"]))
        story.append(
            Paragraph(
                f"Сгенерировано: {datetime.now().strftime('%d.%m.%Y %H:%M')}",
                self.styles["StatsText"],
            )
        )
        story.append(Spacer(1, 0.3 * inch))

        filters = []
        if start_date:
            filters.append(Document.created_at >= start_date)
        if end_date:
            filters.append(Document.created_at <= end_date)

        if start_date or end_date:
            story.append(Paragraph("Фильтры:", self.styles["SectionHeader"]))
            filter_text = []
            if start_date:
                filter_text.append(f"с {start_date.strftime('%d.%m.%Y')}")
            if end_date:
                filter_text.append(f"по {end_date.strftime('%d.%m.%Y')}")
            story.append(Paragraph(" ".join(filter_text), self.styles["StatsText"]))
            story.append(Spacer(1, 0.2 * inch))

        await self._add_summary_stats(story, filters)
        await self._add_top_lemmas(story, limit=100)
        await self._add_top_wordforms(story, limit=100)
        await self._add_top_documents(story, filters, limit=20)

        doc.build(story)

        pdf_bytes = buffer.getvalue()
        buffer.close()

        return pdf_bytes

    def _header_table_style(self, col_widths):
        return TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), _C_HEADER_ALT),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                ("FONTNAME", (0, 0), (-1, 0), "DejaVu-Bold"),
                ("FONTNAME", (0, 1), (-1, -1), "DejaVu"),
                ("FONTSIZE", (0, 0), (-1, -1), 8),
                ("ROWBACKGROUNDS", (0, 1), (-1, -1), [_C_ROW_ODD, _C_ROW_EVEN]),
                ("GRID", (0, 0), (-1, -1), 0.5, _C_GRID),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("TOPPADDING", (0, 0), (-1, -1), 4),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
                ("LEFTPADDING", (0, 0), (-1, -1), 6),
            ]
        )

    def _section_rule(self):
        return HRFlowable(
            width="100%", thickness=0.5, color=_C_GRID, spaceAfter=6, spaceBefore=2
        )

    async def generate_document_report(self, doc_id: int) -> bytes:
        buffer = BytesIO()

        doc_query = await self.db.execute(select(Document).where(Document.id == doc_id))
        doc = doc_query.scalar_one_or_none()

        if not doc:
            raise ValueError(f"Документ {doc_id} не найден")

        doc_template = SimpleDocTemplate(
            buffer, pagesize=A4, title=f"Отчёт: {doc.title}"
        )

        story = []

        story.append(Paragraph("Анализ документа", self.styles["CustomTitle"]))
        story.append(Spacer(1, 0.2 * inch))

        story.append(Paragraph("Метаданные", self.styles["SectionHeader"]))
        story.append(Paragraph(f"Название: {doc.title}", self.styles["StatsText"]))
        story.append(
            Paragraph(f"Автор: {doc.author or 'Не указан'}", self.styles["StatsText"])
        )
        story.append(Paragraph(f"Язык: {doc.language}", self.styles["StatsText"]))
        story.append(
            Paragraph(f"Год: {doc.year or 'Не указан'}", self.styles["StatsText"])
        )
        story.append(Paragraph(f"Токенов: {doc.word_count}", self.styles["StatsText"]))
        story.append(Spacer(1, 0.2 * inch))

        await self._add_document_stats(story, doc_id)
        await self._add_document_lemmas(story, doc_id, limit=50)
        await self._add_document_wordforms(story, doc_id, limit=50)

        doc_template.build(story)

        pdf_bytes = buffer.getvalue()
        buffer.close()

        return pdf_bytes

    async def _build_sentence_syntax_table(self, tokens: List[Token]) -> Table:
        word_by_position = {t.position: t.word for t in tokens}

        data = [["№", "Слово", "Лемма", "POS", "Head", "Отношение"]]
        for idx, tok in enumerate(tokens, start=1):
            head_word = "-"
            if tok.head:
                head_word = tok.head
            elif (
                tok.head_position is not None and tok.head_position in word_by_position
            ):
                head_word = word_by_position[tok.head_position]

            data.append(
                [
                    str(idx),
                    self._truncate_text(tok.word, 20),
                    self._truncate_text(tok.lemma, 20),
                    self._truncate_text(tok.pos, 10),
                    self._truncate_text(head_word, 20),
                    self._truncate_text(tok.dep, 15),
                ]
            )

        col_widths = [30, 100, 100, 70, 100, 90]
        table = Table(data, colWidths=col_widths)
        table.setStyle(
            TableStyle(
                [
                    ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#2874A6")),
                    ("TEXTCOLOR", (0, 0), (-1, 0), colors.whitesmoke),
                    ("ALIGN", (0, 0), (-1, -1), "LEFT"),
                    ("ALIGN", (0, 0), (0, -1), "CENTER"),
                    ("FONTNAME", (0, 0), (-1, 0), "DejaVu-Bold"),
                    ("FONTNAME", (0, 1), (-1, -1), "DejaVu"),
                    ("GRID", (0, 0), (-1, -1), 1, colors.HexColor("#CCD1D1")),
                    ("FONTSIZE", (0, 0), (-1, -1), 9),
                    ("WORDWRAP", (0, 0), (-1, -1), True),
                ]
            )
        )

        return table

    def _build_sentence_dependency_text(self, tokens: List[Token]) -> List[str]:
        word_by_position = {t.position: t.word for t in tokens}
        dep_lines = []

        for tok in tokens:
            if tok.dep and tok.head:
                dep_lines.append(
                    f"  {self._truncate_text(tok.word, 15)} → "
                    f"{self._truncate_text(tok.head, 15)} "
                    f"({self._truncate_text(tok.dep, 10)})"
                )
            elif tok.dep and tok.head_position is not None:
                head_word = word_by_position.get(tok.head_position, "?")
                dep_lines.append(
                    f"  {self._truncate_text(tok.word, 15)} → "
                    f"{self._truncate_text(head_word, 15)} "
                    f"({self._truncate_text(tok.dep, 10)})"
                )

        return dep_lines

    def _build_semantic_section(self, analysis: SentenceSemanticAnalysis) -> List:
        story = []
        S = self.styles

        story.append(Spacer(1, 0.3 * inch))
        story.append(Paragraph("Семантический анализ", S["CustomTitle"]))
        story.append(Spacer(1, 0.1 * inch))

        if analysis.interpretation:
            story.append(Paragraph("Интерпретация", S["SectionHeader"]))
            story.append(
                Paragraph(
                    f"<i>{analysis.interpretation}</i>",
                    S["StatsText"],
                )
            )
            story.append(Spacer(1, 0.15 * inch))

        vm = analysis.valency_model
        if vm:
            story.append(self._section_rule())
            story.append(Paragraph("Модель управления слова (МУС)", S["SectionHeader"]))

            meta_parts = []
            if vm.verb:
                meta_parts.append(f"Глагол: <b>{vm.verb}</b>")
            if vm.syntactic_voice:
                voice_ru = "актив" if vm.syntactic_voice == "active" else "пассив"
                meta_parts.append(f"Залог: {voice_ru}")
            if vm.separable is not None:
                meta_parts.append(
                    "Валентности отделимы" if vm.separable else "Валентности неотделимы"
                )
            if meta_parts:
                story.append(Paragraph("  ·  ".join(meta_parts), S["StatsText"]))
                story.append(Spacer(1, 0.08 * inch))

            if vm.slots:
                slot_data = [["Валентность", "Обязательность", "Форма реализации"]]
                for slot in vm.slots:
                    obligatory = "обязательная" if slot.obligatory else "факультативная"
                    slot_data.append(
                        [
                            _ROLE_RU.get(slot.role, slot.role),
                            obligatory,
                            slot.morpho_form or "—",
                        ]
                    )
                t = Table(slot_data, colWidths=[160, 120, 140])
                t.setStyle(self._header_table_style([160, 120, 140]))
                story.append(KeepTogether([t]))
            story.append(Spacer(1, 0.15 * inch))

        # ── Семантические валентности ─────────────────────────────────────────────
        sv = analysis.semantic_valences
        if sv:
            filled = {k: v for k, v in sv.model_dump().items() if v is not None}
            if filled:
                story.append(self._section_rule())
                story.append(Paragraph("Семантические валентности", S["SectionHeader"]))

                val_data = [["Роль", "Заполнитель"]]
                for role, value in filled.items():
                    val_data.append(
                        [
                            _ROLE_RU.get(role, role),
                            self._truncate_text(str(value), 80),
                        ]
                    )
                t = Table(val_data, colWidths=[130, 330])
                t.setStyle(self._header_table_style([130, 330]))
                story.append(KeepTogether([t]))
                story.append(Spacer(1, 0.15 * inch))

        dss = analysis.deep_syntactic_structure
        if dss and dss.predicate:
            story.append(self._section_rule())
            story.append(
                Paragraph("Глубинно-синтаксическая структура (ГСС)", S["SectionHeader"])
            )

            story.append(
                Paragraph(
                    f"Предикат: <b>{dss.predicate}</b>"
                    + (
                        f"  ·  залог: {'актив' if dss.syntactic_voice == 'active' else 'пассив'}"
                        if dss.syntactic_voice
                        else ""
                    ),
                    S["StatsText"],
                )
            )

            if dss.arguments:
                arg_data = [["Роль", "Лексема"]]
                for arg in dss.arguments:
                    arg_data.append(
                        [
                            _ROLE_RU.get(arg.role, arg.role),
                            self._truncate_text(arg.filler, 70),
                        ]
                    )
                t = Table(arg_data, colWidths=[130, 330])
                t.setStyle(self._header_table_style([130, 330]))
                story.append(Spacer(1, 0.06 * inch))
                story.append(KeepTogether([t]))

            if dss.paraphrase_note:
                story.append(Spacer(1, 0.06 * inch))
                story.append(
                    Paragraph(
                        f"<i>Заметка о перефразировании: {dss.paraphrase_note}</i>",
                        S["StatsText"],
                    )
                )
            story.append(Spacer(1, 0.15 * inch))

        lfs = analysis.lexical_functions
        if lfs:
            story.append(self._section_rule())
            story.append(Paragraph("Лексические функции", S["SectionHeader"]))

            lf_data = [["Функция", "Аргумент", "Значение", "Описание"]]
            for lf in lfs:
                composed = (
                    " ".join(lf.modifiers + [lf.base]) if lf.modifiers else lf.base
                )
                lf_data.append(
                    [
                        composed,
                        lf.argument or "—",
                        lf.value or "—",
                        self._truncate_text(lf.description or "—", 40),
                    ]
                )
            t = Table(lf_data, colWidths=[80, 100, 100, 180])
            t.setStyle(self._header_table_style([80, 100, 100, 180]))
            story.append(KeepTogether([t]))
            story.append(Spacer(1, 0.15 * inch))

        sa = analysis.semantic_agreement
        if sa:
            story.append(self._section_rule())
            story.append(Paragraph("Семантическое согласование", S["SectionHeader"]))

            if sa.consistent is not None:
                verdict_text = (
                    "✓  Семантически связно"
                    if sa.consistent
                    else "✗  Нарушение семантической связности"
                )
                verdict_bg = _C_OK_BG if sa.consistent else _C_ERR_BG
                verdict_fg = _C_OK if sa.consistent else _C_ERR
                verdict_tbl = Table(
                    [
                        [
                            Paragraph(
                                f'<font color="#{verdict_fg.hexval()[2:]}">'
                                f"<b>{verdict_text}</b></font>",
                                S["StatsText"],
                            )
                        ]
                    ],
                    colWidths=[460],
                )
                verdict_tbl.setStyle(
                    TableStyle(
                        [
                            ("BACKGROUND", (0, 0), (-1, -1), verdict_bg),
                            ("ROUNDEDCORNERS", [4]),
                            ("TOPPADDING", (0, 0), (-1, -1), 6),
                            ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
                            ("LEFTPADDING", (0, 0), (-1, -1), 10),
                        ]
                    )
                )
                story.append(verdict_tbl)

            if sa.notes:
                story.append(Spacer(1, 0.06 * inch))
                story.append(Paragraph(f"<i>{sa.notes}</i>", S["StatsText"]))

            if sa.violations:
                story.append(Spacer(1, 0.08 * inch))
                story.append(Paragraph("Нарушения связности:", S["StatsText"]))
                viol_data = [
                    ["Слово A", "Отношение", "Слово B", "Общие компоненты", "Вердикт"]
                ]
                for v in sa.violations:
                    components = (
                        ", ".join(v.shared_components) if v.shared_components else "—"
                    )
                    verdict_ru = "связно" if v.verdict == "connected" else "несвязно"
                    viol_data.append(
                        [
                            v.word_a,
                            v.relation,
                            v.word_b,
                            self._truncate_text(components, 35),
                            verdict_ru,
                        ]
                    )
                t = Table(viol_data, colWidths=[80, 90, 80, 150, 60])
                style = self._header_table_style([80, 90, 80, 150, 60])

                for i, v in enumerate(sa.violations, start=1):
                    if v.verdict == "disconnected":
                        style.add("BACKGROUND", (0, i), (-1, i), _C_ERR_BG)
                        style.add("TEXTCOLOR", (0, i), (-1, i), _C_ERR)
                t.setStyle(style)
                story.append(Spacer(1, 0.06 * inch))
                story.append(KeepTogether([t]))

            story.append(Spacer(1, 0.15 * inch))

        return story

    async def generate_sentence_report(
        self,
        doc_id: int,
        sentence_id: int,
        include_context: bool = False,
        context_size: int = 5,
    ) -> bytes:
        buffer = BytesIO()

        stmt = select(Sentence).where(
            and_(Sentence.doc_id == doc_id, Sentence.sentence_id == sentence_id)
        )
        result = await self.db.execute(stmt)
        sentence = result.scalar_one_or_none()
        if not sentence:
            raise ValueError(
                f"Предложение doc_id={doc_id}, sentence_id={sentence_id} не найдено"
            )

        doc_result = await self.db.execute(
            select(Document).where(Document.id == doc_id)
        )
        document = doc_result.scalar_one_or_none()
        doc_title = document.title if document else f"Документ {doc_id}"

        token_stmt = (
            select(Token)
            .where(and_(Token.doc_id == doc_id, Token.sentence_id == sentence_id))
            .order_by(Token.position)
        )
        token_result = await self.db.execute(token_stmt)
        tokens = token_result.scalars().all()

        cached_semantic = None
        semantic_stmt = select(SentenceSemanticAnalysis).where(
            and_(
                SentenceSemanticAnalysis.doc_id == doc_id,
                SentenceSemanticAnalysis.sentence_id == sentence_id,
            )
        )
        semantic_result = await self.db.execute(semantic_stmt)
        cached_row = semantic_result.scalar_one_or_none()
        if not cached_row:
            cached_semantic = None
        else:
            cached_semantic = cached_row.analysis
            if cached_semantic:
                cached_semantic = SemanticAnalysisResponse.model_validate(
                    cached_semantic
                )
            else:
                cached_semantic = None

        context_before = []
        context_after = []
        if include_context and context_size > 0:
            if sentence.start_position:
                before_stmt = (
                    select(Token)
                    .where(
                        and_(
                            Token.doc_id == doc_id,
                            Token.position < sentence.start_position,
                            Token.sentence_id != sentence_id,
                        )
                    )
                    .order_by(Token.position.desc())
                    .limit(context_size)
                )
                before_result = await self.db.execute(before_stmt)
                context_before = list(reversed(before_result.scalars().all()))

            if sentence.end_position:
                after_stmt = (
                    select(Token)
                    .where(
                        and_(
                            Token.doc_id == doc_id,
                            Token.position > sentence.end_position,
                            Token.sentence_id != sentence_id,
                        )
                    )
                    .order_by(Token.position)
                    .limit(context_size)
                )
                after_result = await self.db.execute(after_stmt)
                context_after = after_result.scalars().all()

        doc_template = SimpleDocTemplate(
            buffer,
            pagesize=A4,
            title=f"Предложение {sentence_id} – {doc_title}",
        )
        story = []

        story.append(Paragraph("Синтаксический анализ", self.styles["CustomTitle"]))
        story.append(Spacer(1, 0.2 * inch))

        story.append(
            Paragraph("Информация о предложении", self.styles["SectionHeader"])
        )
        story.append(Paragraph(f"Документ: {doc_title}", self.styles["StatsText"]))
        story.append(
            Paragraph(f"ID предложения: {sentence_id}", self.styles["StatsText"])
        )
        if sentence.text:
            story.append(Paragraph(f"Текст: {sentence.text}", self.styles["StatsText"]))
        if sentence.start_position:
            story.append(
                Paragraph(
                    f"Позиция: {sentence.start_position} – {sentence.end_position}",
                    self.styles["StatsText"],
                )
            )
        story.append(
            Paragraph(
                f"Количество токенов: {sentence.token_count}", self.styles["StatsText"]
            )
        )
        story.append(Spacer(1, 0.2 * inch))

        story.append(
            Paragraph("Токены и синтаксические связи", self.styles["SectionHeader"])
        )
        if tokens:
            table = await self._build_sentence_syntax_table(tokens)
            story.append(table)
        else:
            story.append(
                Paragraph("Нет токенов в предложении", self.styles["StatsText"])
            )
        story.append(Spacer(1, 0.3 * inch))

        if include_context:
            for label, ctx_tokens in [
                ("Контекст ДО предложения", context_before),
                ("Контекст ПОСЛЕ предложения", context_after),
            ]:
                if not ctx_tokens:
                    continue
                story.append(Paragraph(label, self.styles["SectionHeader"]))
                ctx_data = [["Слово", "Лемма", "POS"]]
                for tok in ctx_tokens:
                    ctx_data.append(
                        [
                            self._truncate_text(tok.word, 20),
                            self._truncate_text(tok.lemma, 20),
                            self._truncate_text(tok.pos, 10),
                        ]
                    )
                ctx_table = Table(ctx_data, colWidths=[150, 150, 100])
                ctx_table.setStyle(
                    TableStyle(
                        [
                            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#2874A6")),
                            ("TEXTCOLOR", (0, 0), (-1, 0), colors.whitesmoke),
                            ("FONTNAME", (0, 0), (-1, 0), "DejaVu-Bold"),
                            ("FONTNAME", (0, 1), (-1, -1), "DejaVu"),
                            ("GRID", (0, 0), (-1, -1), 1, colors.HexColor("#CCD1D1")),
                        ]
                    )
                )
                story.append(ctx_table)
                story.append(Spacer(1, 0.3 * inch))

        if cached_semantic:
            story.extend(self._build_semantic_section(cached_semantic))

        doc_template.build(story)
        pdf_bytes = buffer.getvalue()
        buffer.close()
        return pdf_bytes

    async def generate_document_syntax_report(self, doc_id: int) -> bytes:
        buffer = BytesIO()

        doc_result = await self.db.execute(
            select(Document).where(Document.id == doc_id)
        )
        document = doc_result.scalar_one_or_none()
        if not document:
            raise ValueError(f"Документ {doc_id} не найден")

        sentences_stmt = (
            select(Sentence)
            .where(Sentence.doc_id == doc_id)
            .order_by(Sentence.sentence_id)
        )
        sentences_result = await self.db.execute(sentences_stmt)
        sentences = sentences_result.scalars().all()

        if not sentences:
            doc_template = SimpleDocTemplate(
                buffer, pagesize=A4, title=f"Синтаксические разборы – {document.title}"
            )
            story = [
                Paragraph("Нет предложений в документе", self.styles["CustomTitle"])
            ]
            doc_template.build(story)
            return buffer.getvalue()

        tokens_stmt = (
            select(Token)
            .where(Token.doc_id == doc_id)
            .order_by(Token.sentence_id, Token.position)
        )
        tokens_result = await self.db.execute(tokens_stmt)
        all_tokens = tokens_result.scalars().all()

        tokens_by_sentence = {}
        for token in all_tokens:
            if token.sentence_id not in tokens_by_sentence:
                tokens_by_sentence[token.sentence_id] = []
            tokens_by_sentence[token.sentence_id].append(token)

        doc_template = SimpleDocTemplate(
            buffer, pagesize=A4, title=f"Синтаксические разборы – {document.title}"
        )
        story = []

        story.append(Paragraph("Синтаксический разбор", self.styles["CustomTitle"]))
        story.append(Spacer(1, 0.2 * inch))

        story.append(
            Paragraph(f"Документ: {document.title}", self.styles["SectionHeader"])
        )
        story.append(
            Paragraph(
                f"Автор: {document.author or 'Не указан'}", self.styles["StatsText"]
            )
        )
        story.append(Paragraph(f"Язык: {document.language}", self.styles["StatsText"]))
        story.append(
            Paragraph(f"Всего предложений: {len(sentences)}", self.styles["StatsText"])
        )
        story.append(Spacer(1, 0.3 * inch))

        for sentence_idx, sentence in enumerate(sentences, 1):
            story.append(
                Paragraph(
                    f"Предложение {sentence_idx} (ID: {sentence.sentence_id})",
                    self.styles["SectionHeader"],
                )
            )

            if sentence.text:
                story.append(
                    Paragraph(
                        f"<i>{self._truncate_text(sentence.text, 80)}</i>",
                        self.styles["StatsText"],
                    )
                )
            story.append(Spacer(1, 0.1 * inch))

            tokens = tokens_by_sentence.get(sentence.sentence_id, [])

            if tokens:
                table = await self._build_sentence_syntax_table(tokens)
                story.append(table)

                story.append(Spacer(1, 0.1 * inch))

                dep_lines = self._build_sentence_dependency_text(tokens)
                if dep_lines:
                    story.append(Paragraph("Связи:", self.styles["StatsText"]))
                    for line in dep_lines:
                        story.append(Paragraph(line, self.styles["StatsText"]))
            else:
                story.append(
                    Paragraph("Нет токенов в предложении", self.styles["StatsText"])
                )

            if sentence_idx < len(sentences):
                story.append(Spacer(1, 0.2 * inch))
                story.append(Paragraph("─" * 50, self.styles["StatsText"]))
                story.append(Spacer(1, 0.2 * inch))

        doc_template.build(story)
        pdf_bytes = buffer.getvalue()
        buffer.close()
        return pdf_bytes

    async def _add_summary_stats(self, story: list, filters: list):
        story.append(Paragraph("Общая статистика", self.styles["SectionHeader"]))

        query = select(func.count(Document.id))
        if filters:
            query = query.where(and_(*filters))
        total_docs = (await self.db.execute(query)).scalar() or 0

        query = select(func.coalesce(func.sum(Document.word_count), 0))
        if filters:
            query = query.where(and_(*filters))
        total_words = (await self.db.execute(query)).scalar() or 0

        unique_lemmas = (
            await self.db.execute(select(func.count(LemmaStats.id)))
        ).scalar() or 0

        unique_wordforms = (
            await self.db.execute(select(func.count(WordFormStats.id)))
        ).scalar() or 0

        data = [
            ["Показатель", "Значение"],
            ["Всего документов", str(total_docs)],
            ["Всего токенов", str(total_words)],
            [
                "Средний размер",
                f"{round(total_words / total_docs, 1) if total_docs > 0 else 0}",
            ],
            ["Уникальных лемм", str(unique_lemmas)],
            ["Уникальных словоформ", str(unique_wordforms)],
        ]

        table = Table(data, colWidths=[250, 200])
        table.setStyle(
            TableStyle(
                [
                    ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#2874A6")),
                    ("TEXTCOLOR", (0, 0), (-1, 0), colors.whitesmoke),
                    ("ALIGN", (0, 0), (-1, -1), "LEFT"),
                    ("FONTNAME", (0, 0), (-1, 0), "DejaVu-Bold"),
                    ("FONTNAME", (0, 1), (-1, -1), "DejaVu"),
                    ("BACKGROUND", (0, 1), (-1, -1), colors.HexColor("#F8F9F9")),
                    ("GRID", (0, 0), (-1, -1), 1, colors.HexColor("#CCD1D1")),
                ]
            )
        )

        story.append(table)
        story.append(Spacer(1, 0.3 * inch))

    async def _add_top_lemmas(self, story: list, limit: int = 50):
        story.append(
            Paragraph(f"Топ-{limit} самых частотных лемм", self.styles["SectionHeader"])
        )

        lemmas = (
            await self.db.execute(
                select(LemmaStats.lemma, LemmaStats.pos, LemmaStats.total_frequency)
                .order_by(desc(LemmaStats.total_frequency))
                .limit(limit)
            )
        ).all()

        if not lemmas:
            story.append(Paragraph("Нет данных", self.styles["StatsText"]))
            return

        data = [["№", "Лемма", "Часть речи", "Частотность"]]
        for i, (lemma, pos, freq) in enumerate(lemmas, 1):
            data.append([str(i), self._truncate_text(lemma, 25), pos or "-", str(freq)])

        table = Table(data, colWidths=[30, 200, 120, 100])
        table.setStyle(
            TableStyle(
                [
                    ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#2874A6")),
                    ("TEXTCOLOR", (0, 0), (-1, 0), colors.whitesmoke),
                    ("ALIGN", (0, 0), (-1, -1), "LEFT"),
                    ("ALIGN", (0, 0), (0, -1), "CENTER"),
                    ("FONTNAME", (0, 0), (-1, 0), "DejaVu-Bold"),
                    ("FONTNAME", (0, 1), (-1, -1), "DejaVu"),
                    ("GRID", (0, 0), (-1, -1), 1, colors.HexColor("#CCD1D1")),
                ]
            )
        )

        story.append(table)
        story.append(Spacer(1, 0.3 * inch))

    async def _add_top_wordforms(self, story: list, limit: int = 50):
        story.append(
            Paragraph(
                f"Топ-{limit} самых частотных словоформ", self.styles["SectionHeader"]
            )
        )

        wordforms = (
            await self.db.execute(
                select(
                    WordFormStats.word, WordFormStats.pos, WordFormStats.total_frequency
                )
                .order_by(desc(WordFormStats.total_frequency))
                .limit(limit)
            )
        ).all()

        if not wordforms:
            story.append(Paragraph("Нет данных", self.styles["StatsText"]))
            return

        data = [["№", "Словоформа", "Часть речи", "Частотность"]]
        for i, (word, pos, freq) in enumerate(wordforms, 1):
            data.append([str(i), self._truncate_text(word, 25), pos or "-", str(freq)])

        table = Table(data, colWidths=[30, 200, 120, 100])
        table.setStyle(
            TableStyle(
                [
                    ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#2874A6")),
                    ("TEXTCOLOR", (0, 0), (-1, 0), colors.whitesmoke),
                    ("ALIGN", (0, 0), (-1, -1), "LEFT"),
                    ("ALIGN", (0, 0), (0, -1), "CENTER"),
                    ("FONTNAME", (0, 0), (-1, 0), "DejaVu-Bold"),
                    ("FONTNAME", (0, 1), (-1, -1), "DejaVu"),
                    ("GRID", (0, 0), (-1, -1), 1, colors.HexColor("#CCD1D1")),
                ]
            )
        )

        story.append(table)
        story.append(Spacer(1, 0.3 * inch))

    async def _add_top_documents(self, story: list, filters: list, limit: int = 20):
        story.append(
            Paragraph(
                f"Топ-{limit} крупнейших документов", self.styles["SectionHeader"]
            )
        )

        query = select(Document)
        if filters:
            query = query.where(and_(*filters))
        query = query.order_by(desc(Document.word_count)).limit(limit)

        docs = (await self.db.execute(query)).scalars().all()

        if not docs:
            story.append(Paragraph("Нет данных", self.styles["StatsText"]))
            return

        data = [["№", "Название", "Автор", "Язык", "Слов"]]
        for i, doc in enumerate(docs, 1):
            title = self._truncate_text(doc.title, 35)
            data.append(
                [str(i), title, doc.author or "-", doc.language, str(doc.word_count)]
            )

        table = Table(data, colWidths=[30, 180, 100, 60, 80])
        table.setStyle(
            TableStyle(
                [
                    ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#2874A6")),
                    ("TEXTCOLOR", (0, 0), (-1, 0), colors.whitesmoke),
                    ("ALIGN", (0, 0), (-1, -1), "LEFT"),
                    ("ALIGN", (0, 0), (0, -1), "CENTER"),
                    ("ALIGN", (-1, 0), (-1, -1), "CENTER"),
                    ("FONTNAME", (0, 0), (-1, 0), "DejaVu-Bold"),
                    ("FONTNAME", (0, 1), (-1, -1), "DejaVu"),
                    ("GRID", (0, 0), (-1, -1), 1, colors.HexColor("#CCD1D1")),
                ]
            )
        )

        story.append(table)
        story.append(Spacer(1, 0.3 * inch))

    async def _add_document_stats(self, story: list, doc_id: int):
        story.append(Paragraph("Статистика документа", self.styles["SectionHeader"]))

        total_tokens = (
            await self.db.execute(
                select(func.count(Token.position)).where(Token.doc_id == doc_id)
            )
        ).scalar() or 0

        unique_lemmas = (
            await self.db.execute(
                select(func.count(func.distinct(Token.lemma))).where(
                    and_(Token.doc_id == doc_id, Token.lemma.isnot(None))
                )
            )
        ).scalar() or 0

        unique_wordforms = (
            await self.db.execute(
                select(func.count(func.distinct(Token.word))).where(
                    and_(Token.doc_id == doc_id, Token.word.isnot(None))
                )
            )
        ).scalar() or 0

        sentences = (
            await self.db.execute(
                select(func.count(func.distinct(Token.sentence_id))).where(
                    Token.doc_id == doc_id
                )
            )
        ).scalar() or 0

        data = [
            ["Показатель", "Значение"],
            ["Всего токенов", str(total_tokens)],
            ["Уникальных лемм", str(unique_lemmas)],
            ["Уникальных словоформ", str(unique_wordforms)],
            ["Предложений", str(sentences)],
            [
                "Средняя длина предложения",
                f"{round(total_tokens / sentences, 1) if sentences > 0 else 0}",
            ],
        ]

        table = Table(data, colWidths=[250, 200])
        table.setStyle(
            TableStyle(
                [
                    ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#2874A6")),
                    ("TEXTCOLOR", (0, 0), (-1, 0), colors.whitesmoke),
                    ("ALIGN", (0, 0), (-1, -1), "LEFT"),
                    ("FONTNAME", (0, 0), (-1, 0), "DejaVu-Bold"),
                    ("FONTNAME", (0, 1), (-1, -1), "DejaVu"),
                    ("BACKGROUND", (0, 1), (-1, -1), colors.HexColor("#F8F9F9")),
                    ("GRID", (0, 0), (-1, -1), 1, colors.HexColor("#CCD1D1")),
                ]
            )
        )

        story.append(table)
        story.append(Spacer(1, 0.3 * inch))

    async def _add_document_lemmas(self, story: list, doc_id: int, limit: int = 50):
        story.append(
            Paragraph(f"Топ-{limit} лемм в документе", self.styles["SectionHeader"])
        )

        lemmas = (
            await self.db.execute(
                select(
                    DocumentLemmaStats.lemma,
                    DocumentLemmaStats.pos,
                    DocumentLemmaStats.frequency,
                )
                .where(DocumentLemmaStats.doc_id == doc_id)
                .order_by(desc(DocumentLemmaStats.frequency))
                .limit(limit)
            )
        ).all()

        if not lemmas:
            story.append(Paragraph("Нет данных", self.styles["StatsText"]))
            return

        data = [["№", "Лемма", "Часть речи", "Частота"]]
        for i, (lemma, pos, freq) in enumerate(lemmas, 1):
            data.append([str(i), self._truncate_text(lemma, 25), pos or "-", str(freq)])

        table = Table(data, colWidths=[30, 200, 120, 100])
        table.setStyle(
            TableStyle(
                [
                    ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#2874A6")),
                    ("TEXTCOLOR", (0, 0), (-1, 0), colors.whitesmoke),
                    ("ALIGN", (0, 0), (-1, -1), "LEFT"),
                    ("ALIGN", (0, 0), (0, -1), "CENTER"),
                    ("FONTNAME", (0, 0), (-1, 0), "DejaVu-Bold"),
                    ("FONTNAME", (0, 1), (-1, -1), "DejaVu"),
                    ("GRID", (0, 0), (-1, -1), 1, colors.HexColor("#CCD1D1")),
                ]
            )
        )

        story.append(table)
        story.append(Spacer(1, 0.3 * inch))

    async def _add_document_wordforms(self, story: list, doc_id: int, limit: int = 50):
        story.append(
            Paragraph(
                f"Топ-{limit} словоформ в документе", self.styles["SectionHeader"]
            )
        )

        wordforms = (
            await self.db.execute(
                select(
                    DocumentWordFormStats.word,
                    DocumentWordFormStats.pos,
                    DocumentWordFormStats.frequency,
                )
                .where(DocumentWordFormStats.doc_id == doc_id)
                .order_by(desc(DocumentWordFormStats.frequency))
                .limit(limit)
            )
        ).all()

        if not wordforms:
            story.append(Paragraph("Нет данных", self.styles["StatsText"]))
            return

        data = [["№", "Словоформа", "Часть речи", "Частота"]]
        for i, (word, pos, freq) in enumerate(wordforms, 1):
            data.append([str(i), self._truncate_text(word, 25), pos or "-", str(freq)])

        table = Table(data, colWidths=[30, 200, 120, 100])
        table.setStyle(
            TableStyle(
                [
                    ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#2874A6")),
                    ("TEXTCOLOR", (0, 0), (-1, 0), colors.whitesmoke),
                    ("ALIGN", (0, 0), (-1, -1), "LEFT"),
                    ("ALIGN", (0, 0), (0, -1), "CENTER"),
                    ("FONTNAME", (0, 0), (-1, 0), "DejaVu-Bold"),
                    ("FONTNAME", (0, 1), (-1, -1), "DejaVu"),
                    ("GRID", (0, 0), (-1, -1), 1, colors.HexColor("#CCD1D1")),
                ]
            )
        )

        story.append(table)
        story.append(Spacer(1, 0.3 * inch))
