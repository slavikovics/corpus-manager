import { useState } from "react";
import { useNavigate } from "react-router";
import { Card } from "app/components/ui/card";
import { Button } from "app/components/ui/button";
import { Input } from "app/components/ui/input";
import { Label } from "app/components/ui/label";
import { Checkbox } from "app/components/ui/checkbox";
import { FileBarChart, PieChart} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "app/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "app/components/ui/tabs";
import { Calendar } from "app/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "app/components/ui/popover";
import { CalendarIcon, Download, FileText, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { cn } from "app/lib/utils";
import { toast } from "sonner";
import { reportsApi } from "app/api/reports";

export default function ReportsPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState<'corpus' | 'document' | null>(null);
  
  
  const [startDate, setStartDate] = useState<Date>();
  const [endDate, setEndDate] = useState<Date>();
  const [language, setLanguage] = useState<string>("");
  const [includeCharts, setIncludeCharts] = useState(true);
  
  
  const [docId, setDocId] = useState<string>("");

  
  const downloadPDF = (blob: Blob, filename: string) => {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  };

  
  const handleCorpusReport = async () => {
    setLoading('corpus');
    
    try {
      const blob = await reportsApi.generateCorpusReport({
        start_date: startDate ? format(startDate, 'yyyy-MM-dd') : null,
        end_date: endDate ? format(endDate, 'yyyy-MM-dd') : null
      });

      const filename = `corpus_report_${format(new Date(), 'yyyyMMdd_HHmmss')}.pdf`;
      downloadPDF(blob, filename);
      
      toast.success("Отчёт сгенерирован", {
        description: "Файл успешно загружен",
      });
    } catch (error) {
      toast.error("Ошибка", {
        description: "Не удалось сгенерировать отчёт",
      });
    } finally {
      setLoading(null);
    }
  };

  
  const handleDocumentReport = async () => {
    if (!docId) {
      toast.error("Ошибка", {
        description: "Введите ID документа",
      });
      return;
    }

    const id = parseInt(docId);
    if (isNaN(id) || id <= 0) {
      toast.error("Ошибка", {
        description: "ID документа должен быть положительным числом",
      });
      return;
    }

    setLoading('document');
    
    try {
      const blob = await reportsApi.generateDocumentReport(id);
      
      const filename = `document_${id}_report_${format(new Date(), 'yyyyMMdd_HHmmss')}.pdf`;
      downloadPDF(blob, filename);
      
      toast.success("Отчёт сгенерирован", {
        description: `Файл для документа #${id} успешно загружен`,
      });
    } catch (error: any) {
      if (error.response?.status === 404) {
        toast.error("Документ не найден", {
          description: `Документ с ID ${id} не существует`,
        });
      } else {
        toast.error("Ошибка", {
          description: "Не удалось сгенерировать отчёт",
        });
      }
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="container mx-auto py-10 max-w-3xl">
      <div className="flex items-center gap-3 mb-8">
        <FileBarChart className="h-8 w-8 text-blue-500" />
        <h1 className="text-3xl font-bold">Отчёты</h1>
      </div>

      <p className="text-lg text-muted-foreground mb-8">
        Сгенерируйте отчёт по корпусу или отдельному документу в формате PDF.
      </p>

      <Tabs defaultValue="corpus" className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-8">
          <TabsTrigger value="corpus">Отчёт по корпусу</TabsTrigger>
          <TabsTrigger value="document">Отчёт по документу</TabsTrigger>
        </TabsList>

        <TabsContent value="corpus">
          <Card className="p-6">
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold mb-4">Параметры отчёта</h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Дата начала (опционально)</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !startDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {startDate ? format(startDate, 'PPP', { locale: ru }) : "Не выбрана"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={startDate}
                        onSelect={setStartDate}
                        initialFocus
                        locale={ru}
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-2">
                  <Label>Дата окончания (опционально)</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !endDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {endDate ? format(endDate, 'PPP', { locale: ru }) : "Не выбрана"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={endDate}
                        onSelect={setEndDate}
                        initialFocus
                        locale={ru}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              <Button
                onClick={handleCorpusReport}
                disabled={loading === 'corpus'}
                className="w-full"
                size="lg"
              >
                {loading === 'corpus' ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Генерация...
                  </>
                ) : (
                  <>
                    <Download className="mr-2 h-4 w-4" />
                    Сгенерировать отчёт по корпусу
                  </>
                )}
              </Button>

              <div className="mt-6 p-4 bg-muted/50 rounded-lg">
                <h3 className="font-medium mb-2 flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Отчёт включает:
                </h3>
                <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                  <li>Общую информацию о корпусе (количество документов, токенов, лемм и словоформ)</li>
                  <li>Топ-100 самых частотных лемм и словоформ</li>
                  <li>Топ-20 документов с самым большим количеством токенов</li>
                </ul>
              </div>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="document">
          <Card className="p-6">
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold mb-4">Параметры отчёта</h2>
                <p className="text-sm text-muted-foreground mb-6">
                  Детальный анализ конкретного документа из корпуса.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="docId">ID документа</Label>
                <Input
                  id="docId"
                  type="number"
                  min="1"
                  placeholder="Например: 42"
                  value={docId}
                  onChange={(e) => setDocId(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Введите ID документа из списка на странице "Документы"
                </p>
              </div>

              <Button
                onClick={handleDocumentReport}
                disabled={loading === 'document' || !docId}
                className="w-full"
                size="lg"
              >
                {loading === 'document' ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Генерация...
                  </>
                ) : (
                  <>
                    <Download className="mr-2 h-4 w-4" />
                    Сгенерировать отчёт по документу
                  </>
                )}
              </Button>

              <div className="mt-6 p-4 bg-muted/50 rounded-lg">
                <h3 className="font-medium mb-2 flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Отчёт включает:
                </h3>
                <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                  <li>Метаданные документа (название, автор, дата, язык)</li>
                  <li>Основную статистику</li>
                  <li>Список самых частотных слов и лемм</li>
                </ul>
              </div>
            </div>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="mt-8">
        <Card className="p-4 bg-muted/30">
          <h3 className="font-medium mb-2">Быстрые действия</h3>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/documents')}
            >
              <FileText className="mr-2 h-4 w-4" />
              К списку документов
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/pos-stats')}
            >
              <PieChart className="mr-2 h-4 w-4" />
              Статистика по частям речи
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}