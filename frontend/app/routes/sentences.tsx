import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "react-router";
import type { ColumnDef } from "@tanstack/react-table";
import { Card } from "app/components/ui/card";
import { Button } from "app/components/ui/button";
import { Input } from "app/components/ui/input";
import { Badge } from "app/components/ui/badge";
import { Eye, Filter, X } from "lucide-react";
import { toast } from "sonner";
import { DataTable } from "app/components/shared/DataTable";
import { SearchBar } from "app/components/shared/SearchBar";
import { SentenceDetailDialog } from "app/components/sentences/SentenceDetailDialog";
import { sentencesApi } from "app/api/sentences";
import type { SentenceResponse, SentenceDetailResponse } from "app/api/types";
import { Brain } from "lucide-react";
import { SemanticAnalysisDialog } from "app/components/sentences/SemanticAnalysisDialog";
import { semanticApi } from "app/api/semantics";
import type { SemanticAnalysisResponse } from "app/api/semanticTypes";

export default function SentencesPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  const [sentences, setSentences] = useState<SentenceResponse[]>([]);
  const [totalCount, setTotalCount] = useState(0);

  const [skip, setSkip] = useState(0);
  const [limit, setLimit] = useState(50);

  const [docId, setDocId] = useState<number | null>(() => {
    const param = searchParams.get("doc_id");
    return param ? parseInt(param) : null;
  });
  const [searchText, setSearchText] = useState("");
  const [minTokens, setMinTokens] = useState<number | null>(null);
  const [maxTokens, setMaxTokens] = useState<number | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const [selectedSentence, setSelectedSentence] =
    useState<SentenceDetailResponse | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);

  const [semanticAnalysis, setSemanticAnalysis] =
    useState<SemanticAnalysisResponse | null>(null);
  const [semanticDialogOpen, setSemanticDialogOpen] = useState(false);
  const [semanticLoading, setSemanticLoading] = useState(false);
  const [semanticSentenceText, setSemanticSentenceText] = useState<string>("");

  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  const fetchSentences = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await sentencesApi.getSentences({
        skip,
        limit,
        doc_id: docId,
        search_text: searchText || null,
        min_tokens: minTokens,
        max_tokens: maxTokens,
        include_document_metadata: true,
      });

      setSentences(response.items);
      setTotalCount(response.total);
    } catch (err) {
      setError(err as Error);
      toast.error("Ошибка загрузки", {
        description: "Не удалось загрузить список предложений",
      });
    } finally {
      setLoading(false);
    }
  }, [skip, limit, docId, searchText, minTokens, maxTokens]);

  useEffect(() => {
    fetchSentences();
  }, [fetchSentences]);

  const handleViewDetails = async (doc_id: number, sentence_id: number) => {
    setDetailLoading(true);
    try {
      const detail = await sentencesApi.getSentenceDetail(doc_id, sentence_id, {
        include_context: true,
        context_size: 5,
      });
      setSelectedSentence(detail);
      setDetailDialogOpen(true);
    } catch (err) {
      toast.error("Ошибка загрузки", {
        description: "Не удалось загрузить детальную информацию о предложении",
      });
    } finally {
      setDetailLoading(false);
    }
  };

  const handleSemanticAnalysis = async (
    doc_id: number,
    sentence_id: number,
    text: string,
  ) => {
    setSemanticSentenceText(text);
    setSemanticAnalysis(null);
    setSemanticDialogOpen(true);
    setSemanticLoading(true);
    try {
      const result = await semanticApi.analyzeSentence(doc_id, sentence_id, {
        sentenceText: text,
      });
      setSemanticAnalysis(result);
    } catch {
      toast.error("Ошибка анализа", {
        description: "Не удалось выполнить семантический анализ предложения",
      });
      setSemanticDialogOpen(false);
    } finally {
      setSemanticLoading(false);
    }
  };

  const resetFilters = () => {
    setDocId(null);
    setSearchText("");
    setMinTokens(null);
    setMaxTokens(null);
    setSkip(0);
  };

  const handlePageChange = (page: number) => {
    setSkip((page - 1) * limit);
  };

  const handlePageSizeChange = (newLimit: number) => {
    setLimit(newLimit);
    setSkip(0);
  };

  const hasActiveFilters = docId || searchText || minTokens || maxTokens;

  const columns: ColumnDef<SentenceResponse>[] = [
    {
      accessorKey: "doc_id",
      header: "Документ",
      size: 80,
      cell: ({ row }) => <Badge variant="outline">{row.original.doc_id}</Badge>,
    },
    {
      accessorKey: "sentence_id",
      header: "ID",
      size: 80,
    },
    {
      accessorKey: "start_position",
      header: "Поз.",
      size: 60,
    },
    {
      id: "text",
      header: "Текст предложения",
      cell: ({ row }) => (
        <div className="max-w-xl truncate" title={row.original.text}>
          {row.original.text}
        </div>
      ),
    },
    {
      accessorKey: "token_count",
      header: "Токенов",
      size: 80,
    },
    {
      id: "document_info",
      header: "Документ",
      cell: ({ row }) => {
        const doc = row.original.document;
        return doc ? (
          <div className="text-sm">
            <div className="font-medium">{doc.title}</div>
            <div className="text-xs text-muted-foreground">
              {doc.author || "Автор неизвестен"}
            </div>
          </div>
        ) : (
          <span className="text-muted-foreground">-</span>
        );
      },
    },
    {
      id: "actions",
      header: "Действия",
      size: 100,
      cell: ({ row }) => (
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="icon"
            title="Синтаксический разбор"
            onClick={(e) => {
              e.stopPropagation();
              handleViewDetails(row.original.doc_id, row.original.sentence_id);
            }}
          >
            <Eye className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            title="Семантический анализ"
            onClick={(e) => {
              e.stopPropagation();
              handleSemanticAnalysis(
                row.original.doc_id,
                row.original.sentence_id,
                row.original.text,
              );
            }}
          >
            <Brain className="h-4 w-4 text-violet-500" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="container mx-auto py-10">
      <div className="flex items-center gap-3 mb-6">
        <h1 className="text-3xl font-bold">Предложения</h1>
      </div>

      <Card className="p-4 mb-6">
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-1 block">
                ID документа
              </label>
              <Input
                type="number"
                min="1"
                placeholder="Например: 1"
                value={docId ?? ""}
                onChange={(e) =>
                  setDocId(e.target.value ? parseInt(e.target.value) : null)
                }
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">
                Поиск по тексту
              </label>
              <SearchBar
                value={searchText}
                onChange={setSearchText}
                placeholder="Введите текст для поиска..."
                delay={500}
              />
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
            className="text-gray-500"
          >
            <Filter className="h-4 w-4 mr-2" />
            {showAdvancedFilters
              ? "Скрыть расширенные фильтры"
              : "Показать расширенные фильтры"}
          </Button>

          {showAdvancedFilters && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t">
              {}
              <div>
                <label className="text-sm font-medium mb-1 block">
                  Минимум токенов
                </label>
                <Input
                  type="number"
                  min="1"
                  placeholder="Например: 5"
                  value={minTokens ?? ""}
                  onChange={(e) =>
                    setMinTokens(
                      e.target.value ? parseInt(e.target.value) : null,
                    )
                  }
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-1 block">
                  Максимум токенов
                </label>
                <Input
                  type="number"
                  min="1"
                  placeholder="Например: 20"
                  value={maxTokens ?? ""}
                  onChange={(e) =>
                    setMaxTokens(
                      e.target.value ? parseInt(e.target.value) : null,
                    )
                  }
                />
              </div>
            </div>
          )}

          {hasActiveFilters && (
            <div className="flex justify-end pt-4 border-t">
              <Button
                variant="ghost"
                size="sm"
                onClick={resetFilters}
                className="text-gray-500"
              >
                <X className="h-4 w-4 mr-2" />
                Сбросить фильтры
              </Button>
            </div>
          )}
        </div>
      </Card>

      <DataTable
        columns={columns}
        data={sentences}
        totalCount={totalCount}
        pagination={{
          type: "offset",
          currentPage: Math.floor(skip / limit) + 1,
          pageSize: limit,
          onPageChange: handlePageChange,
          onPageSizeChange: handlePageSizeChange,
        }}
        loading={loading}
        error={error}
      />

      <SentenceDetailDialog
        sentence={selectedSentence}
        open={detailDialogOpen}
        onOpenChange={setDetailDialogOpen}
        loading={detailLoading}
      />

      <SemanticAnalysisDialog
        open={semanticDialogOpen}
        onOpenChange={setSemanticDialogOpen}
        analysis={semanticAnalysis}
        loading={semanticLoading}
        sentenceText={semanticSentenceText}
      />
    </div>
  );
}
