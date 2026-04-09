from typing import Dict, List, Optional

from pydantic import BaseModel, ConfigDict
from typing_extensions import Literal


class SemanticValences(BaseModel):
    model_config = ConfigDict(extra="forbid")

    subject: Optional[str] = None
    counterpart: Optional[str] = None
    head: Optional[str] = None
    object: Optional[str] = None
    content: Optional[str] = None
    addressee: Optional[str] = None
    recipient: Optional[str] = None
    mediator: Optional[str] = None
    source: Optional[str] = None
    location: Optional[str] = None
    starting_point: Optional[str] = None
    end_point: Optional[str] = None
    route: Optional[str] = None
    medium: Optional[str] = None
    instrument: Optional[str] = None
    manner: Optional[str] = None
    condition: Optional[str] = None
    motivation: Optional[str] = None
    cause: Optional[str] = None
    result: Optional[str] = None
    purpose: Optional[str] = None
    aspect: Optional[str] = None
    quantity: Optional[str] = None
    duration: Optional[str] = None
    time: Optional[str] = None


class ValencySlot(BaseModel):
    model_config = ConfigDict(extra="forbid")

    role: str
    obligatory: bool
    morpho_form: Optional[str] = None


class ValencyModel(BaseModel):
    model_config = ConfigDict(extra="forbid")

    verb: Optional[str] = None
    slots: Optional[List[ValencySlot]] = None
    separable: Optional[bool] = None
    syntactic_voice: Optional[Literal["active", "passive"]] = None


class LexicalFunction(BaseModel):
    model_config = ConfigDict(extra="forbid")

    base: Literal[
        "Oper1",
        "Oper2",
        "Func0",
        "Func1",
        "Func2",
        "Labor12",
        "Labor21",
        "Caus",
        "Liqu",
        "Perm",
        "Incep",
        "Fin",
        "Cont",
        "Real1",
        "Real2",
        "Perf",
        "Magn",
        "Bon",
        "Anti",
        "Syn",
        "Gener",
        "S0",
        "A0",
        "V0",
        "Manif",
        "Result",
    ]
    modifiers: Optional[List[str]] = None
    argument: Optional[str] = None
    value: Optional[str] = None
    description: Optional[str] = None


class DSSArgument(BaseModel):
    model_config = ConfigDict(extra="forbid")

    role: str
    filler: str


class DeepSyntacticStructure(BaseModel):
    model_config = ConfigDict(extra="forbid")

    predicate: Optional[str] = None
    arguments: Optional[List[DSSArgument]] = None
    syntactic_voice: Optional[Literal["active", "passive"]] = None
    paraphrase_note: Optional[str] = None


class SemanticViolation(BaseModel):
    model_config = ConfigDict(extra="forbid")

    word_a: str
    word_b: str
    relation: str
    shared_components: List[str]
    verdict: Literal["connected", "disconnected"]


class SemanticAgreement(BaseModel):
    model_config = ConfigDict(extra="forbid")

    consistent: Optional[bool] = None
    violations: Optional[List[SemanticViolation]] = None
    notes: Optional[str] = None


class SemanticAnalysisResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    sentence: Optional[str] = None
    interpretation: Optional[str] = None
    semantic_valences: Optional[SemanticValences] = None
    valency_model: Optional[ValencyModel] = None
    lexical_functions: Optional[List[LexicalFunction]] = None
    deep_syntactic_structure: Optional[DeepSyntacticStructure] = None
    semantic_agreement: Optional[SemanticAgreement] = None
