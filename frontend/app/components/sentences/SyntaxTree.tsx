import { useRef, useEffect, useState } from "react";
import { Card } from "app/components/ui/card";
import { Badge } from "app/components/ui/badge";
import { Fragment } from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "app/components/ui/tooltip";
import { ScrollArea, ScrollBar } from "app/components/ui/scroll-area";
import type { TokenResponse } from "app/api/types";
import { Info } from "lucide-react";

interface SyntaxTreeProps {
  tokens: TokenResponse[];
  className?: string;
  maxHeight?: string | number;
}

// Цвета для разных частей речи
const POS_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  'NOUN': { bg: '#3b82f620', text: '#3b82f6', border: '#3b82f6' }, // синий
  'VERB': { bg: '#ef444420', text: '#ef4444', border: '#ef4444' }, // красный
  'ADJ': { bg: '#10b98120', text: '#10b981', border: '#10b981' }, // зеленый
  'ADV': { bg: '#f59e0b20', text: '#f59e0b', border: '#f59e0b' }, // оранжевый
  'ADP': { bg: '#8b5cf620', text: '#8b5cf6', border: '#8b5cf6' }, // фиолетовый
  'PRON': { bg: '#ec489920', text: '#ec4899', border: '#ec4899' }, // розовый
  'DET': { bg: '#06b6d420', text: '#06b6d4', border: '#06b6d4' }, // голубой
  'CONJ': { bg: '#f9731620', text: '#f97316', border: '#f97316' }, // оранжевый
  'CCONJ': { bg: '#f9731620', text: '#f97316', border: '#f97316' }, // оранжевый
  'SCONJ': { bg: '#f9731620', text: '#f97316', border: '#f97316' }, // оранжевый
  'NUM': { bg: '#84cc1620', text: '#84cc16', border: '#84cc16' }, // лаймовый
  'PART': { bg: '#a855f720', text: '#a855f7', border: '#a855f7' }, // пурпурный
  'INTJ': { bg: '#d946ef20', text: '#d946ef', border: '#d946ef' }, // ярко-розовый
  'PUNCT': { bg: '#6b728020', text: '#6b7280', border: '#6b7280' }, // серый
  'X': { bg: '#6b728020', text: '#6b7280', border: '#6b7280' }, // серый
  'default': { bg: '#9ca3af20', text: '#9ca3af', border: '#9ca3af' }, // светло-серый
};

// Цвета для разных типов зависимостей
const DEP_COLORS: Record<string, string> = {
  'nsubj': '#3b82f6',
  'nsubj:pass': '#3b82f6',
  'obj': '#10b981',
  'iobj': '#10b981',
  'obl': '#f59e0b',
  'advmod': '#f59e0b',
  'amod': '#8b5cf6',
  'nmod': '#8b5cf6',
  'det': '#ec4899',
  'case': '#6b7280',
  'conj': '#ef4444',
  'cc': '#ef4444',
  'aux': '#14b8a6',
  'root': '#000000',
  'punct': '#9ca3af',
};

// Словарь для перевода частей речи
const POS_LABELS: Record<string, string> = {
  'NOUN': 'существительное',
  'VERB': 'глагол',
  'ADJ': 'прилагательное',
  'ADV': 'наречие',
  'ADP': 'предлог',
  'PRON': 'местоимение',
  'DET': 'детерминатив',
  'CONJ': 'союз',
  'CCONJ': 'сочинит. союз',
  'SCONJ': 'подчинит. союз',
  'NUM': 'числительное',
  'PART': 'частица',
  'INTJ': 'междометие',
  'PUNCT': 'пунктуация',
  'X': 'другое',
};

// Словарь для перевода зависимостей
const DEP_LABELS: Record<string, string> = {
  'nsubj': 'подлежащее',
  'nsubj:pass': 'подлежащее страд.',
  'obj': 'дополнение',
  'iobj': 'косв. дополнение',
  'obl': 'обстоятельство',
  'advmod': 'обст. образа действия',
  'amod': 'определение',
  'nmod': 'несогл. определение',
  'det': 'определитель',
  'case': 'предлог',
  'conj': 'союзная связь',
  'cc': 'сочинит. союз',
  'aux': 'вспом. глагол',
  'root': 'главное',
  'punct': 'пунктуация',
};

const getPosStyle = (pos: string | null) => {
  if (!pos) return POS_COLORS['default'];
  return POS_COLORS[pos] || POS_COLORS['default'];
};

const getDepColor = (dep: string | null): string => {
  if (!dep) return '#9ca3af';
  return DEP_COLORS[dep] || '#9ca3af';
};

const getPosLabel = (pos: string | null): string => {
  if (!pos) return 'неизвестно';
  return POS_LABELS[pos] || pos;
};

const getDepLabel = (dep: string | null): string => {
  if (!dep) return 'неизвестно';
  return DEP_LABELS[dep] || dep;
};

