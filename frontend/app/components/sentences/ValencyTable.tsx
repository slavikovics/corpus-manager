import { Badge } from "app/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "app/components/ui/tooltip";
import { ROLE_RU, VALENCY_GROUPS } from "./semanticUtils";
import type {
  SemanticAnalysisResponse,
  SemanticValences,
} from "../../api/semanticTypes";

export function ValencyTable({
  analysis,
}: {
  analysis: SemanticAnalysisResponse;
}) {
  const vm = analysis.valency_model;
  const sv = analysis.semantic_valences;
  if (!sv) return null;

  const filledRoles = Object.entries(sv).filter(([, v]) => v !== null) as [
    string,
    string,
  ][];

  return (
    <div className="space-y-4">
      {vm && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium text-muted-foreground">
            Глагол:
          </span>
          <Badge variant="outline" className="font-mono">
            {vm.verb}
          </Badge>
          {vm.syntactic_voice && (
            <Badge variant="outline">
              {vm.syntactic_voice === "active" ? "актив" : "пассив"}
            </Badge>
          )}
          {vm.separable !== null && (
            <Badge variant="outline">
              {vm.separable ? "валентности отделимы" : "валентности неотделимы"}
            </Badge>
          )}
        </div>
      )}

      {Object.entries(VALENCY_GROUPS).map(([key, group]) => {
        const active = filledRoles.filter(([r]) =>
          (group.roles as string[]).includes(r),
        );
        if (active.length === 0) return null;
        return (
          <div key={key}>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              {group.label}
            </p>
            <div className="flex flex-wrap gap-2">
              {active.map(([role, value]) => {
                const slot = vm?.slots?.find((s) => s.role === role);
                return (
                  <TooltipProvider key={role}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div
                          className={`flex items-start gap-1.5 rounded-lg border px-3 py-2 cursor-default ${group.color}`}
                        >
                          <span className="text-xs font-bold uppercase tracking-wide opacity-60">
                            {ROLE_RU[role] ?? role}
                          </span>
                          <span className="text-xs font-medium max-w-50">
                            «{value}»
                          </span>
                          {slot && (
                            <span className="text-[10px] opacity-50 font-mono ml-1">
                              {slot.obligatory ? "●" : "○"} {slot.morpho_form}
                            </span>
                          )}
                        </div>
                      </TooltipTrigger>
                      <TooltipContent side="top">
                        <p className="text-xs">
                          {slot
                            ? `${slot.obligatory ? "Обязательная" : "Факультативная"} валентность · ${slot.morpho_form ?? "—"}`
                            : "Нет в МУС"}
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                );
              })}
            </div>
          </div>
        );
      })}

      {vm?.slots && vm.slots.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            Модель управления слова (МУС)
          </p>
          <div className="rounded-lg border overflow-hidden">
            <table className="w-full text-xs">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left px-3 py-2 font-medium">
                    Валентность
                  </th>
                  <th className="text-left px-3 py-2 font-medium">
                    Обязательность
                  </th>
                  <th className="text-left px-3 py-2 font-medium">
                    Форма реализации
                  </th>
                  <th className="text-left px-3 py-2 font-medium">
                    Заполнитель
                  </th>
                </tr>
              </thead>
              <tbody>
                {vm.slots.map((slot, i) => {
                  const val = sv[slot.role as keyof SemanticValences];
                  return (
                    <tr key={i} className="border-t">
                      <td className="px-3 py-2 font-mono font-medium">
                        {ROLE_RU[slot.role] ?? slot.role}
                      </td>
                      <td className="px-3 py-2">
                        {slot.obligatory ? (
                          <span className="text-green-600 dark:text-green-400 font-semibold">
                            обязательная
                          </span>
                        ) : (
                          <span className="text-muted-foreground">
                            факультативная
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2 font-mono text-muted-foreground">
                        {slot.morpho_form ?? "—"}
                      </td>
                      <td className="px-3 py-2 italic">
                        {val ?? (
                          <span className="text-muted-foreground">∅</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
