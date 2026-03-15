import apiClient from './client';
import type { 
  SentenceListResponse, 
  SentenceDetailResponse,
  SentenceSearchResponse
} from './types';

export interface GetSentencesParams {
  skip?: number;
  limit?: number;
  doc_id?: number | null;
  search_text?: string | null;
  min_tokens?: number | null;
  max_tokens?: number | null;
  include_document_metadata?: boolean;
}

export interface GetSentenceDetailParams {
  include_context?: boolean;
  context_size?: number;
}

export const sentencesApi = {
  getSentences: async (params: GetSentencesParams = {}): Promise<SentenceListResponse> => {
    const {
      skip = 0,
      limit = 100,
      doc_id = null,
      search_text = null,
      min_tokens = null,
      max_tokens = null,
      include_document_metadata = true,
    } = params;

    const response = await apiClient.get<SentenceListResponse>('api/sentences/', {
      params: {
        skip,
        limit,
        ...(doc_id !== null && { doc_id }),
        ...(search_text && { search_text }),
        ...(min_tokens !== null && { min_tokens }),
        ...(max_tokens !== null && { max_tokens }),
        include_document_metadata,
      }
    });
    return response.data;
  },

  getSentenceDetail: async (
    doc_id: number, 
    sentence_id: number, 
    params: GetSentenceDetailParams = {}
  ): Promise<SentenceDetailResponse> => {
    const {
      include_context = false,
      context_size = 5,
    } = params;

    const response = await apiClient.get<SentenceDetailResponse>(
      `api/sentences/${doc_id}/${sentence_id}`,
      {
        params: {
          include_context,
          context_size,
        }
      }
    );
    return response.data;
  },

  getSentencePlainText: async (doc_id: number, sentence_id: number): Promise<string> => {
    const response = await apiClient.get<string>(`api/sentences/${doc_id}/${sentence_id}/plain`);
    return response.data;
  },

  searchSentencesByWord: async (
    word: string,
    doc_id?: number | null,
    case_sensitive: boolean = false,
    limit: number = 50
  ): Promise<SentenceSearchResponse> => {
    const response = await apiClient.get<SentenceSearchResponse>(
      `api/sentences/search/by_word/${encodeURIComponent(word)}`,
      {
        params: {
          ...(doc_id !== undefined && { doc_id }),
          case_sensitive,
          limit,
        }
      }
    );
    return response.data;
  },
};