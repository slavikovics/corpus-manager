import { useState } from "react";
import "reactflow/dist/style.css";
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
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "app/components/ui/tabs";
import {
  Brain,
  AlertCircle,
  CheckCircle2,
  Zap,
  Network,
  BookOpen,
  BarChart2,
} from "lucide-react";
import type { SemanticAnalysisResponse } from "app/api/semanticTypes";
import { AgreementPanel } from "app/components/sentences/AgreementPanel";
import {
  pluralValency,
  pluralLF,
  VALENCY_GROUPS,
} from "app/components/sentences/semanticUtils";
import { ValencyTable } from "app/components/sentences/ValencyTable";
import { ValencyWheel } from "app/components/sentences/ValencyWheel";
import { DSSGraph } from "app/components/sentences/DSSGraph";
import { LFCard } from "app/components/sentences/LFCard";

interface SemanticAnalysisDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  analysis: SemanticAnalysisResponse | null;
  loading: boolean;
  sentenceText?: string;
}

export function SemanticAnalysisDialog({
  open,
  onOpenChange,
  analysis,
  loading,
  sentenceText,
}: SemanticAnalysisDialogProps) {
  const [tab, setTab] = useState("valences");

  const lfs = analysis?.lexical_functions ?? [];
  const hasLFs = lfs.length > 0;
  const hasDSS = !!analysis?.deep_syntactic_structure?.predicate;
  const filledCount = analysis?.semantic_valences
    ? Object.values(analysis.semantic_valences).filter(Boolean).length
    : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[85vw] max-w-225 min-w-175 h-[92vh] max-h-[92vh] p-0 flex flex-col">
        <DialogHeader className="px-6 py-4 border-b shrink-0">
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Brain className="h-5 w-5 text-violet-500" />
            Семантический анализ
          </DialogTitle>
          {sentenceText && (
            <p className="text-sm text-muted-foreground mt-1 italic line-clamp-2">
              «{sentenceText}»
            </p>
          )}
        </DialogHeader>

        <ScrollArea className="flex-1 min-h-0">
          <div className="px-6 py-4 space-y-5 pb-8">
            {loading ? (
              <div className="space-y-4">
                <Skeleton className="h-6 w-1/3" />
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-48 w-full" />
                <Skeleton className="h-32 w-full" />
              </div>
            ) : !analysis ? (
              <div className="text-center py-16 text-muted-foreground">
                <AlertCircle className="h-10 w-10 mx-auto mb-3 opacity-40" />
                <p>Результаты анализа недоступны.</p>
              </div>
            ) : (
              <>
                {analysis.interpretation && (
                  <div className="flex items-start gap-3 rounded-lg border border-violet-200 dark:border-violet-800 bg-violet-50 dark:bg-violet-950/30 px-4 py-3">
                    <Zap className="h-4 w-4 text-violet-500 mt-0.5 shrink-0" />
                    <p className="text-sm text-violet-800 dark:text-violet-300">
                      {analysis.interpretation}
                    </p>
                  </div>
                )}

                <div className="flex gap-2 flex-wrap">
                  <Badge variant="secondary" className="gap-1">
                    <BarChart2 className="h-3 w-3" />
                    {pluralValency(filledCount)} заполнено
                  </Badge>
                  {analysis.valency_model?.verb && (
                    <Badge variant="secondary" className="font-mono">
                      {analysis.valency_model.verb}
                    </Badge>
                  )}
                  {analysis.valency_model?.syntactic_voice && (
                    <Badge variant="outline">
                      {analysis.valency_model.syntactic_voice === "active"
                        ? "актив"
                        : "пассив"}
                    </Badge>
                  )}
                  {hasLFs && (
                    <Badge variant="secondary" className="gap-1">
                      <Zap className="h-3 w-3" />
                      лекс. {pluralLF(lfs.length)}
                    </Badge>
                  )}
                  {analysis.semantic_agreement?.consistent !== null && (
                    <Badge
                      variant={
                        analysis.semantic_agreement?.consistent
                          ? "default"
                          : "destructive"
                      }
                    >
                      {analysis.semantic_agreement?.consistent
                        ? "✓ семантически связно"
                        : "⚠ нарушение связности"}
                    </Badge>
                  )}
                </div>

                <Tabs value={tab} onValueChange={setTab}>
                  <TabsList className="w-full justify-start h-9 bg-muted/50">
                    <TabsTrigger value="valences" className="text-xs gap-1">
                      <BookOpen className="h-3.5 w-3.5" />
                      Валентности
                    </TabsTrigger>
                    <TabsTrigger value="wheel" className="text-xs gap-1">
                      <Network className="h-3.5 w-3.5" />
                      Диаграмма
                    </TabsTrigger>
                    <TabsTrigger value="dss" className="text-xs gap-1">
                      <Network className="h-3.5 w-3.5" />
                      ГСС-граф
                    </TabsTrigger>
                    <TabsTrigger
                      value="lex"
                      className="text-xs gap-1"
                      disabled={!hasLFs}
                    >
                      <Zap className="h-3.5 w-3.5" />
                      Лекс. функции
                    </TabsTrigger>
                    <TabsTrigger value="agreement" className="text-xs gap-1">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Согласование
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="valences" className="mt-4">
                    <Card className="p-4">
                      <ValencyTable analysis={analysis} />
                    </Card>
                  </TabsContent>

                  <TabsContent value="wheel" className="mt-4">
                    <Card className="p-4">
                      <p className="text-xs text-muted-foreground mb-3">
                        Каждый луч — заполненная семантическая валентность. Цвет
                        кодирует группу роли.
                      </p>
                      {analysis.semantic_valences ? (
                        <ValencyWheel valences={analysis.semantic_valences} />
                      ) : (
                        <p className="text-sm text-muted-foreground">
                          Нет данных о валентностях.
                        </p>
                      )}
                      <div className="flex flex-wrap gap-2 mt-3 justify-center">
                        {Object.values(VALENCY_GROUPS).map((g) => (
                          <span
                            key={g.label}
                            className={`text-[10px] px-2 py-0.5 rounded border ${g.color}`}
                          >
                            {g.label}
                          </span>
                        ))}
                      </div>
                    </Card>
                  </TabsContent>

                  <TabsContent value="dss" className="mt-4">
                    <Card className="p-4 space-y-3">
                      {hasDSS ? (
                        <>
                          <DSSGraph analysis={analysis} />
                          {analysis.deep_syntactic_structure
                            ?.paraphrase_note && (
                            <p className="text-sm text-muted-foreground italic border-l-2 border-muted pl-3">
                              {
                                analysis.deep_syntactic_structure
                                  .paraphrase_note
                              }
                            </p>
                          )}
                          {analysis.deep_syntactic_structure
                            ?.syntactic_voice && (
                            <Badge variant="outline">
                              {analysis.deep_syntactic_structure
                                .syntactic_voice === "active"
                                ? "актив"
                                : "пассив"}
                            </Badge>
                          )}
                        </>
                      ) : (
                        <p className="text-sm text-muted-foreground">
                          Данные ГСС отсутствуют.
                        </p>
                      )}
                    </Card>
                  </TabsContent>

                  <TabsContent value="lex" className="mt-4">
                    <Card className="p-4">
                      {hasLFs ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {lfs.map((lf, i) => (
                            <LFCard key={i} lf={lf} />
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">
                          Лексические функции не обнаружены.
                        </p>
                      )}
                    </Card>
                  </TabsContent>

                  <TabsContent value="agreement" className="mt-4">
                    <Card className="p-4">
                      <AgreementPanel analysis={analysis} />
                    </Card>
                  </TabsContent>
                </Tabs>
              </>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
