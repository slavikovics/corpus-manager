export interface SemanticValences {
  subject: string | null;
  counterpart: string | null;
  head: string | null;
  object: string | null;
  content: string | null;
  addressee: string | null;
  recipient: string | null;
  mediator: string | null;
  source: string | null;
  location: string | null;
  starting_point: string | null;
  end_point: string | null;
  route: string | null;
  medium: string | null;
  instrument: string | null;
  manner: string | null;
  condition: string | null;
  motivation: string | null;
  cause: string | null;
  result: string | null;
  purpose: string | null;
  aspect: string | null;
  quantity: string | null;
  duration: string | null;
  time: string | null;
}

export interface ValencySlot {
  role: string;
  obligatory: boolean;
  morpho_form: string | null;
}

export interface ValencyModel {
  verb: string | null;
  slots: ValencySlot[] | null;
  separable: boolean | null;
  syntactic_voice: "active" | "passive" | null;
}

export type LexicalFunctionBase =
  | "Oper1"
  | "Oper2"
  | "Func0"
  | "Func1"
  | "Func2"
  | "Labor12"
  | "Labor21"
  | "Caus"
  | "Liqu"
  | "Perm"
  | "Incep"
  | "Fin"
  | "Cont"
  | "Real1"
  | "Real2"
  | "Perf"
  | "Magn"
  | "Bon"
  | "Anti"
  | "Syn"
  | "Gener"
  | "S0"
  | "A0"
  | "V0"
  | "Manif"
  | "Result";

export interface LexicalFunction {
  base: LexicalFunctionBase;
  modifiers: string[] | null;
  argument: string | null;
  value: string | null;
  description: string | null;
}

export interface DSSArgument {
  role: string;
  filler: string;
}

export interface DeepSyntacticStructure {
  predicate: string | null;
  arguments: DSSArgument[] | null;
  syntactic_voice: "active" | "passive" | null;
  paraphrase_note: string | null;
}

export interface SemanticViolation {
  word_a: string;
  word_b: string;
  relation: string;
  shared_components: string[];
  verdict: "connected" | "disconnected";
}

export interface SemanticAgreement {
  consistent: boolean | null;
  violations: SemanticViolation[] | null;
  notes: string | null;
}

export interface SemanticAnalysisResponse {
  sentence: string | null;
  interpretation: string | null;
  semantic_valences: SemanticValences | null;
  valency_model: ValencyModel | null;
  lexical_functions: LexicalFunction[] | null;
  deep_syntactic_structure: DeepSyntacticStructure | null;
  semantic_agreement: SemanticAgreement | null;
}

export interface SemanticAnalysisRequest {
  doc_id: number;
  sentence_id: number;
  sentence: string;
}
