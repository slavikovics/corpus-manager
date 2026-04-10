import { useEffect, useState } from "react";
import { useParams, useNavigate, useSearchParams, Link } from "react-router";
import { Badge } from "app/components/ui/badge";
import { Button } from "app/components/ui/button";
import { Skeleton } from "app/components/ui/skeleton";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "app/components/ui/tabs";
import { toast } from "sonner";
import {
  ArrowLeft,
  Brain,
  Network,
  RefreshCw,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { sentencesApi } from "app/api/sentences";
import { semanticApi } from "app/api/semantics";
import type { SentenceDetailResponse } from "app/api/types";
import type { SemanticAnalysisResponse } from "app/api/semanticTypes";
import { SyntaxPanel } from "app/components/sentences/SyntaxPanel";
import {
  SemanticPanel,
  SemanticPanelEmpty,
} from "app/components/sentences/SemanticPanel";

// Маршрут: /sentences/:doc_id/:sentence_id
// Опциональный параметр ?tab=syntax|semantic

export default function SentenceAnalysisPage() {
  const { doc_id, sentence_id } = useParams<{
    doc_id: string;
    sentence_id: string;
  }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const docId = Number(doc_id);
  const sentenceId = Number(sentence_id);

  const activeTab = searchParams.get("tab") ?? "syntax";

  // ── данные ──────────────────────────────────────────────────────────────────

  const [sentence, setSentence] = useState<SentenceDetailResponse | null>(null);
  const [sentenceLoading, setSentenceLoading] = useState(true);
  const [sentenceError, setSentenceError] = useState<Error | null>(null);

  const [analysis, setAnalysis] = useState<SemanticAnalysisResponse | null>(
    null,
  );
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [analysisError, setAnalysisError] = useState<Error | null>(null);

  // ── загрузка синтаксических данных ──────────────────────────────────────────

  useEffect(() => {
    if (!docId || !sentenceId) return;
    setSentenceLoading(true);
    setSentenceError(null);
    sentencesApi
      .getSentenceDetail(docId, sentenceId)
      .then(setSentence)
      .catch((err) => {
        setSentenceError(err);
        toast.error("Ошибка загрузки", {
          description: "Не удалось загрузить данные предложения",
        });
      })
      .finally(() => setSentenceLoading(false));
  }, [docId, sentenceId]);

  // ── загрузка семантического анализа ─────────────────────────────────────────
  // Запускается только при переходе на вкладку, и только один раз

  useEffect(() => {
    if (activeTab !== "semantic" || analysis || analysisLoading || !sentence)
      return;
    setAnalysisLoading(true);
    setAnalysisError(null);
    semanticApi
      .analyzeSentence(docId, sentenceId)
      .then(setAnalysis)
      .catch((err) => {
        setAnalysisError(err);
        toast.error("Ошибка анализа", {
          description: "Не удалось выполнить семантический анализ",
        });
      })
      .finally(() => setAnalysisLoading(false));
  }, [activeTab, sentence]);

  // ── повторный запуск анализа ─────────────────────────────────────────────────

  const retryAnalysis = () => {
    if (!sentence) return;
    setAnalysis(null);
    setAnalysisError(null);
    setAnalysisLoading(true);
    semanticApi
      .analyzeSentence(docId, sentenceId)
      .then(setAnalysis)
      .catch((err) => {
        setAnalysisError(err);
        toast.error("Ошибка анализа", {
          description: "Не удалось выполнить семантический анализ",
        });
      })
      .finally(() => setAnalysisLoading(false));
  };

  const handleTabChange = (value: string) => {
    setSearchParams({ tab: value }, { replace: true });
  };

  // ── хлебные крошки ───────────────────────────────────────────────────────────

  const breadcrumb = sentence
    ? [
        { label: "Предложения", to: "/sentences" },
        {
          label: `Документ ${docId}`,
          to: `/sentences?doc_id=${docId}`,
        },
        { label: `Предложение #${sentenceId}`, to: null },
      ]
    : null;

  // ── ошибка загрузки предложения ──────────────────────────────────────────────

  if (!sentenceLoading && sentenceError) {
    return (
      <div className="container mx-auto py-20 text-center text-muted-foreground space-y-4">
        <AlertCircle className="h-12 w-12 mx-auto opacity-30" />
        <p className="text-lg">Предложение не найдено</p>
        <Button variant="outline" onClick={() => navigate("/sentences")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Вернуться к списку
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 max-w-6xl">
      {/* Шапка */}
      <div className="mb-6 space-y-3">
        {/* Навигация назад */}
        <Button
          variant="ghost"
          size="sm"
          className="text-muted-foreground -ml-2"
          onClick={() => navigate("/sentences")}
        >
          <ArrowLeft className="h-4 w-4 mr-1.5" />К списку предложений
        </Button>

        {/* Хлебные крошки */}
        {breadcrumb && (
          <nav className="flex items-center gap-1.5 text-sm text-muted-foreground">
            {breadcrumb.map((crumb, i) => (
              <span key={i} className="flex items-center gap-1.5">
                {i > 0 && <span className="opacity-40">/</span>}
                {crumb.to ? (
                  <Link
                    to={crumb.to}
                    className="hover:text-foreground transition-colors"
                  >
                    {crumb.label}
                  </Link>
                ) : (
                  <span className="text-foreground font-medium">
                    {crumb.label}
                  </span>
                )}
              </span>
            ))}
          </nav>
        )}

        {/* Заголовок */}
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            {sentenceLoading ? (
              <>
                <Skeleton className="h-8 w-64" />
                <Skeleton className="h-4 w-96" />
              </>
            ) : sentence ? (
              <>
                <h1 className="text-2xl font-bold">Анализ предложения</h1>
                <p className="text-muted-foreground text-md italic">
                  «{sentence.text}»
                </p>
              </>
            ) : null}
          </div>

          {/* Бейджи метаданных */}
          {sentence && (
            <div className="flex gap-2 flex-wrap shrink-0">
              <Badge variant="outline" className="font-mono text-xs">
                doc {docId}
              </Badge>
              <Badge variant="outline" className="font-mono text-xs">
                #{sentenceId}
              </Badge>
              <Badge variant="secondary" className="text-xs">
                {sentence.token_count} токенов
              </Badge>
            </div>
          )}
        </div>
      </div>

      {/* Основные вкладки */}
      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList className="mb-6 h-10">
          <TabsTrigger value="syntax" className="gap-2 px-5">
            <Network className="h-4 w-4" />
            Синтаксический разбор
          </TabsTrigger>
          <TabsTrigger value="semantic" className="gap-2 px-5">
            <Brain className="h-4 w-4" />
            Семантический анализ
            {analysisLoading && (
              <Loader2 className="h-3 w-3 animate-spin ml-1 opacity-60" />
            )}
          </TabsTrigger>
        </TabsList>

        {/* Вкладка: Синтаксис */}
        <TabsContent value="syntax">
          {sentenceLoading ? (
            <div className="space-y-6">
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-64 w-full" />
              <Skeleton className="h-48 w-full" />
            </div>
          ) : sentence ? (
            <SyntaxPanel sentence={sentence} />
          ) : null}
        </TabsContent>

        {/* Вкладка: Семантика */}
        <TabsContent value="semantic">
          {sentenceLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-48 w-full" />
            </div>
          ) : analysisLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-6 w-1/3" />
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-48 w-full" />
              <Skeleton className="h-32 w-full" />
            </div>
          ) : analysisError ? (
            <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-4">
              <AlertCircle className="h-10 w-10 opacity-30" />
              <p className="text-sm">
                Не удалось выполнить семантический анализ
              </p>
              <Button variant="outline" size="sm" onClick={retryAnalysis}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Повторить анализ
              </Button>
            </div>
          ) : analysis ? (
            <SemanticPanel analysis={analysis} />
          ) : (
            <SemanticPanelEmpty message="Переключитесь на эту вкладку для запуска анализа" />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
