import { useState } from "react";
import { useNavigate } from "react-router";
import { Card } from "app/components/ui/card";
import { Button } from "app/components/ui/button";
import { Input } from "app/components/ui/input";
import { Label } from "app/components/ui/label";
import { AlertCircle, Database, Download, Upload, FileJson, CheckCircle, XCircle, Loader2 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "app/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "app/components/ui/alert";
import { Progress } from "app/components/ui/progress";
import { toast } from "sonner";
import { dbExportApi } from "app/api/dbExport";
import type { ExportPreview, ValidationResult, ImportResponse } from "app/api/dbExport";

export default function DBExportImportPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState<'export' | 'import' | 'preview' | 'validate' | null>(null);
  const [importProgress, setImportProgress] = useState<number>(0);
  
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [clearExisting, setClearExisting] = useState(true);
  
  const [preview, setPreview] = useState<ExportPreview | null>(null);
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [importResult, setImportResult] = useState<ImportResponse | null>(null);

const handleExport = async () => {
  setLoading('export');
  try {
    const blob = await dbExportApi.exportDatabase();
    
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    
    const filename = `db_export_${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
    link.setAttribute('download', filename);
    
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
    
    toast.success("Экспорт выполнен", {
      description: `Файл ${filename} успешно загружен`,
    });
  } catch (error) {
    console.error('Export error:', error);
    toast.error("Ошибка экспорта", {
      description: error instanceof Error ? error.message : "Не удалось экспортировать данные",
    });
  } finally {
    setLoading(null);
  }
};

  const handlePreview = async () => {
    setLoading('preview');
    try {
      const data = await dbExportApi.getExportPreview();
      setPreview(data);
      toast.success("Статистика загружена", {
        description: `Всего документов: ${data.table_stats.documents}`,
      });
    } catch (error) {
      toast.error("Ошибка", {
        description: "Не удалось загрузить статистику",
      });
    } finally {
      setLoading(null);
    }
  };

  const handleValidate = async () => {
    if (!selectedFile) {
      toast.error("Ошибка", {
        description: "Выберите файл для валидации",
      });
      return;
    }

    setLoading('validate');
    try {
      const result = await dbExportApi.validateImportFile(selectedFile);
      setValidationResult(result);
      
      if (result.valid) {
        toast.success("Файл валиден", {
          description: `Найдено ${result.tables?.documents?.record_count || 0} документов`,
        });
      } else {
        toast.error("Файл невалиден", {
          description: result.error || "Проверьте структуру файла",
        });
      }
    } catch (error) {
      toast.error("Ошибка валидации", {
        description: error instanceof Error ? error.message : "Не удалось проверить файл",
      });
    } finally {
      setLoading(null);
    }
  };

  const handleImport = async () => {
    if (!selectedFile) {
      toast.error("Ошибка", {
        description: "Выберите файл для импорта",
      });
      return;
    }

    setLoading('import');
    setImportProgress(0);
    
    const progressInterval = setInterval(() => {
      setImportProgress(prev => Math.min(prev + 10, 90));
    }, 500);
    
    try {
      const result = await dbExportApi.importDatabase(selectedFile, clearExisting);
      setImportResult(result);
      setImportProgress(100);
      
      toast.success("Импорт выполнен успешно", {
        description: `Импортировано ${result.statistics.tables.documents?.imported || 0} документов`,
      });
      
      setSelectedFile(null);
      setValidationResult(null);
      
    } catch (error) {
      toast.error("Ошибка импорта", {
        description: error instanceof Error ? error.message : "Не удалось импортировать данные",
      });
      setImportProgress(0);
    } finally {
      clearInterval(progressInterval);
      setLoading(null);
    }
  };

  const handleValidateAndImport = async () => {
    if (!selectedFile) {
      toast.error("Ошибка", {
        description: "Выберите файл для импорта",
      });
      return;
    }

    setLoading('import');
    setImportProgress(0);
    
    const progressInterval = setInterval(() => {
      setImportProgress(prev => Math.min(prev + 10, 90));
    }, 500);
    
    try {
      const result = await dbExportApi.importWithValidation(selectedFile, clearExisting);
      
      if (!result.validation.valid) {
        setValidationResult(result.validation);
        toast.error("Ошибка валидации", {
          description: result.validation.error || "Файл не прошел проверку",
        });
        setImportProgress(0);
        return;
      }
      
      setValidationResult(result.validation);
      setImportResult(result.import!);
      setImportProgress(100);
      
      toast.success("Импорт выполнен успешно", {
        description: `Импортировано ${result.import!.statistics.tables.documents?.imported || 0} документов`,
      });
      
      setSelectedFile(null);
      
    } catch (error) {
      toast.error("Ошибка импорта", {
        description: error instanceof Error ? error.message : "Не удалось импортировать данные",
      });
      setImportProgress(0);
    } finally {
      clearInterval(progressInterval);
      setLoading(null);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (!file.name.endsWith('.json')) {
        toast.error("Неверный формат", {
          description: "Пожалуйста, выберите JSON файл",
        });
        return;
      }
      setSelectedFile(file);
      setValidationResult(null);
      setImportResult(null);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  return (
    <div className="container mx-auto py-10 max-w-4xl">
      <div className="flex items-center gap-3 mb-8">
        <Database className="h-8 w-8 text-green-500" />
        <h1 className="text-3xl font-bold">Управление базой данных</h1>
      </div>

      <p className="text-lg text-muted-foreground mb-8">
        Экспортируйте полное состояние базы данных в JSON файл или импортируйте данные из ранее сохранённой копии.
      </p>

      <Tabs defaultValue="export" className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-8">
          <TabsTrigger value="export">Экспорт</TabsTrigger>
          <TabsTrigger value="import">Импорт</TabsTrigger>
        </TabsList>

        <TabsContent value="export">
          <Card className="p-6">
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold mb-2">Экспорт базы данных</h2>
                <p className="text-sm text-muted-foreground">
                  Создайте полную копию всех данных корпуса в формате JSON. Файл будет автоматически загружен на ваш компьютер.
                </p>
              </div>

              <div className="flex gap-4">
                <Button
                  onClick={handleExport}
                  disabled={loading === 'export'}
                  className="flex-1"
                  size="lg"
                >
                  {loading === 'export' ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Экспорт...
                    </>
                  ) : (
                    <>
                      <Download className="mr-2 h-4 w-4" />
                      Экспортировать БД
                    </>
                  )}
                </Button>

                <Button
                  onClick={handlePreview}
                  disabled={loading === 'preview'}
                  variant="outline"
                  size="lg"
                >
                  {loading === 'preview' ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <FileJson className="mr-2 h-4 w-4" />
                      Предпросмотр
                    </>
                  )}
                </Button>
              </div>

              {preview && (
                <div className="mt-6 p-4 bg-muted/50 rounded-lg border border-muted">
                  <h3 className="font-medium mb-3 flex items-center gap-2">
                    <Database className="h-4 w-4" />
                    Статистика базы данных
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Документы</p>
                      <p className="text-2xl font-bold">{preview.table_stats.documents}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Токены</p>
                      <p className="text-2xl font-bold">{preview.table_stats.tokens}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Предложения</p>
                      <p className="text-2xl font-bold">{preview.table_stats.sentences}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Леммы</p>
                      <p className="text-2xl font-bold">{preview.table_stats.lemma_stats}</p>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-3">
                    Экспортировано: {new Date(preview.metadata.exported_at).toLocaleString('ru-RU')}
                  </p>
                </div>
              )}

              <div className="mt-6 p-4 rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50/30 dark:bg-blue-950/30">
                <h3 className="font-medium mb-2 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-blue-500" />
                  Информация
                </h3>
                <ul className="text-sm space-y-1 list-disc list-inside text-muted-foreground">
                  <li>Экспортируются все данные: документы, токены, предложения, статистика</li>
                  <li>Файл сохраняется в формате JSON с полной структурой БД</li>
                  <li>Размер файла зависит от объёма данных в корпусе</li>
                  <li>Используйте экспорт для создания резервных копий или переноса данных</li>
                </ul>
              </div>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="import">
          <Card className="p-6">
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold mb-2">Импорт базы данных</h2>
                <p className="text-sm text-muted-foreground">
                  Восстановите данные из ранее экспортированного JSON файла.
                </p>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="importFile">JSON файл с данными</Label>
                  <Input
                    id="importFile"
                    type="file"
                    accept=".json"
                    onChange={handleFileSelect}
                    disabled={loading === 'import'}
                    className="cursor-pointer"
                  />
                  {selectedFile && (
                    <p className="text-xs text-muted-foreground">
                      Выбран файл: {selectedFile.name} ({formatFileSize(selectedFile.size)})
                    </p>
                  )}
                </div>

                <div className="flex gap-4">
                  <Button
                    onClick={handleValidate}
                    disabled={!selectedFile || loading === 'validate'}
                    variant="outline"
                    className="flex-1"
                  >
                    {loading === 'validate' ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <FileJson className="mr-2 h-4 w-4" />
                    )}
                    Проверить файл
                  </Button>

                  <Button
                    onClick={handleValidateAndImport}
                    disabled={!selectedFile || loading === 'import'}
                    className="flex-1"
                  >
                    {loading === 'import' ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <CheckCircle className="mr-2 h-4 w-4" />
                    )}
                    Проверить и импортировать
                  </Button>
                </div>

                {loading === 'import' && importProgress > 0 && importProgress < 100 && (
                  <div className="space-y-2">
                    <Progress value={importProgress} className="w-full" />
                    <p className="text-sm text-muted-foreground text-center">
                      Импорт данных... {importProgress}%
                    </p>
                  </div>
                )}
              </div>

              {validationResult && (
                <Alert variant={validationResult.valid ? "default" : "destructive"}>
                  {validationResult.valid ? (
                    <CheckCircle className="h-4 w-4" />
                  ) : (
                    <XCircle className="h-4 w-4" />
                  )}
                  <AlertTitle>
                    {validationResult.valid ? "Файл прошел проверку" : "Ошибка валидации"}
                  </AlertTitle>
                  <AlertDescription>
                    {validationResult.valid ? (
                      <div className="mt-2 space-y-1">
                        <p>Файл содержит корректные данные для импорта.</p>
                        {validationResult.tables && (
                          <div className="grid grid-cols-2 gap-2 mt-2 text-sm">
                            <div>
                              <span className="font-medium">Документов:</span>{" "}
                              {validationResult.tables.documents?.record_count || 0}
                            </div>
                            <div>
                              <span className="font-medium">Токенов:</span>{" "}
                              {validationResult.tables.tokens?.record_count || 0}
                            </div>
                            <div>
                              <span className="font-medium">Предложений:</span>{" "}
                              {validationResult.tables.sentences?.record_count || 0}
                            </div>
                          </div>
                        )}
                        {validationResult.export_version && (
                          <p className="text-xs mt-2">
                            Версия экспорта: {validationResult.export_version}
                          </p>
                        )}
                      </div>
                    ) : (
                      <p>{validationResult.error}</p>
                    )}
                  </AlertDescription>
                </Alert>
              )}

              {importResult && (
                <Alert variant="default" className="border-green-500 bg-green-50 dark:bg-green-950">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <AlertTitle>Импорт завершен успешно</AlertTitle>
                  <AlertDescription>
                    <div className="mt-2 space-y-1">
                      <p>Импортировано данных:</p>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        {Object.entries(importResult.statistics.tables).map(([table, stats]) => (
                          <div key={table}>
                            <span className="font-medium">{table}:</span> {stats.imported}
                          </div>
                        ))}
                      </div>
                      <p className="text-xs mt-2">
                        Время импорта: {new Date(importResult.statistics.imported_at).toLocaleString('ru-RU')}
                      </p>
                    </div>
                  </AlertDescription>
                </Alert>
              )}

              {/* Внимание - тонкий border и полупрозрачный фон */}
              <div className="mt-6 p-4 rounded-lg border border-yellow-200 dark:border-yellow-800 bg-yellow-50/30 dark:bg-yellow-950/30">
                <h3 className="font-medium mb-2 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-yellow-500" />
                  Внимание
                </h3>
                <ul className="text-sm space-y-1 list-disc list-inside text-muted-foreground">
                  <li>Импорт заменит существующие данные, если выбрана опция очистки</li>
                  <li>Убедитесь, что файл импорта создан через функцию экспорта</li>
                  <li>Рекомендуется создать резервную копию перед импортом</li>
                  <li>Процесс импорта может занять время при большом объёме данных</li>
                </ul>
              </div>
            </div>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="mt-8">
        <Card className="p-4 bg-muted/30">
          <h3 className="font-medium mb-2">Быстрые действия</h3>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/documents')}
            >
              <Database className="mr-2 h-4 w-4" />
              К списку документов
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}