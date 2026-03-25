import apiClient from './client';

export interface ImportStats {
  imported_at: string;
  tables: {
    [key: string]: {
      imported: number;
    };
  };
}

export interface ExportPreview {
  metadata: {
    exported_at: string;
    version: string;
    table_count: number;
  };
  table_stats: {
    documents: number;
    tokens: number;
    sentences: number;
    lemma_stats: number;
    word_form_stats: number;
    document_lemma_stats: number;
    document_word_form_stats: number;
  };
}

export interface ValidationResult {
  valid: boolean;
  error?: string;
  export_version?: string;
  exported_at?: string;
  found_tables?: string[];
  tables?: {
    [key: string]: {
      record_count: number;
      has_data: boolean;
      sample_keys?: string[];
    };
  };
  warnings?: string[];
}

export interface ImportResponse {
  message: string;
  statistics: ImportStats;
}

export const dbExportApi = {
  exportDatabase: async (): Promise<Blob> => {
    const response = await apiClient.get('api/db-export/export', {
      responseType: 'blob',
    });
    
    return response.data;
  },

  importDatabase: async (
    file: File, 
    clearExisting: boolean = true
  ): Promise<ImportResponse> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('clear_existing', String(clearExisting));
    
    const response = await apiClient.post('api/db-export/import', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    
    return response.data;
  },

  getExportPreview: async (): Promise<ExportPreview> => {
    const response = await apiClient.get('api/db-export/export-preview');
    return response.data;
  },

  validateImportFile: async (file: File): Promise<ValidationResult> => {
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await apiClient.post('api/db-export/validate-import', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    
    return response.data;
  },

  downloadExport: async (filename?: string): Promise<void> => {
    try {
      const blob = await dbExportApi.exportDatabase();
      
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      
      const fileName = filename || `db_export_${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
      link.setAttribute('download', fileName);
      
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to download export:', error);
      throw error;
    }
  },

  importWithValidation: async (
    file: File, 
    clearExisting: boolean = true
  ): Promise<{ validation: ValidationResult; import?: ImportResponse }> => {
    const validation = await dbExportApi.validateImportFile(file);
    
    if (!validation.valid) {
      return { validation };
    }
    
    const importResult = await dbExportApi.importDatabase(file, clearExisting);
    
    return {
      validation,
      import: importResult
    };
  },
};