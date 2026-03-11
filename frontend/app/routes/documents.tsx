import { useState, useEffect } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { Button } from "app/components/ui/button";
import { Upload, Trash2, Clock, CheckCircle, XCircle, AlertCircle } from "lucide-react";
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
import { Badge } from "app/components/ui/badge";
import { toast } from "sonner";
import { DataTable } from "app/components/shared/DataTable";
import { UploadDocumentForm } from "app/components/documents/UploadDocumentForm";
import { documentsApi } from "app/api/documents";
import type { DocumentResponse } from "app/api/types";
import { Spinner } from "app/components/ui/spinner";
import { cn } from "app/lib/utils";

function ProcessingStatusBadge({ status }: { status: string }) {
  switch (status) {
    case "completed":
      return (
        <Badge variant="outline" className="bg-green-500/10 text-green-600 dark:text-green-400 border-green-200 dark:border-green-900">
          <CheckCircle className="h-3 w-3 mr-1" />
          Готов
        </Badge>
      );
    case "processing":
      return (
        <Badge variant="outline" className="bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-900">
          <Spinner width={12} className="mr-1" />
          Обрабатывается
        </Badge>
      );
    case "pending":
      return (
        <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-200 dark:border-yellow-900">
          <Clock className="h-3 w-3 mr-1" />
          В очереди
        </Badge>
      );
    case "failed":
      return (
        <Badge variant="outline" className="bg-red-500/10 text-red-600 dark:text-red-400 border-red-200 dark:border-red-900">
          <XCircle className="h-3 w-3 mr-1" />
          Ошибка
        </Badge>
      );
    default:
      return (
        <Badge variant="outline">
          <AlertCircle className="h-3 w-3 mr-1" />
          {status}
        </Badge>
      );
  }
}

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
    
    const intervalId = setInterval(() => {
      fetchDocuments();
    }, 3000);
    
    return () => clearInterval(intervalId);
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
      cell: ({ row }) => row.original.word_count?.toLocaleString() || "-",
    },
    {
      accessorKey: "processing_status",
      header: "Статус",
      size: 120,
      cell: ({ row }) => <ProcessingStatusBadge status={row.original.processing_status} />,
    },
    {
      accessorKey: "created_at",
      header: "Создан",
      cell: ({ row }) => new Date(row.original.created_at).toLocaleDateString(),
    },
    {
      id: "actions",
      header: "Действия",
      size: 80,
      cell: ({ row }) => {
        
        const isProcessing = row.original.processing_status !== "completed";
        
        return (
          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => {
              e.stopPropagation();
              setDocumentToDelete(row.original.id);
              setDeleteDialogOpen(true);
            }}
            disabled={isProcessing}
            title={isProcessing ? "Нельзя удалить во время обработки" : "Удалить документ"}
            className="hover:bg-destructive/10"
          >
            <Trash2 className={cn(
              "h-4 w-4",
              isProcessing ? "text-muted-foreground/30" : "text-destructive"
            )} />
          </Button>
        );
      },
    },
  ];

  return (
    <div className="container mx-auto py-10">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-foreground">Документы</h1>
        
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
                  description: "Документ загружен и поставлен в очередь на обработку",
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

      <div className="bg-muted/50 p-3 rounded-lg mb-6 flex flex-wrap items-center gap-4 text-sm border border-border">
        <span className="text-muted-foreground font-medium">Статусы:</span>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="bg-green-500/10 text-green-600 dark:text-green-400 border-green-200 dark:border-green-900">Готов</Badge>
          <span className="text-muted-foreground">- обработан</span>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-900">Обрабатывается</Badge>
          <span className="text-muted-foreground">- в процессе</span>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-200 dark:border-yellow-900">В очереди</Badge>
          <span className="text-muted-foreground">- ожидает</span>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="bg-red-500/10 text-red-600 dark:text-red-400 border-red-200 dark:border-red-900">Ошибка</Badge>
          <span className="text-muted-foreground">- не удалось обработать</span>
        </div>
      </div>

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
        loading={false}
        error={error}
      />

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
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Удалить
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}