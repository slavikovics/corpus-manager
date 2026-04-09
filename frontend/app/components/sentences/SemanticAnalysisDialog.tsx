import { useState } from "react";
import type { Node, Edge } from "reactflow";
import ReactFlow, {
  Background,
  Position,
  Handle,
  useNodesState,
  useEdgesState,
  MarkerType,
} from "reactflow";
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
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "app/components/ui/tooltip";
import {
  Brain,
  AlertCircle,
  CheckCircle2,
  XCircle,
  ChevronRight,
  Zap,
  Network,
  BookOpen,
  BarChart2,
} from "lucide-react";
import type {
  SemanticAnalysisResponse,
  SemanticValences,
  LexicalFunction,
} from "app/api/semanticTypes";

const ROLE_RU: Record<string, string> = {
  subject: "субъект",
  object: "объект",
  counterpart: "контрагент",
  head: "глава",
  content: "содержание",
  addressee: "адресат",
  recipient: "получатель",
  mediator: "посредник",
  source: "источник",
  location: "место",
  starting_point: "нач. точка",
  end_point: "кон. точка",
  route: "маршрут",
  medium: "среда",
  instrument: "инструмент",
  manner: "способ",
  condition: "условие",
  motivation: "мотивировка",
  cause: "причина",
  result: "результат",
  purpose: "цель",
  aspect: "аспект",
  quantity: "количество",
  duration: "срок",
  time: "время",
};

const VALENCY_GROUPS: Record<
  string,
  { roles: (keyof SemanticValences)[]; color: string; label: string }
> = {
  core: {
    roles: ["subject", "object", "counterpart", "head"],
    color:
      "bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-300 border-violet-200 dark:border-violet-700",
    label: "Участники",
  },
  communication: {
    roles: ["content", "addressee", "recipient", "mediator"],
    color:
      "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300 border-blue-200 dark:border-blue-700",
    label: "Коммуникация",
  },
  spatial: {
    roles: ["source", "location", "starting_point", "end_point", "route"],
    color:
      "bg-teal-100 text-teal-800 dark:bg-teal-900/40 dark:text-teal-300 border-teal-200 dark:border-teal-700",
    label: "Пространство",
  },
  causal: {
    roles: ["cause", "motivation", "purpose", "condition", "result"],
    color:
      "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 border-amber-200 dark:border-amber-700",
    label: "Причина / модальность",
  },
  manner: {
    roles: ["medium", "instrument", "manner"],
    color:
      "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-700",
    label: "Способ / средство",
  },
  quantitative: {
    roles: ["aspect", "quantity", "duration", "time"],
    color:
      "bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300 border-rose-200 dark:border-rose-700",
    label: "Количество / время",
  },
};

const LF_COLOR: Record<string, string> = {
  Caus: "bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300",
  Liqu: "bg-red-100    text-red-800    dark:bg-red-900/40    dark:text-red-300",
  Incep:
    "bg-green-100  text-green-800  dark:bg-green-900/40  dark:text-green-300",
  Fin: "bg-slate-100  text-slate-800  dark:bg-slate-900/40  dark:text-slate-300",
  Cont: "bg-cyan-100   text-cyan-800   dark:bg-cyan-900/40   dark:text-cyan-300",
  Oper1:
    "bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-300",
  Oper2:
    "bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-300",
  Func0:
    "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300",
  Func1:
    "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300",
  Func2:
    "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300",
  Magn: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300",
  Real1:
    "bg-teal-100   text-teal-800   dark:bg-teal-900/40   dark:text-teal-300",
  Real2:
    "bg-teal-100   text-teal-800   dark:bg-teal-900/40   dark:text-teal-300",
  Result:
    "bg-pink-100   text-pink-800   dark:bg-pink-900/40   dark:text-pink-300",
  Manif:
    "bg-sky-100    text-sky-800    dark:bg-sky-900/40    dark:text-sky-300",
};

function lfColor(base: string) {
  return LF_COLOR[base] ?? "bg-muted text-muted-foreground";
}

const DSS_ROLE_COLOR: Record<string, string> = {
  subject: "#8b5cf6",
  object: "#3b82f6",
  cause: "#f59e0b",
  motivation: "#f97316",
  purpose: "#ec4899",
  instrument: "#10b981",
  content: "#6366f1",
  location: "#14b8a6",
  time: "#ef4444",
  result: "#84cc16",
};

function dssColor(role: string) {
  return DSS_ROLE_COLOR[role] ?? "#9ca3af";
}

function DSSNode({
  data,
}: {
  data: { label: string; role: string; isPredicate?: boolean };
}) {
  const color = data.isPredicate ? "#7c3aed" : dssColor(data.role);
  return (
    <div
      style={{
        background: `${color}18`,
        border: `1.5px solid ${color}`,
        borderRadius: 10,
        padding: "6px 14px",
        minWidth: 80,
        textAlign: "center",
        fontSize: 13,
        fontWeight: data.isPredicate ? 600 : 400,
        color: "var(--foreground)",
      }}
    >
      <Handle type="target" position={Position.Top} style={{ opacity: 0 }} />
      {!data.isPredicate && (
        <div
          style={{
            fontSize: 10,
            color,
            fontWeight: 600,
            marginBottom: 2,
            textTransform: "uppercase",
            letterSpacing: "0.04em",
          }}
        >
          {ROLE_RU[data.role] ?? data.role}
        </div>
      )}
      <div>{data.label}</div>
      <Handle type="source" position={Position.Bottom} style={{ opacity: 0 }} />
    </div>
  );
}

