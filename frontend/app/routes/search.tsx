import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "react-router";
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
import { Card } from "app/components/ui/card";
import { Badge } from "app/components/ui/badge";
import { Search, X } from "lucide-react";
import { toast } from "sonner";
import { DataTable } from "app/components/shared/DataTable";
import { searchApi } from "app/api/search";
import type { SearchResponse, SearchResult } from "app/api/types";
import { cn } from "app/lib/utils";

const SEARCH_TYPES = [
  { value: "exact", label: "Точный" },
  { value: "fuzzy", label: "Нечеткий" },
];

const SEARCH_FIELDS = [
  { value: "lemma", label: "Лемма" },
  { value: "word", label: "Словоформа" },
];

const detectMode = (query: string): "concordance" | "phrase" => {
  const words = query.trim().split(/\s+/).filter(w => w.length > 0);
  return words.length > 1 ? "phrase" : "concordance";
};

export default function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [query, setQuery] = useState(searchParams.get("query") || "");
  const [searchType, setSearchType] = useState<"exact" | "fuzzy">(
    (searchParams.get("search_type") as any) || "exact"
  );
  const [field, setField] = useState<"word" | "lemma">(
    (searchParams.get("field") as any) || "lemma"
  );
  const [slop, setSlop] = useState<number>(
    parseInt(searchParams.get("slop") || "0")
  );
  const [results, setResults] = useState<SearchResult[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);

  const mode = detectMode(query);

  const performSearch = useCallback(async () => {
    if (!query.trim()) {
      setResults([]);
      setTotalCount(0);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await searchApi.search({
        query: query.trim(),
        mode,
        search_type: searchType,
        field,
        page,
        page_size: pageSize,
        slop: mode === 'phrase' ? slop : undefined,
        fuzziness: searchType === 'fuzzy' ? 'AUTO' : undefined,
      });

      setResults(response.results);
      setTotalCount(response.total);
    } catch (err) {
      setError(err as Error);
      toast.error("Ошибка поиска", {
        description: "Не удалось выполнить поиск",
      });
    } finally {
      setLoading(false);
    }
  }, [query, mode, searchType, field, page, pageSize, slop]);

  useEffect(() => {
    const params = new URLSearchParams();
    if (query) params.set("query", query);
    params.set("search_type", searchType);
    params.set("field", field);
    if (slop > 0) params.set("slop", slop.toString());
    params.set("page", page.toString());
    params.set("page_size", pageSize.toString());
    setSearchParams(params);
  }, [query, searchType, field, slop, page, pageSize]);

  useEffect(() => {
    performSearch();
  }, [performSearch]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    performSearch();
  };

  const resetSearch = () => {
    setQuery("");
    setSearchType("exact");
    setField("lemma");
    setSlop(0);
    setPage(1);
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
  };

  const handlePageSizeChange = (newSize: number) => {
    setPageSize(newSize);
    setPage(1);
  };

  const columns: ColumnDef<SearchResult>[] = [
    {
      accessorKey: "doc_id",
      header: "ID документа",
      size: 100,
    },
    {
      accessorKey: "word",
      header: "Слово",
      cell: ({ row }) => (
        <span className="font-medium text-primary">{row.original.word}</span>
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
      cell: ({ row }) => row.original.pos || "-",
    },
    {
      id: "context",
      header: "Контекст",
      cell: ({ row }) => (
        <div className="flex items-center gap-2 max-w-xl flex-wrap">
          <span className="text-muted-foreground text-sm">
            {row.original.left_context}
          </span>
          <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
            {row.original.word}
          </Badge>
          <span className="text-muted-foreground text-sm">
            {row.original.right_context}
          </span>
        </div>
      ),
    },
  ];

  return (
    <div className="container mx-auto py-10">
      <h1 className="text-3xl font-bold mb-6 text-foreground">Поиск и конкорданс</h1>

      <Card className="p-6 mb-8 bg-card border-border">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="flex gap-4">
            <div className="flex-1">
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Введите слово или фразу..."
                className="w-full"
                autoFocus
              />
            </div>
            <Button type="submit" disabled={!query.trim() || loading}>
              <Search className="mr-2 h-4 w-4" />
              Поиск
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium mb-1 block text-foreground">
                Тип поиска
              </label>
              <Select
                value={searchType}
                onValueChange={(value: any) => setSearchType(value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SEARCH_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-1 block text-foreground">
                Поле
              </label>
              <Select
                value={field}
                onValueChange={(value: any) => setField(value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SEARCH_FIELDS.map((f) => (
                    <SelectItem key={f.value} value={f.value}>
                      {f.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {mode === 'phrase' && (
              <div>
                <label className="text-sm font-medium mb-1 block text-foreground">
                  Slop (расстояние)
                </label>
                <Input
                  type="number"
                  min="0"
                  value={slop}
                  onChange={(e) => setSlop(parseInt(e.target.value) || 0)}
                  placeholder="0"
                />
              </div>
            )}
          </div>

          {query && (
            <div className="flex justify-end">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={resetSearch}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4 mr-2" />
                Сбросить параметры
              </Button>
            </div>
          )}
        </form>
      </Card>

      {query && (
        <div className="space-y-4">
          {!loading && !error && (
            <div className="text-sm text-muted-foreground">
              Найдено {totalCount.toLocaleString()} результатов
            </div>
          )}

          <DataTable
            columns={columns}
            data={results}
            totalCount={totalCount}
            pagination={{
              type: "page",
              currentPage: page,
              pageSize: pageSize,
              onPageChange: handlePageChange,
              onPageSizeChange: handlePageSizeChange,
            }}
            loading={false}
            error={error}
          />
        </div>
      )}

      {!query && (
        <Card className="p-12 text-center bg-card border-border">
          <Search className="h-12 w-12 mx-auto mb-4 text-muted-foreground/30" />
          <p className="text-lg mb-2 text-muted-foreground">Введите запрос для поиска</p>
        </Card>
      )}
    </div>
  );
}