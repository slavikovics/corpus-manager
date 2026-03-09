import apiClient from './client';
import type { SearchResponse } from './types';
export interface SearchParams {
  query: string;
  mode?: 'concordance' | 'word' | 'phrase';
  search_type?: 'exact' | 'fuzzy';
  field?: 'word' | 'lemma';
  page?: number;
  page_size?: number;
  slop?: number;
  fuzziness?: string;
}
export interface SuggestParams {
  prefix: string;
  field?: 'word' | 'lemma';
  size?: number;
}
export const searchApi = {
  search: async (params: SearchParams): Promise<SearchResponse> => {
    const {
      query,
      mode = 'concordance',
      search_type = 'exact',
      field = 'lemma',
      page = 1,
      page_size = 50,
      slop = 0,
      fuzziness = 'AUTO'
    } = params;
    const response = await apiClient.get<SearchResponse>('api/search/', {
      params: {
        query,
        mode,
        search_type,
        field,
        page,
        page_size,
        slop,
        ...(fuzziness && { fuzziness })
      }
    });
    return response.data;
  },
  suggest: async (params: SuggestParams): Promise<any> => {
    const { prefix, field = 'word', size = 10 } = params;
    const response = await apiClient.get('api/search/suggest', {
      params: { prefix, field, size }
    });
    return response.data;
  }
};