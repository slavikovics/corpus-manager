from pydantic import BaseModel, Field
from typing import List, Dict, Optional
from typing_extensions import Literal


class SemanticValences(BaseModel):
    subject: Optional[str] = Field(None)
    counterpart: Optional[str] = Field(None)
    head: Optional[str] = Field(None)
    object: Optional[str] = Field(None)
    content: Optional[str] = Field(None)
    addressee: Optional[str] = Field(None)
    recipient: Optional[str] = Field(None)
    mediator: Optional[str] = Field(None)
    source: Optional[str] = Field(None)
    location: Optional[str] = Field(None)
    starting_point: Optional[str] = Field(None)
    end_point: Optional[str] = Field(None)
    route: Optional[str] = Field(None)
    medium: Optional[str] = Field(None)
    instrument: Optional[str] = Field(None)
    manner: Optional[str] = Field(None)
    condition: Optional[str] = Field(None)
    motivation: Optional[str] = Field(None)
    cause: Optional[str] = Field(None)
    result: Optional[str] = Field(None)
    purpose: Optional[str] = Field(None)
    aspect: Optional[str] = Field(None)
    quantity: Optional[str] = Field(None)
    duration: Optional[str] = Field(None)
    time: Optional[str] = Field(None)
    
    class Config:
        extra = "forbid"


class LexicalFunction(BaseModel):
    function: str = Field(...)
    marker: str = Field(...)
    target: str = Field(...)
    description: str = Field(...)
    
    class Config:
        extra = "forbid"


class ValencyModel(BaseModel):
    verb: str = Field(...)
    mandatory: List[str] = Field(default_factory=list)
    optional: List[str] = Field(default_factory=list)
    separable: bool = Field(True)
    syntactic_voice: Literal["active", "passive"] = Field("active")
    
    class Config:
        extra = "forbid"


class DeepSyntacticStructure(BaseModel):
    predicate: str = Field(...)
    arguments: Dict[str, str] = Field(default_factory=dict)
    syntactic_realization: Optional[str] = Field(None)
    
    class Config:
        extra = "forbid"


class SemanticAgreement(BaseModel):
    consistent: bool = Field(...)
    violations: List[str] = Field(default_factory=list)
    notes: str = Field("")
    
    class Config:
        extra = "forbid"


class SemanticAnalysisResponse(BaseModel):
    sentence: str = Field(...)
    semantic_valences: SemanticValences = Field(default_factory=SemanticValences)
    valency_model: ValencyModel = Field(...)
    lexical_functions: List[LexicalFunction] = Field(default_factory=list)
    deep_syntactic_structure: DeepSyntacticStructure = Field(...)
    semantic_agreement: SemanticAgreement = Field(...)
    
    class Config:
        extra = "forbid"