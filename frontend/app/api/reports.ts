import apiClient from './client';

export interface CorpusReportParams {
  start_date?: string | null;  
  end_date?: string | null;
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
};