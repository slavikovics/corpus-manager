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
import { getPosStyle, getPosLabel, getDepColor, getDepLabel } from "~/posTags";
import { ScrollArea } from "app/components/ui/scroll-area";
import type { TokenResponse } from "app/api/types";
import { Info } from "lucide-react";

interface SyntaxTreeProps {
  tokens: TokenResponse[];
  className?: string;
  maxHeight?: string | number;
}

export function SyntaxTree({ 
  tokens, 
  className = "",
  maxHeight = 400,
}: SyntaxTreeProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const tokensContainerRef = useRef<HTMLDivElement>(null);
  const [showVerticalScroll, setShowVerticalScroll] = useState(false);
  
  const sortedTokens = [...tokens].sort((a, b) => a.position - b.position);

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollLeft = 0;
      containerRef.current.scrollTop = 0;
    }
  }, [tokens]);

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
                        className="px-3 py-1.5 rounded-lg cursor-pointer transition-all hover:scale-105 inline-block"
                        style={{
                          backgroundColor: style.bg,
                          border: `1px solid ${style.border}`,
                          color: style.text,
                        }}
                      >
                        {token.word}
                      </span>
                    </TooltipTrigger>
                    <TooltipContent 
                      className="max-w-xs text-popover-foreground border shadow-md"
                      sideOffset={5}
                    >
                      <div className="space-y-2 max-w-[280px]">
                        <div className="font-medium truncate" title={token.word}>
                          {token.word}
                        </div>
                        
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div className="text-muted-foreground">Лемма:</div>
                          <div className="truncate" title={token.lemma || '-'}>
                            {token.lemma || '-'}
                          </div>
                          
                          <div className="text-muted-foreground">Часть речи:</div>
                          <div>
                            <Badge
                              variant="outline"
                              className="text-center truncate max-w-[120px]"
                              style={{
                                backgroundColor: style.bg,
                                borderColor: style.border,
                                color: style.text,
                              }}
                              title={getPosLabel(token.pos)}
                            >
                              {getPosLabel(token.pos)}
                            </Badge>
                          </div>
                          
                          <div className="text-muted-foreground">Роль:</div>
                          <div>
                            <span
                              className="px-2 py-0.5 rounded text-xs text-center block truncate max-w-[120px]"
                              style={{
                                backgroundColor: `${getDepColor(token.dep)}20`,
                                color: getDepColor(token.dep),
                                border: `1px solid ${getDepColor(token.dep)}`,
                              }}
                              title={getDepLabel(token.dep)}
                            >
                              {getDepLabel(token.dep)}
                            </span>
                          </div>

                          <div className="text-muted-foreground">Позиция:</div>
                          <div>{token.position}</div>
                          
                          {token.head && (
                            <>
                              <div className="text-muted-foreground">Главное слово:</div>
                              <div 
                                className="font-medium truncate" 
                                title={token.head ?? "неизвестно"}
                              >
                                {token.head}
                              </div>
                            </>
                          )}

                          {token.morph && Object.keys(token.morph).length > 0 && (
                            <>
                              <div className="text-muted-foreground col-span-2 mt-1 font-medium">
                                Морфология:
                              </div>
                              {Object.entries(token.morph).map(([key, value]) => (
                                <Fragment key={key}>
                                  <div className="text-muted-foreground pl-2 truncate" title={key}>
                                    {key}:
                                  </div>
                                  <div className="truncate" title={value}>
                                    {value}
                                  </div>
                                </Fragment>
                              ))}
                            </>
                          )}
                          
                          {(token.is_punctuation || token.is_stopword) && (
                            <>
                              <div className="text-muted-foreground">Свойства:</div>
                              <div className="flex gap-1 flex-wrap">
                                {token.is_punctuation && (
                                  <Badge variant="outline" className="truncate max-w-[60px]" title="Punct">
                                    Punct
                                  </Badge>
                                )}
                                {token.is_stopword && (
                                  <Badge variant="outline" className="truncate max-w-[60px]" title="Stop">
                                    Stop
                                  </Badge>
                                )}
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

      <Card className="p-4">
        <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
          <Info className="h-4 w-4" />
          Синтаксические связи:
        </h4>
        
        <ScrollArea className="whitespace-nowrap rounded-md">
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
                          className="px-2 py-1 rounded whitespace-nowrap max-w-[150px] truncate inline-block"
                          style={getPosStyle(head.pos)}
                          title={head.word}
                        >
                          {head.word}
                        </span>
                        <span className="text-muted-foreground">←</span>
                      </>
                    ) : (
                      <>
                        <span 
                          className="px-2 py-1 rounded whitespace-nowrap bg-muted text-muted-foreground max-w-[150px] truncate inline-block"
                          title={token.head ?? "неизвестно"}
                        >
                          {token.head}
                        </span>
                        <span className="text-muted-foreground">←</span>
                      </>
                    )}
                    <span 
                      className="px-2 py-1 rounded whitespace-nowrap max-w-[150px] truncate inline-block"
                      style={getPosStyle(token.pos)}
                      title={token.word}
                    >
                      {token.word}
                    </span>
                    <Badge 
                      variant="outline"
                      className="max-w-[180px] truncate"
                      style={{
                        backgroundColor: `${getDepColor(token.dep)}20`,
                        borderColor: getDepColor(token.dep),
                        color: getDepColor(token.dep),
                      }}
                      title={getDepLabel(token.dep)}
                    >
                      {getDepLabel(token.dep)}
                    </Badge>
                  </div>
                );
              })}
          </div>
        </ScrollArea>
      </Card>
    </div>
  );
}