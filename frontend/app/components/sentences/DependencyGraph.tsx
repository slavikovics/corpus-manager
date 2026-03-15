import { Network } from 'vis-network/standalone';
import { useRef, useEffect } from 'react';
import type { TokenResponse } from '~/api';
import { getPosStyle, getPosLabel, getDepLabel, getDepColor } from './SyntaxTree';

interface DependencyGraphProps {
  tokens: TokenResponse[];
}

export function DependencyGraph({ tokens }: DependencyGraphProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const networkRef = useRef<Network | null>(null);

  useEffect(() => {
    if (!containerRef.current || tokens.length === 0) return;

    // Подготовка узлов (токенов)
    const nodes = tokens.map((token) => {
      const style = getPosStyle(token.pos);
      return {
        id: token.position,
        label: token.word,
        title: `${token.word}\nЛемма: ${token.lemma || '-'}\nPOS: ${token.pos || '-'}`,
        color: {
          background: style.bg,
          border: style.border,
          highlight: { background: style.bg, border: style.border },
        },
        font: { color: style.text, size: 14 },
        shape: 'box',
        margin: 10,
      };
    });

    // Подготовка рёбер (зависимостей)
    const edges = tokens
      .filter((t) => t.head !== null && t.head !== undefined && t.dep !== 'punct')
      .map((t) => {
        // Предполагаем, что head — это числовой идентификатор (позиция родителя)
        // Если head строка, можно найти по слову, но это ненадёжно; лучше доверять API.
        const fromId = typeof t.head === 'number' ? t.head : undefined;
        return {
          from: fromId,
          to: t.position,
          label: getDepLabel(t.dep),
          color: { color: getDepColor(t.dep), highlight: getDepColor(t.dep) },
          font: { align: 'middle', size: 12, color: '#666' },
          arrows: 'to',
          smooth: true,
        };
      })
      .filter((e) => e.from !== undefined); // пропускаем, если head не определён

    const data = { nodes, edges };

    // Настройки графа
    const options = {
      layout: {
        hierarchical: {
          direction: 'LR', // слева направо (корень слева)
          sortMethod: 'directed',
        },
      },
      edges: {
        smooth: {
          type: 'curvedCW',
          roundness: 0.2,
        },
        font: {
          color: document.documentElement.classList.contains('dark') ? '#ddd' : '#333',
        },
      },
      physics: {
        enabled: false, // отключаем физику для стабильного иерархического расположения
      },
      interaction: {
        hover: true,
        tooltipDelay: 200,
        navigationButtons: true,
        keyboard: true,
      },
      height: '400px',
      width: '100%',
      background: document.documentElement.classList.contains('dark') ? '#1f2937' : '#ffffff',
    };

    // Создаём сеть
    networkRef.current = new Network(containerRef.current, data, options);

    // Очистка при размонтировании
    return () => {
      if (networkRef.current) {
        networkRef.current.destroy();
      }
    };
  }, [tokens]);

  return <div ref={containerRef} style={{ height: '400px', width: '100%' }} />;
}