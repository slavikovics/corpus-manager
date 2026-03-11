import { useState, useEffect, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router";
import type { ColumnDef } from "@tanstack/react-table";
import { Button } from "app/components/ui/button";
import { Input } from "app/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "app/components/ui/select";
import { Checkbox } from "app/components/ui/checkbox";
import { Label } from "app/components/ui/label";
import { Badge } from "app/components/ui/badge";
import { Card } from "app/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "app/components/ui/dialog";
import { Eye, X, Filter } from "lucide-react";
import { toast } from "sonner";
import { DataTable } from "app/components/shared/DataTable";
import { SearchBar } from "app/components/shared/SearchBar";
import { tokensApi } from "app/api/tokens";
import type { TokenResponse, TokenDetailResponse } from "app/api/types";
import { TokenDetailDialog } from "app/components/tokens/TokenDetailDialog";
import { cn } from "app/lib/utils";
import { POS_TAGS } from "~/posTags";

export default function TokensPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [tokens, setTokens] = useState<TokenResponse[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [skip, setSkip] = useState(0);
  const [limit, setLimit] = useState(50);
  const [docId, setDocId] = useState<number | null>(() => {
    const param = searchParams.get('doc_id');
    return param ? parseInt(param) : null;
  });
  const [pos, setPos] = useState<string | null>(null);
  const [searchWord, setSearchWord] = useState("");
  const [searchLemma, setSearchLemma] = useState("");
  const [sentenceId, setSentenceId] = useState<number | null>(null);
  const [isPunctuation, setIsPunctuation] = useState<boolean | null>(null);
  const [isStopword, setIsStopword] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [selectedToken, setSelectedToken] = useState<TokenDetailResponse | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  const fetchTokens = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await tokensApi.getTokens({
        skip,
        limit,
        doc_id: docId,
        pos,
        search_word: searchWord || null,
        search_lemma: searchLemma || null,
        sentence_id: sentenceId,
        is_punctuation: isPunctuation,
        is_stopword: isStopword,
      });
      setTokens(response.items);
      setTotalCount(response.total);
    } catch (err) {
      setError(err as Error);
      toast.error("Ошибка загрузки", {
        description: "Не удалось загрузить список токенов",
      });
    } finally {
      setLoading(false);
    }
  }, [skip, limit, docId, pos, searchWord, searchLemma, sentenceId, isPunctuation, isStopword]);

  useEffect(() => {
    fetchTokens();
  }, [fetchTokens]);

  const handleViewDetails = async (doc_id: number, position: number) => {
    setDetailLoading(true);
    try {
      const detail = await tokensApi.getTokenDetail(doc_id, position);
      setSelectedToken(detail);
      setDetailDialogOpen(true);
    } catch (err) {
      toast.error("Ошибка загрузки", {
        description: "Не удалось загрузить детальную информацию о токене",
      });
    } finally {
      setDetailLoading(false);
    }
  };

  const resetFilters = () => {
    setDocId(null);
    setPos(null);
    setSearchWord("");
    setSearchLemma("");
    setSentenceId(null);
    setIsPunctuation(null);
    setIsStopword(null);
    setSkip(0);
  };

  const handlePageChange = (page: number) => {
    setSkip((page - 1) * limit);
  };

  const handlePageSizeChange = (newLimit: number) => {
    setLimit(newLimit);
    setSkip(0);
  };

  const hasActiveFilters = docId || pos || searchWord || searchLemma || 
                          sentenceId || isPunctuation !== null || isStopword !== null;

  const columns: ColumnDef<TokenResponse>[] = [
    {
      accessorKey: "position",
      header: "Поз.",
      size: 60,
    },
    {
      accessorKey: "word",
      header: "Слово",
      cell: ({ row }) => (
        <span className="font-medium text-foreground">{row.original.word}</span>
      ),
    },
    {
      accessorKey: "lemma",
      header: "Лемма",
      cell: ({ row }) => row.original.lemma || "-",
    },
    {
      accessorKey: "pos",
      header: "Часть речи",
      cell: ({ row }) => {
        const posValue = row.original.pos;
        if (!posValue) return "-";
        const tag = POS_TAGS.find(t => t.value === posValue);
        return tag?.label || posValue;
      },
    },
    {
      id: "flags",
      header: "Флаги",
      cell: ({ row }) => (
        <div className="flex gap-1">
          {row.original.is_punctuation && (
            <Badge variant="outline" className="bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-900">
              Punct
            </Badge>
          )}
          {row.original.is_stopword && (
            <Badge variant="outline" className="bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-900">
              Stop
            </Badge>
          )}
        </div>
      ),
    },
    {
      id: "actions",
      header: "Действия",
      size: 80,
      cell: ({ row }) => (
        <Button
          variant="ghost"
          size="icon"
          onClick={(e) => {
            e.stopPropagation();
            handleViewDetails(row.original.doc_id, row.original.position);
          }}
          className="hover:bg-muted"
        >
          <Eye className="h-4 w-4" />
        </Button>
      ),
    },
  ];

  return (
    <div className="container mx-auto py-10">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-foreground">Токены</h1>
      </div>

      <Card className="p-4 mb-6 bg-card border-border">
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium mb-1 block text-foreground">
                ID документа
              </label>
              <Input
                type="number"
                min="1"
                placeholder="Например: 1"
                value={docId ?? ""}
                onChange={(e) => setDocId(e.target.value ? parseInt(e.target.value) : null)}
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-1 block text-foreground">
                Часть речи
              </label>
              <Select
                value={pos || "all"}
                onValueChange={(value) => setPos(value === "all" ? null : value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Все части речи" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Все части речи</SelectItem>
                  {POS_TAGS.map((tag) => (
                    <SelectItem key={tag.value} value={tag.value}>
                      {tag.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-1 block text-foreground">
                Поиск по слову
              </label>
              <SearchBar
                value={searchWord}
                onChange={setSearchWord}
                placeholder="Введите слово..."
                delay={500}
              />
            </div>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
            className="text-muted-foreground hover:text-foreground"
          >
            <Filter className="h-4 w-4 mr-2" />
            {showAdvancedFilters ? "Скрыть расширенные фильтры" : "Показать расширенные фильтры"}
          </Button>

          {showAdvancedFilters && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-border">
              <div>
                <label className="text-sm font-medium mb-1 block text-foreground">
                  Поиск по лемме
                </label>
                <SearchBar
                  value={searchLemma}
                  onChange={setSearchLemma}
                  placeholder="Введите лемму..."
                  delay={500}
                />
              </div>

              <div className="flex items-center">
                <div className="flex items-center space-x-2 m-4">
                  <Checkbox
                    id="punctuation"
                    checked={isPunctuation === true}
                    onCheckedChange={(checked) => 
                      setIsPunctuation(checked ? true : null)
                    }
                  />
                  <Label htmlFor="punctuation" className="text-foreground">Только пунктуация</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="stopword"
                    checked={isStopword === true}
                    onCheckedChange={(checked) => 
                      setIsStopword(checked ? true : null)
                    }
                  />
                  <Label htmlFor="stopword" className="text-foreground">Только стоп-слова</Label>
                </div>
              </div>
            </div>
          )}

          {hasActiveFilters && (
            <div className="flex justify-end pt-4 border-t border-border">
              <Button
                variant="ghost"
                size="sm"
                onClick={resetFilters}
                className="text-muted-foreground hover:text-foreground"
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
        data={tokens}
        totalCount={totalCount}
        pagination={{
          type: "offset",
          currentPage: Math.floor(skip / limit) + 1,
          pageSize: limit,
          onPageChange: handlePageChange,
          onPageSizeChange: handlePageSizeChange,
        }}
        loading={false}
        error={error}
      />

      <TokenDetailDialog
        token={selectedToken}
        open={detailDialogOpen}
        onOpenChange={setDetailDialogOpen}
        loading={detailLoading}
      />
    </div>
  );
}