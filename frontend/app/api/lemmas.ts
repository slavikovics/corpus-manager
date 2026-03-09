import apiClient from './client';
import type { LemmaStatsListResponse, LemmaStatsResponse, LemmaStatsUpdate } from './types';
export interface GetLemmasParams {
  skip?: number;
  limit?: number;
  search?: string | null;
  min_frequency?: number | null;
  pos?: string | null;
}
export const lemmasApi = {
  getLemmas: async (params: GetLemmasParams = {}): Promise<LemmaStatsListResponse> => {
    const {
      skip = 0,
      limit = 100,
      search = null,
      min_frequency = null,
      pos = null
    } = params;
    const response = await apiClient.get<LemmaStatsListResponse>('api/lemma-stats/global/', {
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
  updateLemma: async (statId: number, data: LemmaStatsUpdate): Promise<LemmaStatsResponse> => {
    const response = await apiClient.put<LemmaStatsResponse>(`api/lemma-stats/global/${statId}`, data);
    return response.data;
  },
  deleteLemma: async (statId: number): Promise<void> => {
    await apiClient.delete(`api/lemma-stats/global/${statId}`);
  }
};