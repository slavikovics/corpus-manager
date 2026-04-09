import apiClient from "./client";
import type {
  SemanticAnalysisRequest,
  SemanticAnalysisResponse,
} from "./semanticTypes";

export const semanticApi = {
  analyzeSentence: async (
    doc_id: number,
    sentence_id: number,
  ): Promise<SemanticAnalysisResponse> => {
    const response = await apiClient.get<SemanticAnalysisResponse>(
      `api/semantics/${doc_id}/${sentence_id}`,
    );

    return response.data;
  },
};