const dssNodeTypes = { dssNode: DSSNode };

function DSSGraph({ analysis }: { analysis: SemanticAnalysisResponse }) {
  const dss = analysis.deep_syntactic_structure;
  if (!dss?.predicate)
    return (
      <p className="text-sm text-muted-foreground">Данные ГСС отсутствуют.</p>
    );

  const args = dss.arguments ?? [];
  const cols = Math.min(args.length, 4);
  const colW = 160;
  const totalW = cols * colW;
  const startX = (700 - totalW) / 2;

  const initNodes: Node[] = [
    {
      id: "pred",
      type: "dssNode",
      position: { x: totalW / 2 + startX - 60, y: 0 },
      data: { label: dss.predicate, role: "predicate", isPredicate: true },
    },
    ...args.map((arg, i) => ({
      id: `arg-${i}`,
      type: "dssNode",
      position: { x: startX + i * colW, y: 140 },
      data: { label: arg.filler, role: arg.role },
    })),
  ];

  const initEdges: Edge[] = args.map((arg, i) => ({
    id: `e-${i}`,
    source: "pred",
    target: `arg-${i}`,
    label: ROLE_RU[arg.role] ?? arg.role,
    type: "smoothstep",
    style: { stroke: dssColor(arg.role), strokeWidth: 1.5 },
    labelStyle: { fontSize: 10, fill: dssColor(arg.role), fontWeight: 600 },
    labelBgStyle: { fill: "var(--background)", fillOpacity: 0.9 },
    labelBgBorderRadius: 4,
    markerEnd: { type: MarkerType.ArrowClosed, color: dssColor(arg.role) },
  }));

  const [nodes, , onNodesChange] = useNodesState(initNodes);
  const [edges, , onEdgesChange] = useEdgesState(initEdges);

  return (
    <div className="w-full h-[280px] rounded-lg overflow-hidden border bg-card">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={dssNodeTypes}
        fitView
        fitViewOptions={{ padding: 0.3 }}
        proOptions={{ hideAttribution: true }}
        nodesDraggable
        nodesConnectable={false}
        elementsSelectable={false}
      >
        <Background gap={20} size={1} color="var(--border)" />
      </ReactFlow>
    </div>
  );
}

function ValencyWheel({ valences }: { valences: SemanticValences }) {
  const filled = Object.entries(valences).filter(([, v]) => v !== null) as [
    string,
    string,
  ][];
  if (filled.length === 0) return null;

  const cx = 200,
    cy = 170,
    r = 110;
  const n = filled.length;

  return (
    <svg viewBox="0 0 400 340" className="w-full max-w-[340px] mx-auto">
      {filled.map(([role], i) => {
        const angle = (i / n) * 2 * Math.PI - Math.PI / 2;
        return (
          <line
            key={role}
            x1={cx}
            y1={cy}
            x2={cx + r * Math.cos(angle)}
            y2={cy + r * Math.sin(angle)}
            stroke="currentColor"
            strokeOpacity={0.08}
            strokeWidth={1}
          />
        );
      })}
      <circle cx={cx} cy={cy} r={8} className="fill-violet-500" />
      {filled.map(([role, value], i) => {
        const angle = (i / n) * 2 * Math.PI - Math.PI / 2;
        const x = cx + r * Math.cos(angle);
        const y = cy + r * Math.sin(angle);
        const lx = cx + (r + 34) * Math.cos(angle);
        const ly = cy + (r + 34) * Math.sin(angle);
        const anchor = lx < cx - 4 ? "end" : lx > cx + 4 ? "start" : "middle";
        const color = dssColor(role);
        const display =
          (value as string).length > 20
            ? (value as string).slice(0, 18) + "…"
            : value;
        return (
          <g key={role}>
            <line
              x1={cx}
              y1={cy}
              x2={x}
              y2={y}
              stroke={color}
              strokeWidth={2.5}
              strokeOpacity={0.6}
            />
            <circle cx={x} cy={y} r={6} fill={color} />
            <text
              x={lx}
              y={ly - 6}
              textAnchor={anchor}
              fontSize={9}
              fontWeight={600}
              fill={color}
              letterSpacing="0.03em"
            >
              {ROLE_RU[role] ?? role}
            </text>
            <text
              x={lx}
              y={ly + 6}
              textAnchor={anchor}
              fontSize={9}
              fill="currentColor"
              fillOpacity={0.65}
            >
              {display}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

function LFCard({ lf }: { lf: LexicalFunction }) {
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

function ValencyTable({ analysis }: { analysis: SemanticAnalysisResponse }) {
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
                          <span className="text-xs font-medium max-w-[200px]">
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

function AgreementPanel({ analysis }: { analysis: SemanticAnalysisResponse }) {
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

function pluralValency(n: number) {
  if (n % 100 >= 11 && n % 100 <= 14) return `${n} валентностей`;
  if (n % 10 === 1) return `${n} валентность`;
  if (n % 10 >= 2 && n % 10 <= 4) return `${n} валентности`;
  return `${n} валентностей`;
}

function pluralLF(n: number) {
  if (n % 100 >= 11 && n % 100 <= 14) return `${n} функций`;
  if (n % 10 === 1) return `${n} функция`;
  if (n % 10 >= 2 && n % 10 <= 4) return `${n} функции`;
  return `${n} функций`;
}

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
      <DialogContent className="w-[85vw] max-w-[900px] min-w-[700px] h-[92vh] max-h-[92vh] p-0 flex flex-col">
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
