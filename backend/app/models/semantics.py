from pydantic import BaseModel, Field
from typing import List, Dict, Optional, Any
from typing_extensions import Literal


class SemanticValences(BaseModel):
    """25 семантических валентностей"""
    # Make ALL fields required (they can still be empty strings or null)
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
        # This ensures all fields are in required
        schema_extra = {
            "required": [  # Explicitly list all 25 fields
                "subject", "counterpart", "head", "object", "content",
                "addressee", "recipient", "mediator", "source", "location",
                "starting_point", "end_point", "route", "medium", "instrument",
                "manner", "condition", "motivation", "cause", "result",
                "purpose", "aspect", "quantity", "duration", "time"
            ]
        }


class LexicalFunction(BaseModel):
    function: str = Field(...)
    marker: str = Field(...)
    target: str = Field(...)
    description: str = Field(...)
    
    class Config:
        extra = "forbid"
        schema_extra = {
            "required": ["function", "marker", "target", "description"]
        }


class ValencyModel(BaseModel):
    verb: str = Field(...)
    mandatory: List[str] = Field(default_factory=list)
    optional: List[str] = Field(default_factory=list)
    separable: bool = Field(True)
    syntactic_voice: str = Field("active")
    
    class Config:
        extra = "forbid"
        schema_extra = {
            "required": ["verb", "mandatory", "optional", "separable", "syntactic_voice"]
        }


class DeepSyntacticStructure(BaseModel):
    predicate: str = Field(...)
    arguments: Dict[str, str] = Field(default_factory=dict)
    syntactic_realization: Optional[str] = Field(None)
    
    class Config:
        extra = "forbid"
        schema_extra = {
            "required": ["predicate", "arguments", "syntactic_realization"]
        }


class SemanticAgreement(BaseModel):
    consistent: bool = Field(...)
    violations: List[str] = Field(default_factory=list)
    notes: str = Field("")
    
    class Config:
        extra = "forbid"
        schema_extra = {
            "required": ["consistent", "violations", "notes"]
        }


class SemanticAnalysisResponse(BaseModel):
    sentence: str = Field(...)
    semantic_valences: SemanticValences = Field(default_factory=SemanticValences)
    valency_model: ValencyModel = Field(...)
    lexical_functions: List[LexicalFunction] = Field(default_factory=list)
    deep_syntactic_structure: DeepSyntacticStructure = Field(...)
    semantic_agreement: SemanticAgreement = Field(...)
    
    class Config:
        extra = "forbid"
        schema_extra = {
            "required": [
                "sentence", 
                "semantic_valences", 
                "valency_model", 
                "lexical_functions", 
                "deep_syntactic_structure", 
                "semantic_agreement"
            ]
        }