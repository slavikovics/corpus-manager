import { dssColor, ROLE_RU } from "app/components/sentences/semanticUtils";
import { Handle, Position } from "reactflow";

export function DSSNode({
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
