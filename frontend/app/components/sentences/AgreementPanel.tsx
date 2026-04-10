import { CheckCircle2, XCircle } from "lucide-react";
import { Badge } from "app/components/ui/badge";
import type { SemanticAnalysisResponse } from "app/api/semanticTypes";

export function AgreementPanel({
  analysis,
}: {
  analysis: SemanticAnalysisResponse;
}) {
  const sa = analysis.semantic_agreement;
  if (!sa) return null;
  const hasViolations = sa.violations && sa.violations.length > 0;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        {sa.consistent ? (
          <CheckCircle2 className="h-5 w-5 text-green-500" />
        ) : (
          <XCircle className="h-5 w-5 text-red-500" />
        )}
        <span className="font-medium text-sm">
          {sa.consistent
            ? "Семантическая связность соблюдена"
            : "Обнаружено нарушение семантической связности"}
        </span>
      </div>

      {sa.notes && (
        <p className="text-sm text-muted-foreground border-l-2 border-muted pl-3">
          {sa.notes}
        </p>
      )}

      {hasViolations && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Нарушения
          </p>
          {sa.violations!.map((v, i) => (
            <div
              key={i}
              className="rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/30 p-3 space-y-1"
            >
              <div className="flex items-center gap-2 text-sm flex-wrap">
                <span className="font-semibold">{v.word_a}</span>
                <span className="text-muted-foreground text-xs">
                  ──{v.relation}──
                </span>
                <span className="font-semibold">{v.word_b}</span>
                <Badge
                  variant="outline"
                  className={
                    v.verdict === "disconnected"
                      ? "text-red-600 border-red-400 dark:text-red-400"
                      : "text-green-600 border-green-400"
                  }
                >
                  {v.verdict === "disconnected" ? "несвязно" : "связно"}
                </Badge>
              </div>
              {v.shared_components.length > 0 && (
                <div className="flex gap-1 flex-wrap">
                  {v.shared_components.map((c, j) => (
                    <span
                      key={j}
                      className="text-[10px] bg-muted rounded px-1.5 py-0.5"
                    >
                      {c}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {!hasViolations && (
        <p className="text-xs text-muted-foreground">
          Все синтаксически связанные пары слов содержат повторяющиеся
          семантические компоненты.
        </p>
      )}
    </div>
  );
}