export function SyntaxTree({ 
  tokens, 
  className = "",
  maxHeight = 400,
}: SyntaxTreeProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const tokensContainerRef = useRef<HTMLDivElement>(null);
  const [showVerticalScroll, setShowVerticalScroll] = useState(false);
  
  // Сортируем токены по позиции
  const sortedTokens = [...tokens].sort((a, b) => a.position - b.position);

  // Эффект для автоматического скролла к началу при смене предложения
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollLeft = 0;
      containerRef.current.scrollTop = 0;
    }
  }, [tokens]);

  // Эффект для проверки необходимости вертикального скролла
  useEffect(() => {
    const checkOverflow = () => {
      if (tokensContainerRef.current && containerRef.current) {
        const containerHeight = containerRef.current.clientHeight;
        const contentHeight = tokensContainerRef.current.scrollHeight;
        setShowVerticalScroll(contentHeight > containerHeight);
      }
    };

    checkOverflow();
    
    const resizeObserver = new ResizeObserver(checkOverflow);
    if (tokensContainerRef.current) {
      resizeObserver.observe(tokensContainerRef.current);
    }
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    return () => resizeObserver.disconnect();
  }, [sortedTokens]);

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Предложение с цветными словами и адаптивным переносом */}
      <Card className="p-6 bg-white dark:bg-gray-900 overflow-hidden">
        <div
          ref={containerRef}
          className={`
            overflow-auto pr-4
            ${showVerticalScroll ? 'overflow-y-scroll' : ''}
          `}
          style={{ maxHeight }}
        >
          <div
            ref={tokensContainerRef}
            className="flex flex-wrap gap-2 p-1"
          >
            <TooltipProvider>
              {sortedTokens.map((token) => {
                const style = getPosStyle(token.pos);
                
                return (
                  <Tooltip key={token.position}>
                    <TooltipTrigger asChild>
                      <span
                        className="px-3 py-1.5 rounded-lg cursor-help transition-all hover:scale-105 inline-block"
                        style={{
                          backgroundColor: style.bg,
                          border: `1px solid ${style.border}`,
                          color: style.text,
                        }}
                      >
                        {token.word}
                      </span>
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs bg-popover text-popover-foreground border shadow-md">
                      <div className="space-y-2">
                        <div className="font-medium">{token.word}</div>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div className="text-muted-foreground">Лемма:</div>
                          <div>{token.lemma || '-'}</div>
                          
                          <div className="text-muted-foreground">Часть речи:</div>
                          <div>
                            <Badge 
                              variant="outline"
                              style={{
                                backgroundColor: style.bg,
                                borderColor: style.border,
                                color: style.text,
                              }}
                            >
                              {getPosLabel(token.pos)}
                            </Badge>
                          </div>
                          
                          <div className="text-muted-foreground">Роль:</div>
                          <div>
                            <span
                              className="px-2 py-0.5 rounded text-xs"
                              style={{
                                backgroundColor: `${getDepColor(token.dep)}20`,
                                color: getDepColor(token.dep),
                                border: `1px solid ${getDepColor(token.dep)}`,
                              }}
                            >
                              {getDepLabel(token.dep)}
                            </span>
                          </div>
                          
                          <div className="text-muted-foreground">Позиция:</div>
                          <div>{token.position}</div>
                          
                          {token.head && (
                            <>
                              <div className="text-muted-foreground">Главное слово:</div>
                              <div className="font-medium">{token.head}</div>
                            </>
                          )}

                          {/* Морфологические признаки */}
                          {token.morph && Object.keys(token.morph).length > 0 && (
                            <>
                              <div className="text-muted-foreground col-span-2 mt-1 font-medium">
                                Морфология:
                              </div>
                              {Object.entries(token.morph).map(([key, value]) => (
                                <Fragment key={key}>
                                  <div className="text-muted-foreground pl-2">{key}:</div>
                                  <div>{value}</div>
                                </Fragment>
                              ))}
                            </>
                          )}
                          
                          {(token.is_punctuation || token.is_stopword) && (
                            <>
                              <div className="text-muted-foreground">Свойства:</div>
                              <div className="flex gap-1">
                                {token.is_punctuation && <Badge variant="outline">Punct</Badge>}
                                {token.is_stopword && <Badge variant="outline">Stop</Badge>}
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    </TooltipContent>
                  </Tooltip>
                );
              })}
            </TooltipProvider>
          </div>
        </div>
      </Card>

      {/* Схема связей (упрощенная) */}
      <Card className="p-4">
        <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
          <Info className="h-4 w-4" />
          Синтаксические связи:
        </h4>
        
          <div className="space-y-2 pr-4 pb-2">
            {sortedTokens
              .filter(t => t.head !== null && t.dep !== 'punct')
              .map((token) => {
                const head = sortedTokens.find(t => t.word === token.head);
                
                return (
                  <div key={`${token.position}-${token.head}`} className="flex items-center gap-2 text-sm flex-wrap">
                    {head ? (
                      <>
                        <span 
                          className="px-2 py-1 rounded whitespace-nowrap"
                          style={getPosStyle(head.pos)}
                        >
                          {head.word}
                        </span>
                        <span className="text-muted-foreground">←</span>
                      </>
                    ) : (
                      <>
                        <span className="px-2 py-1 rounded whitespace-nowrap bg-muted text-muted-foreground">
                          {token.head}
                        </span>
                        <span className="text-muted-foreground">←</span>
                      </>
                    )}
                    <span 
                      className="px-2 py-1 rounded whitespace-nowrap"
                      style={getPosStyle(token.pos)}
                    >
                      {token.word}
                    </span>
                    <Badge 
                      variant="outline"
                      style={{
                        backgroundColor: `${getDepColor(token.dep)}20`,
                        borderColor: getDepColor(token.dep),
                        color: getDepColor(token.dep),
                      }}
                    >
                      {getDepLabel(token.dep)}
                    </Badge>
                  </div>
                );
              })}
          </div>
          <ScrollBar orientation="vertical" />
          <ScrollBar orientation="horizontal" />
      </Card>
    </div>
  );
}