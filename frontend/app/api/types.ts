export interface DocumentResponse {
  title: string;
  author: string | null;
  year: number | null;
  language: string;
  id: number;
  source_file: string;
  file_type: string;
  word_count: number;
  created_at: string;  
  updated_at: string;
}

export interface LemmaStatsResponse {
  lemma: string;
  pos: string | null;
  total_frequency: number;
  id: number;
  last_updated: string;
}

export interface LemmaStatsListResponse {
  items: LemmaStatsResponse[];
  total: number;
  skip: number;
  limit: number;
}

export interface LemmaStatsUpdate {
  total_frequency?: number | null;
  last_updated?: string | null;  
}

export interface WordFormStatsResponse {
  word: string;
  pos: string | null;
  total_frequency: number;  
  id: number;
  last_updated: string;  

}

export interface WordFormStatsListResponse {
  items: WordFormStatsResponse[];
  total: number;
  skip: number;
  limit: number;
}

export interface WordFormStatsUpdate {
  total_frequency?: number | null;
  last_updated?: string | null;
}

export interface DocumentLemmaStatsResponse {
  doc_id: number;
  lemma: string;
  pos: string | null;
  frequency: number;  
  tfidf: number | null;
}

export interface DocumentLemmaStatsListResponse {
  items: DocumentLemmaStatsResponse[];
  total: number;
  skip: number;
  limit: number;
}

export interface DocumentWordFormStatsResponse {
  doc_id: number;
  word: string;
  pos: string | null;
  frequency: number;  
  tfidf: number | null;
}

export interface DocumentWordFormStatsListResponse {
  items: DocumentWordFormStatsResponse[];
  total: number;
  skip: number;
  limit: number;
}

export interface SearchResult {
  doc_id: number;
  word: string;
  lemma: string | null;  
  pos: string | null;     
  left_context: string | null;   
  right_context: string | null;  
  metadata: Record<string, any> | null;  
  score: number | null;  
  position_start: number | null;
  position_end: number | null;
}

export interface SearchResponse {
  total: number;
  page: number;
  page_size: number;
  results: SearchResult[];
  query: string | null;
  mode: string | null;
  search_type: string | null;
  slop: number | null;
  fuzziness: string | null;
}

export interface UploadResponse {
  filename: string;
  document_id: number;
  word_count: number;
  processing_time: number;
}

export interface UploadFileBody {
  file: File;
  title?: string | null;
  author?: string | null;
  year?: number | null;
}

export interface ValidationError {
  loc: (string | number)[];
  msg: string;
  type: string;
  input?: any;
  ctx?: Record<string, any>;
}

export interface HTTPValidationError {
  detail?: ValidationError[];
}

export interface TokenResponse {
  doc_id: number;
  sentence_id: number;
  position: number;
  word: string;
  lemma: string;
  pos: string | null;
  tag: string | null;  
  dep: string | null;  
  ner: string | null;  
  morph: Record<string, string> | null;  
  is_punctuation: boolean;
  is_stopword: boolean;
  head_position: number | null;  
}

export interface TokenListResponse {
  items: TokenResponse[];
  total: number;
  skip: number;
  limit: number;
}

export interface TokenDetailResponse extends TokenResponse {
  left_context: string;  
  right_context: string;  
  children_positions: number[];  
  metadata: Record<string, any> | null;
}

export interface TokenPosAggregate {
  pos: string;
  count: number;
  percentage: number;
  unique_words: number;
  examples: string[];  
}

export interface TokenPosListResponse {
  items: TokenPosAggregate[];
  total_tokens: number;
  total_unique_words: number;
}

export interface DocumentTokenStats {
  doc_id: number;
  total_tokens: number;
  total_sentences: number;
  unique_words: number;
  unique_lemmas: number;
  avg_sentence_length: number;
  pos_distribution: TokenPosAggregate[];
  top_words: Array<{ word: string; frequency: number }>;
  top_lemmas: Array<{ lemma: string; frequency: number }>;
}