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
import { Search, X, Info } from "lucide-react";
import { toast } from "sonner";
import { DataTable } from "app/components/shared/DataTable";
import { searchApi } from "app/api/search";
import type { SearchResponse, SearchResult } from "app/api/types";
const SEARCH_MODES = [
  { value: "concordance", label: "Конкорданс" },
  { value: "word", label: "Слово" },
  { value: "phrase", label: "Фраза" },
];
const SEARCH_TYPES = [
  { value: "exact", label: "Точный" },
  { value: "fuzzy", label: "Нечеткий (fuzzy)" },
];
const SEARCH_FIELDS = [
  { value: "lemma", label: "Лемма" },
  { value: "word", label: "Словоформа" },
];
const FUZZINESS_OPTIONS = [
  { value: "AUTO", label: "Авто" },
  { value: "0", label: "Отключено" },
];
export default function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [query, setQuery] = useState(searchParams.get("query") || "");
  const [mode, setMode] = useState<"concordance" | "word" | "phrase">(
    (searchParams.get("mode") as any) || "concordance"
  );
  const [searchType, setSearchType] = useState<"exact" | "fuzzy">(
    (searchParams.get("search_type") as any) || "exact"
  );
  const [field, setField] = useState<"word" | "lemma">(
    (searchParams.get("field") as any) || "lemma"
  );
  const [slop, setSlop] = useState<number>(
    parseInt(searchParams.get("slop") || "0")
  );
  const [fuzziness, setFuzziness] = useState<string>(
    searchParams.get("fuzziness") || "AUTO"
  );
  const [results, setResults] = useState<SearchResult[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
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
        fuzziness: searchType === 'fuzzy' ? fuzziness : undefined,
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
  }, [query, mode, searchType, field, page, pageSize, slop, fuzziness]);
  useEffect(() => {
    const params = new URLSearchParams();
    if (query) params.set("query", query);
    params.set("mode", mode);
    params.set("search_type", searchType);
    params.set("field", field);
    if (slop > 0) params.set("slop", slop.toString());
    if (fuzziness !== "AUTO") params.set("fuzziness", fuzziness);
    params.set("page", page.toString());
    params.set("page_size", pageSize.toString());
    setSearchParams(params);
  }, [query, mode, searchType, field, slop, fuzziness, page, pageSize]);
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
    setMode("concordance");
    setSearchType("exact");
    setField("lemma");
    setSlop(0);
    setFuzziness("AUTO");
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
        <span className="font-medium text-blue-600">{row.original.word}</span>
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
        <div className="flex items-center gap-2 max-w-xl">
          <span className="text-gray-500 text-sm">
            {row.original.left_context}
          </span>
          <Badge variant="outline" className="bg-blue-50">
            {row.original.word}
          </Badge>
          <span className="text-gray-500 text-sm">
            {row.original.right_context}
          </span>
        </div>
      ),
    },
    {
      accessorKey: "score",
      header: "Релевантность",
      size: 100,
      cell: ({ row }) => {
        const score = row.original.score;
        if (!score) return "-";
        return (
          <div className="flex items-center gap-2">
            <div className="w-16 bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-600 rounded-full h-2"
                style={{ width: `${Math.min(score * 100, 100)}%` }}
              />
            </div>
            <span className="text-xs text-gray-600">{score.toFixed(2)}</span>
          </div>
        );
      },
    },
  ];
  return (
    <div className="container mx-auto py-10">
      {}
      <h1 className="text-3xl font-bold mb-6">Поиск и конкорданс</h1>
      {}
      <Card className="p-6 mb-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          {}
          <div className="flex gap-4">
            <div className="flex-1">
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Введите слово, лемму или фразу..."
                className="w-full"
                autoFocus
              />
            </div>
            <Button type="submit" disabled={!query.trim() || loading}>
              <Search className="mr-2 h-4 w-4" />
              Поиск
            </Button>
          </div>
          {}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {}
            <div>
              <label className="text-sm font-medium mb-1 block">
                Режим
              </label>
              <Select
                value={mode}
                onValueChange={(value: any) => setMode(value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SEARCH_MODES.map((m) => (
                    <SelectItem key={m.value} value={m.value}>
                      {m.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {}
            <div>
              <label className="text-sm font-medium mb-1 block">
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
            {}
            <div>
              <label className="text-sm font-medium mb-1 block">
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
            {}
            {mode === 'phrase' && (
              <div>
                <label className="text-sm font-medium mb-1 block">
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
            {searchType === 'fuzzy' && (
              <div>
                <label className="text-sm font-medium mb-1 block">
                  Fuzziness
                </label>
                <Select
                  value={fuzziness}
                  onValueChange={setFuzziness}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FUZZINESS_OPTIONS.map((f) => (
                      <SelectItem key={f.value} value={f.value}>
                        {f.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          {}
          {query && (
            <div className="flex justify-end">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={resetSearch}
                className="text-gray-500"
              >
                <X className="h-4 w-4 mr-2" />
                Сбросить параметры
              </Button>
            </div>
          )}
        </form>
      </Card>
      {}
      {query && (
        <div className="space-y-4">
          {}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Info className="h-4 w-4" />
              {loading ? (
                "Поиск..."
              ) : (
                <>
                  Найдено {totalCount.toLocaleString()} результатов
                  {results.length > 0 && (
                    <Badge variant="secondary">
                      Страница {page} из {Math.ceil(totalCount / pageSize)}
                    </Badge>
                  )}
                </>
              )}
            </div>
          </div>
          {}
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
            loading={loading}
            error={error}
          />
          {}
          {results.length > 0 && (
            <Card className="p-4 bg-gray-50">
              <h3 className="text-sm font-medium mb-2">Параметры поиска:</h3>
              <div className="flex flex-wrap gap-2 text-xs text-gray-600">
                <Badge variant="outline">Режим: {SEARCH_MODES.find(m => m.value === mode)?.label}</Badge>
                <Badge variant="outline">Тип: {SEARCH_TYPES.find(t => t.value === searchType)?.label}</Badge>
                <Badge variant="outline">Поле: {SEARCH_FIELDS.find(f => f.value === field)?.label}</Badge>
                {mode === 'phrase' && slop > 0 && (
                  <Badge variant="outline">Slop: {slop}</Badge>
                )}
                {searchType === 'fuzzy' && fuzziness !== 'AUTO' && (
                  <Badge variant="outline">Fuzziness: {fuzziness}</Badge>
                )}
              </div>
            </Card>
          )}
        </div>
      )}
      {}
      {!query && (
        <Card className="p-12 text-center text-gray-500">
          <Search className="h-12 w-12 mx-auto mb-4 text-gray-300" />
          <p className="text-lg mb-2">Введите запрос для поиска</p>
          <p className="text-sm">
            Можно искать по словам, леммам или фразам с различными параметрами
          </p>
        </Card>
      )}
    </div>
  );
}