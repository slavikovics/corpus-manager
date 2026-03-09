import { useState, useEffect } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { Button } from "app/components/ui/button";
import { Upload, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "app/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "app/components/ui/alert-dialog";
import { toast } from "sonner";
import { DataTable } from "app/components/shared/DataTable";
import { UploadDocumentForm } from "app/components/documents/UploadDocumentForm";
import { documentsApi } from "app/api/documents";
import type { DocumentResponse } from "app/api/types";
export default function DocumentsPage() {
  const [documents, setDocuments] = useState<DocumentResponse[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [skip, setSkip] = useState(0);
  const [limit, setLimit] = useState(50);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [documentToDelete, setDocumentToDelete] = useState<number | null>(null);
  const fetchDocuments = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await documentsApi.getDocuments(skip, limit);
      setDocuments(data);
      setTotalCount(data.length < limit ? skip + data.length : skip + limit + 1);
    } catch (err) {
      setError(err as Error);
      toast.error("Ошибка загрузки", {
        description: "Не удалось загрузить список документов",
      });
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    fetchDocuments();
  }, [skip, limit]);
  const handleDelete = async () => {
    if (!documentToDelete) return;
    try {
      await documentsApi.deleteDocument(documentToDelete);
      toast.success("Документ удален", {
        description: "Документ успешно удален",
      });
      fetchDocuments(); 
    } catch (err) {
      toast.error("Ошибка удаления", {
        description: "Не удалось удалить документ",
      });
    } finally {
      setDeleteDialogOpen(false);
      setDocumentToDelete(null);
    }
  };
  const handlePageChange = (page: number) => {
    setSkip((page - 1) * limit);
  };
  const handlePageSizeChange = (newLimit: number) => {
    setLimit(newLimit);
    setSkip(0); 
  };
  const columns: ColumnDef<DocumentResponse>[] = [
    {
      accessorKey: "id",
      header: "ID",
      size: 60,
    },
    {
      accessorKey: "title",
      header: "Название",
    },
    {
      accessorKey: "author",
      header: "Автор",
      cell: ({ row }) => row.original.author || "-",
    },
    {
      accessorKey: "year",
      header: "Год",
      cell: ({ row }) => row.original.year || "-",
    },
    {
      accessorKey: "language",
      header: "Язык",
      size: 80,
    },
    {
      accessorKey: "file_type",
      header: "Тип",
      size: 80,
    },
    {
      accessorKey: "word_count",
      header: "Слов",
      size: 80,
      cell: ({ row }) => row.original.word_count.toLocaleString(),
    },
    {
      accessorKey: "created_at",
      header: "Создан",
      cell: ({ row }) => new Date(row.original.created_at).toISOString().split('T')[0],
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
            setDocumentToDelete(row.original.id);
            setDeleteDialogOpen(true);
          }}
        >
          <Trash2 className="h-4 w-4 text-red-500" />
        </Button>
      ),
    },
  ];
  return (
    <div className="container mx-auto py-10">
      {}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Документы</h1>
        <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Upload className="mr-2 h-4 w-4" />
              Загрузить документ
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Загрузка документа</DialogTitle>
            </DialogHeader>
            <UploadDocumentForm
              onSuccess={() => {
                setUploadDialogOpen(false);
                fetchDocuments();
                toast.success("Успешно", {
                  description: "Документ загружен и обрабатывается",
                });
              }}
              onError={(error) => {
                toast.error("Ошибка загрузки", {
                  description: error.message,
                });
              }}
            />
          </DialogContent>
        </Dialog>
      </div>
      {}
      <DataTable
        columns={columns}
        data={documents}
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
      {}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Вы уверены?</AlertDialogTitle>
            <AlertDialogDescription>
              Это действие нельзя отменить. Документ будет полностью удален из системы.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-500 hover:bg-red-600">
              Удалить
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}