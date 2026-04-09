import apiClient from "./client";
import type {
  TokenListResponse,
  TokenDetailResponse,
  TokenPosListResponse,
  DocumentTokenStats,
} from "./types";

export interface GetTokensParams {
  skip?: number;
  limit?: number;
  doc_id?: number | null;
  pos?: string | null;
  search_word?: string | null;
  search_lemma?: string | null;
  sentence_id?: number | null;
  is_punctuation?: boolean | null;
  is_stopword?: boolean | null;
  entity_iob?: string | null;
  entity_type?: string | null;
  entity_description?: string | null;
}

export const tokensApi = {
  getTokens: async (
    params: GetTokensParams = {},
  ): Promise<TokenListResponse> => {
    const {
      skip = 0,
      limit = 100,
      doc_id = null,
      pos = null,
      search_word = null,
      search_lemma = null,
      sentence_id = null,
      is_punctuation = null,
      is_stopword = null,
      entity_iob = null,
      entity_type = null,
      entity_description = null,
    } = params;

    const response = await apiClient.get<TokenListResponse>("api/tokens/", {
      params: {
        skip,
        limit,
        ...(doc_id !== null && { doc_id }),
        ...(pos && { pos }),
        ...(search_word && { search_word }),
        ...(search_lemma && { search_lemma }),
        ...(sentence_id !== null && { sentence_id }),
        ...(is_punctuation !== null && { is_punctuation }),
        ...(is_stopword !== null && { is_stopword }),
        ...(entity_iob && { entity_iob }),
        ...(entity_type && { entity_type }),
        ...(entity_description && { entity_description }),
      },
    });
    return response.data;
  },

  getTokenDetail: async (
    doc_id: number,
    position: number,
  ): Promise<TokenDetailResponse> => {
    const response = await apiClient.get<TokenDetailResponse>(
      `api/tokens/${doc_id}/${position}`,
    );
    return response.data;
  },

  getPosStats: async (): Promise<TokenPosListResponse> => {
    const response =
      await apiClient.get<TokenPosListResponse>("api/tokens/pos");
    return response.data;
  },

  getDocumentTokenStats: async (
    doc_id: number,
  ): Promise<DocumentTokenStats> => {
    const response = await apiClient.get<DocumentTokenStats>(
      `api/tokens/document/${doc_id}/stats`,
    );
    return response.data;
  },
};
