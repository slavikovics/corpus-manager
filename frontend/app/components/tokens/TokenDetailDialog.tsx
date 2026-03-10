import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "app/components/ui/dialog";
import { Badge } from "app/components/ui/badge";
import { Card } from "app/components/ui/card";
import { Skeleton } from "app/components/ui/skeleton";
import type { TokenDetailResponse } from "app/api/types";
import { ScrollArea } from "app/components/ui/scroll-area";
import {
  BookOpen,
  Hash,
  Type,
  Network,
  FileText,
  Tags,
  Calendar,
  User,
  Languages,
  FileType,
  Layers,
  AlertCircle,
} from "lucide-react";

interface TokenDetailDialogProps {
  token: TokenDetailResponse | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  loading: boolean;
}

export function TokenDetailDialog({ token, open, onOpenChange, loading }: TokenDetailDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[60vw] max-w-[60vw] min-w-[800px] h-[90vh] max-h-[90vh] p-0 flex flex-col">
        <DialogHeader className="px-6 py-4 border-b shrink-0">
          <DialogTitle className="text-2xl">Детальная информация о токене</DialogTitle>
        </DialogHeader>
        
        <ScrollArea className="flex-1 min-h-0 px-6 py-4">
          {loading ? (
            <div className="space-y-6">
              <Skeleton className="h-48 w-full" />
              <Skeleton className="h-64 w-full" />
              <Skeleton className="h-40 w-full" />
            </div>
          ) : token ? (
            <div className="space-y-6 pb-4">
              {}
              {token.document && (
                <Card className="p-6 border-1 border-purple-500 shadow-sm">
                  <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
                    <FileText className="h-6 w-6 text-purple-500" />
                    Информация о документе
                  </h3>
                  
                  <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    <InfoItem 
                      icon={<Hash className="h-4 w-4" />} 
                      label="ID документа" 
                      value={token.document.id.toString()} 
                    />
                    
                    <InfoItem 
                      icon={<FileText className="h-4 w-4" />} 
                      label="Название" 
                      value={token.document.title} 
                      highlight 
                    />
                    
                    {token.document.author && (
                      <InfoItem 
                        icon={<User className="h-4 w-4" />} 
                        label="Автор" 
                        value={token.document.author} 
                      />
                    )}
                    
                    {token.document.year && (
                      <InfoItem 
                        icon={<Calendar className="h-4 w-4" />} 
                        label="Год" 
                        value={token.document.year.toString()} 
                      />
                    )}
                    
                    <InfoItem 
                      icon={<Languages className="h-4 w-4" />} 
                      label="Язык" 
                      value={token.document.language || 'en'} 
                    />
                    
                    <InfoItem 
                      icon={<FileType className="h-4 w-4" />} 
                      label="Тип файла" 
                      value={token.document.file_type} 
                    />
                    
                    <InfoItem 
                      icon={<Layers className="h-4 w-4" />} 
                      label="Количество слов" 
                      value={token.document.word_count?.toLocaleString() || '-'} 
                    />
                    
                    <InfoItem 
                      icon={<Calendar className="h-4 w-4" />} 
                      label="Создан" 
                      value={new Date(token.document.created_at).toLocaleDateString()} 
                    />
                    
                    <div className="col-span-2 lg:col-span-1">
                      <div className="text-xs text-gray-500 mb-1">Статус обработки</div>
                      <Badge 
                        variant="outline" 
                        className={`
                          text-sm py-1 px-3
                          ${token.document.processing_status === 'completed' ? 'bg-green-50 text-green-700 border-green-200' : ''}
                          ${token.document.processing_status === 'processing' ? 'bg-blue-50 text-blue-700 border-blue-200 animate-pulse' : ''}
                          ${token.document.processing_status === 'pending' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' : ''}
                          ${token.document.processing_status === 'failed' ? 'bg-red-50 text-red-700 border-red-200' : ''}
                        `}
                      >
                        {token.document.processing_status === 'completed' && '✓ Готов'}
                        {token.document.processing_status === 'processing' && '⟳ Обрабатывается'}
                        {token.document.processing_status === 'pending' && '⏳ В очереди'}
                        {token.document.processing_status === 'failed' && '✗ Ошибка'}
                      </Badge>
                    </div>
                  </div>
                </Card>
              )}

              {}
              <Card className="p-6 shadow-sm">
                <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
                  <Type className="h-6 w-6" />
                  Информация о токене
                </h3>
                
                <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  <InfoItem 
                    icon={<Hash className="h-4 w-4" />} 
                    label="Позиция" 
                    value={token.position.toString()} 
                  />
                  
                  <InfoItem 
                    icon={<Hash className="h-4 w-4" />} 
                    label="Предложение" 
                    value={token.sentence_id.toString()} 
                  />
                  
                  <InfoItem 
                    icon={<Type className="h-4 w-4" />} 
                    label="Слово" 
                    value={token.word} 
                    highlight 
                  />
                  
                  <InfoItem 
                    icon={<BookOpen className="h-4 w-4" />} 
                    label="Лемма" 
                    value={token.lemma || "-"} 
                  />
                  
                  <InfoItem 
                    label="Часть речи" 
                    value={token.pos || "-"} 
                  />
                  
                  <InfoItem 
                    label="Тэг" 
                    value={token.tag || "-"} 
                  />
                  
                  <InfoItem 
                    label="Зависимость" 
                    value={token.dep || "-"} 
                  />
                  
                  <InfoItem 
                    label="NER" 
                    value={token.ner || "-"} 
                  />
                </div>

                {}
                <div className="mt-4 pt-4 border-t flex gap-2">
                  {token.is_punctuation && (
                    <Badge className="bg-gray-100 text-gray-700">Пунктуация</Badge>
                  )}
                  {token.is_stopword && (
                    <Badge className="bg-gray-100 text-gray-700">Стоп-слово</Badge>
                  )}
                  {!token.is_punctuation && !token.is_stopword && (
                    <span className="text-sm text-gray-400">Нет специальных свойств</span>
                  )}
                </div>
              </Card>

              {}
              <Card className="p-6 shadow-sm">
                <h3 className="text-xl font-semibold mb-4">Контекст</h3>
                <div className="bg-gray-50 p-6 rounded-lg border w-full">
                  <p className="text-gray-700 leading-relaxed text-lg break-words">
                    <span className="text-gray-500">{token.left_context}</span>
                    <span className="bg-purple-100 text-purple-900 font-medium px-2 py-1 mx-2 rounded border border-purple-200 whitespace-nowrap">
                      {token.word}
                    </span>
                    <span className="text-gray-500">{token.right_context}</span>
                  </p>
                </div>
              </Card>

              {}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {}
                {token.morph && Object.keys(token.morph).length > 0 && (
                  <Card className="p-6 shadow-sm h-full">
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                      <Tags className="h-5 w-5" />
                      Морфологические признаки
                    </h3>
                    <div className="space-y-3">
                      {Object.entries(token.morph).map(([key, value]) => (
                        <div key={key} className="flex items-start gap-2">
                          <span className="text-sm font-medium text-gray-500 min-w-[120px]">{key}:</span>
                          <span className="text-sm bg-gray-50 px-2 py-1 rounded flex-1 break-words">{String(value)}</span>
                        </div>
                      ))}
                    </div>
                  </Card>
                )}

                {}
                <Card className="p-6 shadow-sm h-full">
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Network className="h-5 w-5" />
                    Синтаксические отношения
                  </h3>
                  <div className="space-y-4">
                    {token.head !== null ? (
                      <div className="flex items-center gap-3 flex-wrap">
                        <span className="text-sm font-medium text-gray-500">Главное слово:</span>
                        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                          {token.head}
                        </Badge>
                      </div>
                    ) : (
                      <p className="text-sm text-gray-400">Нет информации о главном слове</p>
                    )}
                  </div>
                </Card>
              </div>

              {}
              {token.metadata && Object.keys(token.metadata).length > 0 && (
                <Card className="p-6 shadow-sm">
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Layers className="h-5 w-5" />
                    Метаданные
                  </h3>
                  <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                    {Object.entries(token.metadata).map(([key, value]) => (
                      <div key={key} className="flex flex-col gap-1">
                        <span className="text-xs font-medium text-gray-500">{key}</span>
                        <span className="text-sm bg-gray-50 px-2 py-1 rounded break-words">
                          {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                        </span>
                      </div>
                    ))}
                  </div>
                </Card>
              )}
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500">
              <AlertCircle className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p className="text-lg">Токен не найден</p>
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

function InfoItem({ icon, label, value, highlight = false }: { icon?: React.ReactNode; label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex items-start gap-2 min-w-0">
      {icon && <div className="text-gray-400 mt-0.5 shrink-0">{icon}</div>}
      <div className="flex-1 min-w-0">
        <div className="text-xs text-gray-500 mb-1 truncate">{label}</div>
        <div className={`text-base truncate ${highlight ? 'font-semibold text-purple-600' : ''}`}>
          {value}
        </div>
      </div>
    </div>
  );
}