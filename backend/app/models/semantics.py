from pydantic import BaseModel
from typing import Optional, List


class SemanticValences(BaseModel):
    """25 семантических валентностей"""
    subject: Optional[str] = None          # 1. субъект
    counterpart: Optional[str] = None      # 2. контрагент
    head: Optional[str] = None             # 3. глава
    object: Optional[str] = None           # 4. объект
    content: Optional[str] = None          # 5. содержание
    addressee: Optional[str] = None        # 6. адресат
    recipient: Optional[str] = None        # 7. получатель
    mediator: Optional[str] = None         # 8. посредник
    source: Optional[str] = None           # 9. источник
    location: Optional[str] = None         # 10. место
    starting_point: Optional[str] = None   # 11. начальная точка
    end_point: Optional[str] = None        # 12. конечная точка
    route: Optional[str] = None            # 13. маршрут
    medium: Optional[str] = None           # 14. средство
    instrument: Optional[str] = None       # 15. инструмент
    manner: Optional[str] = None           # 16. способ
    condition: Optional[str] = None        # 17. условие
    motivation: Optional[str] = None       # 18. мотивировка
    cause: Optional[str] = None            # 19. причина
    result: Optional[str] = None           # 20. результат
    purpose: Optional[str] = None          # 21. цель
    aspect: Optional[str] = None           # 22. аспект
    quantity: Optional[str] = None         # 23. количество
    duration: Optional[str] = None         # 24. срок
    time: Optional[str] = None             # 25. время


class LexicalFunction(BaseModel):
    """Лексическая функция"""
    function: str      # Magn, Caus, Anti, S0, S1, S2, Oper1, Oper2, Func, Labor, Incep, Fin, Real
    marker: str        # слово, выражающее функцию
    target: str        # целевое слово
    description: str   # описание


class ValencyModel(BaseModel):
    """Модель управления слова"""
    verb: str
    mandatory: List[str] = []
    optional: List[str] = []
    separable: bool = True
    syntactic_voice: str = "active"  # active / passive


class DeepSyntacticStructure(BaseModel):
    """Глубинно-синтаксическая структура"""
    predicate: str
    arguments: dict = {}
    syntactic_realization: Optional[str] = None


class SemanticAgreement(BaseModel):
    """Семантическое согласование"""
    consistent: bool
    violations: List[str] = []
    notes: str = ""


class SemanticAnalysisResponse(BaseModel):
    """Полный ответ семантико-синтаксического анализа"""
    sentence: str
    semantic_valences: SemanticValences = SemanticValences()
    valency_model: ValencyModel
    lexical_functions: List[LexicalFunction] = []
    deep_syntactic_structure: DeepSyntacticStructure
    semantic_agreement: SemanticAgreement