from typing import Dict, List, Optional

from pydantic import BaseModel, ConfigDict, Field
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


class LexicalFunction(BaseModel):
    model_config = ConfigDict(extra="forbid")

    function: Optional[str] = None
    marker: Optional[str] = None
    target: Optional[str] = None
    description: Optional[str] = None


class ValencyModel(BaseModel):
    model_config = ConfigDict(extra="forbid")

    verb: Optional[str] = None
    mandatory: Optional[List[str]] = None
    optional: Optional[List[str]] = None
    separable: Optional[bool] = None
    syntactic_voice: Optional[Literal["active", "passive"]] = None


class DeepSyntacticStructure(BaseModel):
    model_config = ConfigDict(extra="forbid")

    predicate: Optional[str] = None
    arguments: Optional[Dict[str, str]] = None
    syntactic_realization: Optional[str] = None


class SemanticAgreement(BaseModel):
    model_config = ConfigDict(extra="forbid")

    consistent: Optional[bool] = None
    violations: Optional[List[str]] = None
    notes: Optional[str] = None


class SemanticAnalysisResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    sentence: Optional[str] = None
    semantic_valences: Optional[SemanticValences] = None
    valency_model: Optional[ValencyModel] = None
    lexical_functions: Optional[List[LexicalFunction]] = None
    deep_syntactic_structure: Optional[DeepSyntacticStructure] = None
    semantic_agreement: Optional[SemanticAgreement] = None
