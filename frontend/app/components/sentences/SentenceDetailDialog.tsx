import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "app/components/ui/dialog";
import { Card } from "app/components/ui/card";
import { Badge } from "app/components/ui/badge";
import { Skeleton } from "app/components/ui/skeleton";
import { ScrollArea } from "app/components/ui/scroll-area";
import type { SentenceDetailResponse } from "app/api/types";
import { SyntaxTree } from "./SyntaxTree";
import { DependencyGraph } from "./DependencyGraph";
import { DEP_COLORS, DEP_LABELS } from "~/posTags";
import {
  FileText,
  Hash,
  Type,
  Network,
  AlertCircle,
} from "lucide-react";

interface SentenceDetailDialogProps {
  sentence: SentenceDetailResponse | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  loading: boolean;
}

export function SentenceDetailDialog({ 
  sentence, 
  open, 
  onOpenChange, 
  loading 
}: SentenceDetailDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[80vw] max-w-[80vw] min-w-[1000px] h-[90vh] max-h-[90vh] p-0">
        <DialogHeader className="px-6 py-4 border-b">
          <DialogTitle className="text-2xl">
            Синтаксический разбор предложения
          </DialogTitle>
        </DialogHeader>
        
        <ScrollArea className="flex-1 min-h-0 px-6 py-4">
          {loading ? (
            <div className="space-y-6">
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-64 w-full" />
              <Skeleton className="h-48 w-full" />
            </div>
          ) : sentence ? (
            <div className="space-y-6 pb-4">
              {sentence.document && (
                <Card className="p-6 mt-2 ml-2 mr-2 bg-card border-border shadow-sm">
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <FileText className="h-5 w-5 text-blue-500" />
                    Информация о документе
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div>
                      <div className="text-xs text-muted-foreground">ID документа</div>
                      <div className="font-medium">{sentence.document.id}</div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">Название</div>
                      <div className="font-medium">{sentence.document.title}</div>
                    </div>
                    {sentence.document.author && (
                      <div>
                        <div className="text-xs text-muted-foreground">Автор</div>
                        <div>{sentence.document.author}</div>
                      </div>
                    )}
                    <div>
                      <div className="text-xs text-muted-foreground">Язык</div>
                      <div>{sentence.document.language || 'en'}</div>
                    </div>
                  </div>
                </Card>
              )}

              <Card className="p-6 mt-2 ml-2 mr-2 bg-card border-border shadow-sm">
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <Type className="h-5 w-5" />
                  Информация о предложении
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-4">
                  <div>
                    <div className="text-xs text-muted-foreground">Начальная позиция</div>
                    <div className="font-medium">{sentence.start_position}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Конечная позиция</div>
                    <div className="font-medium">{sentence.end_position}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Токенов</div>
                    <div className="font-medium">{sentence.token_count}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">ID предложения</div>
                    <div className="font-medium">{sentence.sentence_id}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Документ</div>
                    <div className="font-medium">{sentence.doc_id}</div>
                  </div>
                </div>

                <div className="bg-muted p-4 rounded-lg">
                  <div className="text-sm text-muted-foreground mb-2">Текст:</div>
                  <p className="text-lg leading-relaxed">{sentence.text}</p>
                </div>
              </Card>

              {(sentence.left_context || sentence.right_context) && (
                <Card className="p-4 bg-muted/30">
                  <h3 className="font-semibold mb-2">Контекст</h3>
                  <p className="text-muted-foreground">
                    {sentence.left_context && (
                      <span className="text-gray-500">... {sentence.left_context} </span>
                    )}
                    <span className="bg-yellow-100 dark:bg-yellow-900 font-medium px-1">
                      {sentence.text}
                    </span>
                    {sentence.right_context && (
                      <span className="text-gray-500"> {sentence.right_context} ...</span>
                    )}
                  </p>
                </Card>
              )}

              <Card className="p-6 mt-2 ml-2 mr-2 bg-card border-border shadow-sm">
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <Network className="h-5 w-5" />
                  Синтаксический разбор
                </h3>
                <SyntaxTree tokens={sentence.tokens} />
              </Card>

              <Card className="p-6 mt-2 ml-2 mr-2 bg-card border-border shadow-sm">
              <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
              <Network className="h-4 w-4" />
                Граф зависимостей:
              </h4>
                <DependencyGraph tokens={sentence.tokens} />
              </Card>

<Card className="p-6 mt-2 ml-2 mr-2 bg-card border-border shadow-sm">
  <h3 className="font-semibold mb-3 flex items-center gap-2">
    <Hash className="h-5 w-5" />
    Детальная информация о токенах
  </h3>
  <div className="overflow-x-auto">
    <table className="w-full p-2 table-fixed">
      <thead>
        <tr className="border-b">
          <th className="text-left p-2 w-[60px]">Поз.</th>
          <th className="text-left p-2 w-[150px]">Слово</th>
          <th className="text-left p-2 w-[150px]">Лемма</th>
          <th className="text-left p-2 w-[70px]">POS</th>
          <th className="text-left p-2 w-[150px]">Роль</th>
          <th className="text-left p-2 w-[80px]">Главное</th>
        </tr>
      </thead>
      <tbody>
        {sentence.tokens.map((token) => (
          <tr key={token.position} className="border-b hover:bg-muted/50">
            <td className="p-2 w-[60px]">{token.position}</td>
            
            <td className="p-2 w-[150px]">
              <div className="truncate max-w-[130px]" title={token.word}>
                {token.word}
              </div>
            </td>
            
            <td className="p-2 w-[150px]">
              <div className="truncate max-w-[130px]" title={token.lemma || '-'}>
                {token.lemma || '-'}
              </div>
            </td>
            
            <td className="p-2 w-[70px]">
              <Badge 
                variant="outline" 
                className="truncate max-w-[70px] block text-center"
                title={token.pos || '-'}
              >
                {token.pos || '-'}
              </Badge>
            </td>
            
            <td className="p-2 w-[150px]">
              <span 
                className="px-2 py-1 rounded text-xs text-center block truncate max-w-[130px]"
                style={{ 
                  backgroundColor: `${token.dep ? getDepColor(token.dep) : '#9ca3af'}20`,
                  color: token.dep ? getDepColor(token.dep) : '#9ca3af',
                }}
                title={getDepLabel(token.dep)}
              >
                {getDepLabel(token.dep)}
              </span>
            </td>
        
            <td className="p-2 w-[80px] truncate max-w-[70px]">
              {token.head !== null ? token.head : '-'}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
</Card>
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <AlertCircle className="h-12 w-12 mx-auto mb-4" />
              <p className="text-lg">Предложение не найдено</p>
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

const getDepColor = (dep: string | null): string => {
  if (!dep) return '#9ca3af';
  return DEP_COLORS[dep] || '#9ca3af';
};

const getDepLabel = (dep: string | null): string => {
  if (!dep) return 'неизвестно';
  return DEP_LABELS[dep] || dep;
};