import { useEffect, useState } from 'react';
import type { Node, Edge, NodeProps } from 'reactflow';
import ReactFlow, {
  Background,
  Controls,
  Position,
  Handle,
  useNodesState,
  useEdgesState,
  MarkerType,
} from 'reactflow';
import 'reactflow/dist/style.css';
import type { TokenResponse } from '~/api';
import { getPosStyle, getPosLabel, getDepLabel, getDepColor } from '../../posTags';
import { Card } from 'app/components/ui/card';
import { Badge } from 'app/components/ui/badge';

interface DependencyGraphProps {
  tokens: TokenResponse[];
}

function CustomTokenNode({ data }: NodeProps) {
  const style = getPosStyle(data.pos);
  
  return (
    <div className="relative group">
      <Handle
        type="target"
        position={Position.Left}
        className="w-3 h-3 !bg-muted-foreground/50 !border-2 !border-background"
      />
      
      <Card className={`
        px-4 py-2 shadow-md transition-all duration-200
        border-l-4 hover:shadow-lg`
      }
      style={{ borderLeftColor: style.border }}
      >
        <div className="flex flex-col items-center gap-1">
          <span className="font-medium text-sm">{data.word}</span>
          <Badge 
            variant="outline" 
            className="text-[10px] px-1 py-0 h-4"
            style={{
              backgroundColor: style.bg,
              borderColor: style.border,
              color: style.text,
            }}
          >
            {getPosLabel(data.pos)}
          </Badge>
        </div>
      </Card>
      
      <Handle
        type="source"
        position={Position.Right}
        className="w-3 h-3 !bg-muted-foreground/50 !border-2 !border-background"
      />
      
      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 
                    hidden group-hover:block z-50">
        <Card className="p-2 text-xs min-w-[150px] shadow-lg">
          <div className="space-y-1">
            <div className="font-medium">{data.word}</div>
            <div className="grid grid-cols-2 gap-1">
              <span className="text-muted-foreground">Лемма:</span>
              <span>{data.lemma || '-'}</span>
              {data.morph && Object.entries(data.morph).map(([key, value]) => (
                <>
                  <span className="text-muted-foreground">{key}:</span>
                  <span>{value}</span>
                </>
              ))}
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

const nodeTypes = {
  customToken: CustomTokenNode,
};

export function DependencyGraph({ tokens }: DependencyGraphProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const checkDark = () => {
      setIsDark(document.documentElement.classList.contains('dark'));
    };
    
    checkDark();
    const observer = new MutationObserver(checkDark);
    observer.observe(document.documentElement, { attributes: true });
    
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (tokens.length === 0) return;

    const nonPunctTokens = tokens.filter(token => token.pos != 'PUNCT');
    
    const positionMapping = new Map<number, number>();
    nonPunctTokens.forEach((token, index) => {
      positionMapping.set(token.position, index);
    });

    const rootToken = nonPunctTokens.find(t => t.dep === 'root' || t.dep === 'ROOT');
    
    const flowNodes: Node[] = nonPunctTokens.map((token, index) => ({
      id: index.toString(),
      type: 'customToken',
      position: { x: index * 200, y: 0 },
      data: {
        word: token.word,
        pos: token.pos,
        lemma: token.lemma,
        morph: token.morph,
        isRoot: token === rootToken,
      },
      draggable: true,
    }));

    const flowEdges: Edge[] = nonPunctTokens
      .filter(t => {
        if (t.head_position === null || t.head_position === undefined) return false;
        const headExistsInFiltered = nonPunctTokens.some(token => token.position === t.head_position);
        
        return headExistsInFiltered;
      })
      .map(t => {
        const headToken = nonPunctTokens.find(token => token.position === t.head_position);
        const targetIndex = positionMapping.get(t.position);
        const sourceIndex = headToken ? positionMapping.get(headToken.position) : undefined;
        
        if (sourceIndex === undefined || targetIndex === undefined) {
          return null;
        }
        
        return {
          id: `${sourceIndex}-${targetIndex}`,
          source: sourceIndex.toString(),
          target: targetIndex.toString(),
          label: getDepLabel(t.dep),
          type: 'smoothstep',
          animated: false,
          style: { 
            stroke: getDepColor(t.dep),
            strokeWidth: 2,
          },
          labelStyle: { 
            fill: isDark ? '#ddd' : '#666',
            fontSize: 10,
            fontWeight: 500,
          },
          labelBgStyle: { 
            fill: isDark ? '#1f2937' : '#ffffff',
            fillOpacity: 0.8,
          },
          labelBgPadding: [4, 2],
          labelBgBorderRadius: 4,
          markerEnd: {
            type: MarkerType.ArrowClosed,
            color: getDepColor(t.dep),
          },
        };
      })
      .filter((edge): edge is Edge => edge !== null);

    const positionNodes = () => {
      const levels: { [key: string]: number } = {};
      const processed = new Set();
      
      const calculateDepth = (nodeId: string, depth: number) => {
        if (processed.has(nodeId)) return;
        processed.add(nodeId);
        levels[nodeId] = depth;
        
        const children = flowEdges
          .filter(e => e.source === nodeId)
          .map(e => e.target);
        
        children.forEach(child => calculateDepth(child, depth + 1));
      };
      
      if (rootToken) {
        const rootIndex = positionMapping.get(rootToken.position);
        if (rootIndex !== undefined) {
          calculateDepth(rootIndex.toString(), 0);
        }
      } else {
        const sources = flowEdges.map(e => e.source);
        const targets = new Set(flowEdges.map(e => e.target));
        const roots = flowNodes
          .map(n => n.id)
          .filter(id => !targets.has(id) || !sources.includes(id));
        
        roots.forEach((root, i) => calculateDepth(root, i));
      }
      
      const levelWidth = 250;
      const levelHeight = 100;
      const levelCounts: { [key: number]: number } = {};
      
      return flowNodes.map(node => {
        const level = levels[node.id] || 0;
        const index = levelCounts[level] || 0;
        levelCounts[level] = index + 1;
        
        return {
          ...node,
          position: {
            x: level * levelWidth + (index * 50),
            y: index * levelHeight,
          },
        };
      });
    };

    setNodes(positionNodes());
    setEdges(flowEdges);
  }, [tokens, isDark, setNodes, setEdges]);

  return (
    <div className="w-full h-[500px] border rounded-lg overflow-hidden bg-card">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        fitView
        attributionPosition="bottom-left"
        minZoom={0.5}
        maxZoom={2}
        defaultViewport={{ x: 0, y: 0, zoom: 1 }}
        proOptions={{ hideAttribution: true }}
      >
        <Background 
          color={isDark ? '#374151' : '#e5e7eb'} 
          gap={16} 
          size={1} 
        />
        <style>{`
          .react-flow__edge-path {
            transition: stroke 0.2s;
          }
          .react-flow__edge:hover .react-flow__edge-path {
            stroke-width: 3;
          }
          .react-flow__edge-label {
            transition: all 0.2s;
            pointer-events: none;
            user-select: none;
          }
          .react-flow__handle {
            opacity: 0;
            transition: opacity 0.2s;
          }
          .react-flow__node:hover .react-flow__handle {
            opacity: 1;
          }
          .react-flow__minimap {
            display: none !important;
          }
          .react-flow__controls {
            display: none !important;
          }
        `}</style>
      </ReactFlow>
    </div>
  );
}