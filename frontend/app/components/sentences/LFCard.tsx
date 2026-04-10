import { ChevronRight } from "lucide-react";
import type { LexicalFunction } from "app/api/semanticTypes";
import { lfColor } from "app/components/sentences/semanticUtils";

export function LFCard({ lf }: { lf: LexicalFunction }) {
  const composed = lf.modifiers?.length
    ? [...lf.modifiers, lf.base].join(" ")
    : lf.base;
  return (
    <div className="flex flex-col gap-1.5 rounded-lg border p-3 bg-card">
      <div className="flex items-center gap-2 flex-wrap">
        <span
          className={`rounded px-2 py-0.5 text-xs font-mono font-semibold ${lfColor(lf.base)}`}
        >
          {composed}
        </span>
        {lf.argument && (
          <>
            <span className="text-muted-foreground text-xs">(</span>
            <span className="text-xs font-medium">{lf.argument}</span>
            <span className="text-muted-foreground text-xs">)</span>
            <ChevronRight className="h-3 w-3 text-muted-foreground" />
            <span className="text-xs font-semibold">{lf.value}</span>
          </>
        )}
      </div>
      {lf.description && (
        <p className="text-xs text-muted-foreground">{lf.description}</p>
      )}
    </div>
  );
}
