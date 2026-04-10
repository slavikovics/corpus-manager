import type { SemanticValences } from "app/api/semanticTypes";
import { ROLE_RU, dssColor } from "app/components/sentences/semanticUtils";

export function ValencyWheel({ valences }: { valences: SemanticValences }) {
  const filled = Object.entries(valences).filter(([, v]) => v !== null) as [
    string,
    string,
  ][];
  if (filled.length === 0) return null;

  const cx = 400,
    cy = 340,
    r = 220;
  const n = filled.length;

  return (
    <svg viewBox="0 0 800 680" className="w-full mx-auto">
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
