import { useState } from "react";
import { useForm } from "react-hook-form";
import { Button } from "app/components/ui/button";
import { Input } from "app/components/ui/input";
import { Label } from "app/components/ui/label";
import { Upload } from "lucide-react";
import { documentsApi } from "app/api/documents";
import type { UploadFileBody } from "app/api/types";
interface UploadDocumentFormProps {
  onSuccess: () => void;
  onError: (error: Error) => void;
}
interface FormData {
  title: string;
  author: string;
  year: string;
  file: FileList;
}
export function UploadDocumentForm({ onSuccess, onError }: UploadDocumentFormProps) {
  const [loading, setLoading] = useState(false);
  const { register, handleSubmit, formState: { errors } } = useForm<FormData>();
  const onSubmit = async (data: FormData) => {
    if (!data.file || data.file.length === 0) {
      onError(new Error("Выберите файл"));
      return;
    }
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("file", data.file[0]);
      if (data.title) formData.append("title", data.title);
      if (data.author) formData.append("author", data.author);
      if (data.year) formData.append("year", data.year);
      await documentsApi.uploadDocument(formData);
      onSuccess();
    } catch (err) {
      onError(err as Error);
    } finally {
      setLoading(false);
    }
  };
  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {}
      <div className="space-y-2">
        <Label htmlFor="file">
          Файл <span className="text-red-500">*</span>
        </Label>
        <Input
          id="file"
          type="file"
          accept=".txt,.pdf,.doc,.docx"
          {...register("file", { required: "Выберите файл" })}
        />
        {errors.file && (
          <p className="text-sm text-red-500">{errors.file.message}</p>
        )}
      </div>
      {}
      <div className="space-y-2">
        <Label htmlFor="title">Название</Label>
        <Input
          id="title"
          placeholder="Введите название документа"
          {...register("title")}
        />
      </div>
      {}
      <div className="space-y-2">
        <Label htmlFor="author">Автор</Label>
        <Input
          id="author"
          placeholder="Введите автора"
          {...register("author")}
        />
      </div>
      {}
      <div className="space-y-2">
        <Label htmlFor="year">Год</Label>
        <Input
          id="year"
          type="number"
          placeholder="YYYY"
          {...register("year", {
            pattern: {
              value: /^\d{4}$/,
              message: "Введите год в формате YYYY"
            }
          })}
        />
        {errors.year && (
          <p className="text-sm text-red-500">{errors.year.message}</p>
        )}
      </div>
      {}
      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? (
          <>Загрузка...</>
        ) : (
          <>
            <Upload className="mr-2 h-4 w-4" />
            Загрузить
          </>
        )}
      </Button>
    </form>
  );
}