import apiClient from './client';

export interface CorpusReportParams {
  start_date?: string | null;  
  end_date?: string | null;
}

export interface SentenceReportParams {
  include_context?: boolean;
  context_size?: number;
}

export const reportsApi = {
  
  generateCorpusReport: async (params: CorpusReportParams = {}): Promise<Blob> => {
    const {
      start_date = null,
      end_date = null
    } = params;

    const response = await apiClient.get('api/reports/corpus', {
      params: {
        ...(start_date && { start_date }),
        ...(end_date && { end_date })
      },
      responseType: 'blob', 
    });
    
    return response.data;
  },

  generateDocumentReport: async (docId: number): Promise<Blob> => {
    const response = await apiClient.get(`api/reports/document/${docId}`, {
      responseType: 'blob',
    });
    
    return response.data;
  },

  generateSentenceReport: async (
    docId: number, 
    sentenceId: number, 
    params: SentenceReportParams = {}
  ): Promise<Blob> => {
    const {
      include_context = false,
      context_size = 5
    } = params;

    const response = await apiClient.get(`api/reports/document/${docId}/sentence/${sentenceId}`, {
      params: {
        include_context,
        context_size
      },
      responseType: 'blob',
    });
    
    return response.data;
  },

  generateDocumentSyntaxReport: async (docId: number): Promise<Blob> => {
    const response = await apiClient.get(`api/reports/document/${docId}/syntax`, {
      responseType: 'blob',
    });
    
    return response.data;
  },
};