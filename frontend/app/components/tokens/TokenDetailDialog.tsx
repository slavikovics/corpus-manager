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
  Link2,
  Network,
  FileText,
  Tags,
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
      <DialogContent className="max-w-3xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Детальная информация о токене</DialogTitle>
        </DialogHeader>
        <ScrollArea className="max-h-[calc(80vh-100px)] pr-4">
          {loading ? (
            <div className="space-y-4">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-24 w-full" />
            </div>
          ) : token ? (
            <div className="space-y-6">
              {}
              <Card className="p-4">
                <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Основная информация
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <InfoItem icon={<Hash />} label="Документ" value={token.doc_id.toString()} />
                  <InfoItem icon={<Hash />} label="Позиция" value={token.position.toString()} />
                  <InfoItem icon={<Type />} label="Слово" value={token.word} highlight />
                  <InfoItem icon={<BookOpen />} label="Лемма" value={token.lemma || "-"} />
                  <InfoItem label="Часть речи" value={token.pos || "-"} />
                  <InfoItem label="Тэг" value={token.tag || "-"} />
                  <InfoItem label="Зависимость" value={token.dep || "-"} />
                  <InfoItem label="NER" value={token.ner || "-"} />
                </div>
              </Card>
              {}
              <Card className="p-4">
                <h3 className="text-lg font-semibold mb-3">Контекст</h3>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-gray-700 leading-relaxed">
                    <span className="text-gray-500">{token.left_context}</span>
                    <span className="bg-yellow-100 font-medium px-1 mx-1 rounded">
                      {token.word}
                    </span>
                    <span className="text-gray-500">{token.right_context}</span>
                  </p>
                </div>
              </Card>
              {}
              {token.morph && Object.keys(token.morph).length > 0 && (
                <Card className="p-4">
                  <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                    <Tags className="h-5 w-5" />
                    Морфологические признаки
                  </h3>
                  <div className="grid grid-cols-2 gap-2">
                    {Object.entries(token.morph).map(([key, value]) => (
                      <div key={key} className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-500">{key}:</span>
                        <span className="text-sm">{value}</span>
                      </div>
                    ))}
                  </div>
                </Card>
              )}
              {}
              {token.children_positions && token.children_positions.length > 0 && (
                <Card className="p-4">
                  <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                    <Network className="h-5 w-5" />
                    Синтаксические зависимости
                  </h3>
                  <div className="space-y-2">
                    {token.head_position && (
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-500">Главное слово:</span>
                        <Badge variant="outline">позиция {token.head_position}</Badge>
                      </div>
                    )}
                    {token.children_positions.length > 0 && (
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium text-gray-500">Зависимые слова:</span>
                        {token.children_positions.map(pos => (
                          <Badge key={pos} variant="outline">поз. {pos}</Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </Card>
              )}
              {}
              <Card className="p-4">
                <h3 className="text-lg font-semibold mb-3">Свойства</h3>
                <div className="flex gap-2">
                  {token.is_punctuation && (
                    <Badge className="bg-gray-100">Пунктуация</Badge>
                  )}
                  {token.is_stopword && (
                    <Badge className="bg-yellow-100">Стоп-слово</Badge>
                  )}
                </div>
              </Card>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              Токен не найден
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
function InfoItem({ icon, label, value, highlight = false }: { icon?: React.ReactNode; label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex items-start gap-2">
      {icon && <div className="text-gray-400 mt-0.5">{icon}</div>}
      <div className="flex-1">
        <div className="text-xs text-gray-500">{label}</div>
        <div className={`text-sm ${highlight ? 'font-medium text-blue-600' : ''}`}>{value}</div>
      </div>
    </div>
  );
}