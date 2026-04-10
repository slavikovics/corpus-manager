import type { SemanticValences } from "app/api/semanticTypes";

export const ROLE_RU: Record<string, string> = {
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

export const VALENCY_GROUPS: Record<
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

export const LF_COLOR: Record<string, string> = {
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

export function lfColor(base: string) {
  return LF_COLOR[base] ?? "bg-muted text-muted-foreground";
}

export const DSS_ROLE_COLOR: Record<string, string> = {
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

export function dssColor(role: string) {
  return DSS_ROLE_COLOR[role] ?? "#9ca3af";
}

export function pluralValency(n: number) {
  if (n % 100 >= 11 && n % 100 <= 14) return `${n} валентностей`;
  if (n % 10 === 1) return `${n} валентность`;
  if (n % 10 >= 2 && n % 10 <= 4) return `${n} валентности`;
  return `${n} валентностей`;
}

export function pluralLF(n: number) {
  if (n % 100 >= 11 && n % 100 <= 14) return `${n} функций`;
  if (n % 10 === 1) return `${n} функция`;
  if (n % 10 >= 2 && n % 10 <= 4) return `${n} функции`;
  return `${n} функций`;
}
