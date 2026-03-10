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
import { cn } from "app/lib/utils";

interface TokenDetailDialogProps {
  token: TokenDetailResponse | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  loading: boolean;
}

export function TokenDetailDialog({ token, open, onOpenChange, loading }: TokenDetailDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[60vw] max-w-[60vw] min-w-[800px] h-[90vh] max-h-[90vh] p-0 flex flex-col bg-background border-border">
        <DialogHeader className="px-6 py-4 border-border shrink-0">
          <DialogTitle className="text-2xl text-foreground">Детальная информация о токене</DialogTitle>
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
              {/* Информация о документе */}
              {token.document && (
                <Card className="p-6 mt-2 ml-2 mr-2 border-l-4 border-l-purple-500 bg-card border-border shadow-sm">
                  <h3 className="text-xl font-semibold mb-4 flex items-center gap-2 text-foreground">
                    <FileText className="h-6 w-6" />
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
                      <div className="text-xs text-muted-foreground mb-1">Статус обработки</div>
                        {token.document.processing_status}
                    </div>
                  </div>
                </Card>
              )}

              {/* Информация о токене */}
              <Card className="p-6 ml-2 mr-2 bg-card border-border shadow-sm">
                <h3 className="text-xl font-semibold mb-4 flex items-center gap-2 text-foreground">
                  <Type className="h-6 w-6 text-muted-foreground" />
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

                {/* Специальные свойства */}
                <div className="mt-4 pt-4 border-t border-border flex gap-2">
                  {token.is_punctuation && (
                    <Badge variant="outline" className="bg-muted text-muted-foreground border-border">
                      Пунктуация
                    </Badge>
                  )}
                  {token.is_stopword && (
                    <Badge variant="outline" className="bg-muted text-muted-foreground border-border">
                      Стоп-слово
                    </Badge>
                  )}
                  {!token.is_punctuation && !token.is_stopword && (
                    <span className="text-sm text-muted-foreground">Нет специальных свойств</span>
                  )}
                </div>
              </Card>

              {/* Контекст */}
              <Card className="p-6 ml-2 mr-2 bg-card border-border shadow-sm">
                <h3 className="text-xl font-semibold mb-4 text-foreground">Контекст</h3>
                <div className="bg-muted/50 p-6 rounded-lg border border-border w-full">
                  <p className="text-foreground leading-relaxed text-lg break-words">
                    <span className="text-muted-foreground">{token.left_context}</span>
                    <span className="bg-purple-500/10 text-purple-700 dark:text-purple-300 font-medium px-2 py-1 mx-2 rounded border border-purple-200 dark:border-purple-800 whitespace-nowrap">
                      {token.word}
                    </span>
                    <span className="text-muted-foreground">{token.right_context}</span>
                  </p>
                </div>
              </Card>

              {/* Морфология и синтаксис */}
              <div className="ml-2 mr-2 grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Морфологические признаки */}
                {token.morph && Object.keys(token.morph).length > 0 && (
                  <Card className="p-6 bg-card border-border shadow-sm h-full">
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2 text-foreground">
                      <Tags className="h-5 w-5 text-muted-foreground" />
                      Морфологические признаки
                    </h3>
                    <div className="space-y-3">
                      {Object.entries(token.morph).map(([key, value]) => (
                        <div key={key} className="flex items-start gap-2">
                          <span className="text-sm font-medium text-muted-foreground min-w-[120px]">{key}:</span>
                          <span className="text-sm bg-muted/50 px-2 py-1 rounded flex-1 break-words text-foreground">
                            {String(value)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </Card>
                )}

                {/* Синтаксические отношения */}
                <Card className="p-6 bg-card border-border shadow-sm h-full">
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2 text-foreground">
                    <Network className="h-5 w-5 text-muted-foreground" />
                    Синтаксические отношения
                  </h3>
                  <div className="space-y-4">
                    {token.head !== null ? (
                      <div className="flex items-center gap-3 flex-wrap">
                        <span className="text-sm font-medium text-muted-foreground">Главное слово:</span>
                        <Badge variant="outline" className="bg-white-500/10 text-white-700 dark:text-white-300 border-white-200 dark:border-white-800">
                          {token.head}
                        </Badge>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">Нет информации о главном слове</p>
                    )}
                  </div>
                </Card>
              </div>

              {/* Метаданные */}
              {token.metadata && Object.keys(token.metadata).length > 0 && (
                <Card className="p-6 bg-card border-border shadow-sm">
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2 text-foreground">
                    <Layers className="h-5 w-5 text-muted-foreground" />
                    Метаданные
                  </h3>
                  <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                    {Object.entries(token.metadata).map(([key, value]) => (
                      <div key={key} className="flex flex-col gap-1">
                        <span className="text-xs font-medium text-muted-foreground">{key}</span>
                        <span className="text-sm bg-muted/50 px-2 py-1 rounded break-words text-foreground">
                          {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                        </span>
                      </div>
                    ))}
                  </div>
                </Card>
              )}
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <AlertCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground/30" />
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
      {icon && <div className="text-muted-foreground mt-0.5 shrink-0">{icon}</div>}
      <div className="flex-1 min-w-0">
        <div className="text-xs text-muted-foreground mb-1 truncate">{label}</div>
        <div className={cn(
          "text-base truncate",
          highlight ? 'font-semibold text-purple-600 dark:text-purple-400' : 'text-foreground'
        )}>
          {value}
        </div>
      </div>
    </div>
  );
}