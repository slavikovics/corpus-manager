import apiClient from './client';
import type { WordFormStatsListResponse, WordFormStatsResponse, WordFormStatsUpdate } from './types';
export interface GetWordFormsParams {
  skip?: number;
  limit?: number;
  search?: string | null;
  min_frequency?: number | null;
  pos?: string | null;
}
export const wordFormsApi = {
  getWordForms: async (params: GetWordFormsParams = {}): Promise<WordFormStatsListResponse> => {
    const {
      skip = 0,
      limit = 100,
      search = null,
      min_frequency = null,
      pos = null
    } = params;
    const response = await apiClient.get<WordFormStatsListResponse>('api/word-form-stats/global/', {
      params: {
        skip,
        limit,
        ...(search && { search }),
        ...(min_frequency !== null && { min_frequency }),
        ...(pos && { pos })
      }
    });
    return response.data;
  },
  updateWordForm: async (statId: number, data: WordFormStatsUpdate): Promise<WordFormStatsResponse> => {
    const response = await apiClient.put<WordFormStatsResponse>(`api/word-form-stats/global/${statId}`, data);
    return response.data;
  },
  deleteWordForm: async (statId: number): Promise<void> => {
    await apiClient.delete(`api/word-form-stats/global/${statId}`);
  }
};