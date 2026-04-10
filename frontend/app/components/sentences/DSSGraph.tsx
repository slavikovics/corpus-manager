import { ROLE_RU, dssColor } from "app/components/sentences/semanticUtils";
import type { Node, Edge } from "reactflow";
import { useNodesState, useEdgesState } from "reactflow";
import { Background, ReactFlow } from "reactflow";
import { MarkerType } from "reactflow";
import { DSSNode } from "app/components/sentences/DSSNode";
import type { SemanticAnalysisResponse } from "app/api/semanticTypes";

const dssNodeTypes = { dssNode: DSSNode };

export function DSSGraph({ analysis }: { analysis: SemanticAnalysisResponse }) {
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
    <div className="w-full h-70 rounded-lg overflow-hidden border bg-card">
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
