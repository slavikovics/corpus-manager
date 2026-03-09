import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router";
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
import { X } from "lucide-react";
import { toast } from "sonner";
import { DataTable } from "app/components/shared/DataTable";
import { SearchBar } from "app/components/shared/SearchBar";
import { wordFormsApi } from "app/api/wordforms";
import type { WordFormStatsResponse } from "app/api/types";
const POS_TAGS = [
  { value: "ADJ", label: "Прилагательное" },
  { value: "ADP", label: "Предлог" },
  { value: "ADV", label: "Наречие" },
  { value: "AUX", label: "Вспомогательный глагол" },
  { value: "CONJ", label: "Союз" },
  { value: "CCONJ", label: "Сочинительный союз" },
  { value: "DET", label: "Детерминатив" },
  { value: "INTJ", label: "Междометие" },
  { value: "NOUN", label: "Существительное" },
  { value: "NUM", label: "Числительное" },
  { value: "PART", label: "Частица" },
  { value: "PRON", label: "Местоимение" },
  { value: "PROPN", label: "Имя собственное" },
  { value: "PUNCT", label: "Пунктуация" },
  { value: "SCONJ", label: "Подчинительный союз" },
  { value: "SYM", label: "Символ" },
  { value: "VERB", label: "Глагол" },
  { value: "X", label: "Другое" },
];
export default function WordFormsPage() {
  const navigate = useNavigate();
  const [wordForms, setWordForms] = useState<WordFormStatsResponse[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [skip, setSkip] = useState(0);
  const [limit, setLimit] = useState(50);
  const [search, setSearch] = useState("");
  const [pos, setPos] = useState<string | null>(null);
  const [minFrequency, setMinFrequency] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const fetchWordForms = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await wordFormsApi.getWordForms({
        skip,
        limit,
        search: search || null,
        pos: pos,
        min_frequency: minFrequency,
      });
      setWordForms(response.items);
      setTotalCount(response.total);
    } catch (err) {
      setError(err as Error);
      toast.error("Ошибка загрузки", {
        description: "Не удалось загрузить список словоформ",
      });
    } finally {
      setLoading(false);
    }
  }, [skip, limit, search, pos, minFrequency]);
  useEffect(() => {
    fetchWordForms();
  }, [fetchWordForms]);
  const resetFilters = () => {
    setSearch("");
    setPos(null);
    setMinFrequency(null);
    setSkip(0); 
  };
  const handlePageChange = (page: number) => {
    setSkip((page - 1) * limit);
  };
  const handlePageSizeChange = (newLimit: number) => {
    setLimit(newLimit);
    setSkip(0);
  };
  const handleRowClick = (row: WordFormStatsResponse) => {
    navigate(`/search?query=${encodeURIComponent(row.word)}&field=word`);
  };
  const columns: ColumnDef<WordFormStatsResponse>[] = [
    {
      accessorKey: "id",
      header: "ID",
      size: 80,
    },
    {
      accessorKey: "word",
      header: "Словоформа",
      cell: ({ row }) => (
        <span className="font-medium">{row.original.word}</span>
      ),
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
      accessorKey: "total_frequency",
      header: "Частота",
      size: 100,
      cell: ({ row }) => row.original.total_frequency.toLocaleString(),
    },
    {
      accessorKey: "last_updated",
      header: "Обновлено",
      size: 120,
      cell: ({ row }) => new Date(row.original.last_updated).toISOString().split('T')[0],
    },
  ];
  const hasActiveFilters = search || pos || minFrequency;
  return (
    <div className="container mx-auto py-10">
      {}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Словоформы</h1>
      </div>
      {}
      <div className="bg-gray-50 p-4 rounded-lg mb-6 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {}
          <div>
            <label className="text-sm font-medium mb-1 block">
              Поиск по словоформе
            </label>
            <SearchBar
              value={search}
              onChange={setSearch}
              placeholder="Введите словоформу..."
              delay={500}
            />
          </div>
          {}
          <div>
            <label className="text-sm font-medium mb-1 block">
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
          {}
          <div>
            <label className="text-sm font-medium mb-1 block">
              Минимальная частота
            </label>
            <Input
              type="number"
              min="0"
              placeholder="Например: 100"
              value={minFrequency ?? ""}
              onChange={(e) => {
                const value = e.target.value;
                setMinFrequency(value ? parseInt(value) : null);
              }}
            />
          </div>
        </div>
        {}
        {hasActiveFilters && (
          <div className="flex justify-end">
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
      {}
      <DataTable
        columns={columns}
        data={wordForms}
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
        onRowClick={handleRowClick}
      />
      {}
      {!loading && !error && wordForms.length > 0 && (
        <div className="mt-4 text-sm text-gray-500">
          Показано {wordForms.length} из {totalCount.toLocaleString()} словоформ
        </div>
      )}
    </div>
  );
}