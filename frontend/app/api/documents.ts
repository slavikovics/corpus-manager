import apiClient from './client';
import type { DocumentResponse, UploadResponse, UploadFileBody } from './types';
export const documentsApi = {
  getDocuments: async (skip: number = 0, limit: number = 100): Promise<DocumentResponse[]> => {
    const response = await apiClient.get<DocumentResponse[]>('api/documents/', {
      params: { skip, limit }
    });
    return response.data;
  },
  getDocument: async (docId: number): Promise<DocumentResponse> => {
    const response = await apiClient.get<DocumentResponse>(`api/documents/${docId}`);
    return response.data;
  },
  deleteDocument: async (docId: number): Promise<void> => {
    await apiClient.delete(`api/documents/${docId}`);
  },
  uploadDocument: async (formData: FormData): Promise<UploadResponse> => {
    const response = await apiClient.post<UploadResponse>('api/upload/file', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  }
};