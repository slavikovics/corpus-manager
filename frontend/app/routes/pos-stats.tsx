import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { Card } from "app/components/ui/card";
import { Button } from "app/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "app/components/ui/tabs";
import { Skeleton } from "app/components/ui/skeleton";
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from "app/components/ui/chart";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";
import { toast } from "sonner";
import { tokensApi } from "app/api/tokens";
import type { TokenPosAggregate } from "app/api/types";
import { Hash, PieChart as PieChartIcon, BarChart3 } from "lucide-react";

const POS_COLORS = [
  "#3b82f6", "#ef4444", "#10b981", "#f59e0b", "#8b5cf6",
  "#ec4899", "#06b6d4", "#f97316", "#6b7280", "#84cc16",
  "#14b8a6", "#d946ef", "#64748b", "#f43f5e", "#0ea5e9",
];

// Конфигурация для чартов
const chartConfig = {
  count: {
    label: "Количество токенов",
    theme: {
      light: "#3b82f6",
      dark: "#3b82f6",
    },
  },
};

export default function PosStatsPage() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<TokenPosAggregate[]>([]);
  const [totalTokens, setTotalTokens] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await tokensApi.getPosStats();
      setStats(response.items || []);
      setTotalTokens(response.total || 0);
    } catch (err) {
      setError(err as Error);
      toast.error("Ошибка загрузки", {
        description: "Не удалось загрузить статистику по частям речи",
      });
    } finally {
      setLoading(false);
    }
  };

  const pieData = stats.map(stat => ({
    name: stat.pos,
    value: stat.count,
    fill: POS_COLORS[stats.findIndex(s => s.pos === stat.pos) % POS_COLORS.length]
  }));

  const barData = stats.map(stat => ({
    name: stat.pos,
    count: stat.count,
    fill: POS_COLORS[stats.findIndex(s => s.pos === stat.pos) % POS_COLORS.length]
  }));

  const handlePosClick = (pos: string) => {
    navigate(`/tokens?pos=${pos}`);
  };

  if (loading) {
    return (
      <div className="container mx-auto py-10">
        <h1 className="text-3xl font-bold mb-6 text-foreground">Статистика по частям речи</h1>
        {/* Карточки с общей статистикой */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {[1, 2].map(i => (
            <Card key={i} className="p-6 bg-card border-border">
              <div className="flex items-center gap-4">
                <Skeleton className="h-12 w-12 rounded-full" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-8 w-32" />
                </div>
              </div>
            </Card>
          ))}
        </div>
        {/* Диаграмма */}
        <Card className="p-6 mb-8 bg-card border-border">
          <Skeleton className="h-[400px] w-full" />
        </Card>
        {/* Таблица */}
        <Card className="bg-card border-border">
          <div className="p-4 space-y-4">
            <Skeleton className="h-10 w-full" />
            {[1, 2, 3, 4, 5].map(i => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto py-10">
        <h1 className="text-3xl font-bold mb-6 text-foreground">Статистика по частям речи</h1>
        <Card className="p-8 text-center bg-card border-border">
          <p className="text-destructive mb-4">Ошибка загрузки данных: {error.message}</p>
          <Button onClick={fetchStats}>Попробовать снова</Button>
        </Card>
      </div>
    );
  }

  if (!stats || stats.length === 0) {
    return (
      <div className="container mx-auto py-10">
        <h1 className="text-3xl font-bold mb-6 text-foreground">Статистика по частям речи</h1>
        <Card className="p-12 text-center bg-card border-border">
          <PieChartIcon className="h-12 w-12 mx-auto mb-4 text-muted-foreground/30" />
          <p className="text-lg mb-2 text-muted-foreground">Нет данных</p>
          <p className="text-sm text-muted-foreground/70">
            Статистика по частям речи пока не доступна
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-10">
      <h1 className="text-3xl font-bold mb-6 text-foreground">Статистика по частям речи</h1>

      {/* Карточки с общей статистикой */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <Card className="p-6 bg-card border-border">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-500/10 rounded-full">
              <Hash className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Всего токенов</p>
              <p className="text-2xl font-bold text-foreground">{totalTokens.toLocaleString()}</p>
            </div>
          </div>
        </Card>
        <Card className="p-6 bg-card border-border">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-purple-500/10 rounded-full">
              <PieChartIcon className="h-6 w-6 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Частей речи</p>
              <p className="text-2xl font-bold text-foreground">{stats.length}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Вкладки с диаграммами */}
      <Tabs defaultValue="pie" className="mb-8">
        <TabsList className="bg-muted">
          <TabsTrigger value="pie" className="data-[state=active]:bg-background">
            <PieChartIcon className="h-4 w-4 mr-2" />
            Круговая диаграмма
          </TabsTrigger>
          <TabsTrigger value="bar" className="data-[state=active]:bg-background">
            <BarChart3 className="h-4 w-4 mr-2" />
            Столбчатая диаграмма
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="pie">
          <Card className="p-6 bg-card">
            <ChartContainer config={chartConfig} className="h-[400px] w-full">
              <PieChart>
                <Pie
                  data={pieData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={150}
                  label={({ name, percent }) => `${name} (${(percent * 100).toFixed(1)}%)`}
                  labelLine={false}
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
                <ChartTooltip
                  content={
                    <ChartTooltipContent 
                      className="bg-background border-border"
                      formatter={(value, name) => (
                        <div className="flex flex-col gap-1">
                          <span className="font-medium text-foreground">{name}</span>
                          <span className="text-muted-foreground">
                            Количество: <span className="text-foreground font-medium">{value.toLocaleString()}</span>
                          </span>
                          <span className="text-muted-foreground">
                            Доля: <span className="text-foreground font-medium">
                              {((value / totalTokens) * 100).toFixed(1)}%
                            </span>
                          </span>
                        </div>
                      )}
                    />
                  }
                />
                <ChartLegend
                  content={
                    <ChartLegendContent 
                      className="flex flex-wrap justify-center gap-4 pt-4"
                      formatter={(value, entry) => (
                        <span className="text-foreground text-sm">{value}</span>
                      )}
                    />
                  }
                />
              </PieChart>
            </ChartContainer>
          </Card>
        </TabsContent>

        <TabsContent value="bar">
          <Card className="p-6 bg-card">
            <ChartContainer config={chartConfig} className="h-[400px] w-full">
              <BarChart data={barData} barCategoryGap={2}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis 
                  dataKey="name" 
                  stroke="hsl(var(--muted-foreground))"
                  tick={{ fill: 'hsl(var(--foreground))', fontSize: 12 }}
                  interval={0}
                  angle={-45}
                  textAnchor="end"
                  height={80}
                />
                <YAxis 
                  stroke="hsl(var(--muted-foreground))"
                  tick={{ fill: 'hsl(var(--foreground))', fontSize: 12 }}
                />
                <ChartTooltip
                  content={
                    <ChartTooltipContent 
                      className="bg-background border-border"
                      formatter={(value, name) => (
                        <div className="flex flex-col gap-1">
                          <span className="font-medium text-foreground">{name}</span>
                          <span className="text-muted-foreground">
                            Количество: <span className="text-foreground font-medium">{value.toLocaleString()}</span>
                          </span>
                          <span className="text-muted-foreground">
                            Доля: <span className="text-foreground font-medium">
                              {((value / totalTokens) * 100).toFixed(1)}%
                            </span>
                          </span>
                        </div>
                      )}
                    />
                  }
                />
                <ChartLegend
                  content={
                    <ChartLegendContent 
                      className="flex flex-wrap justify-center gap-4 pt-4"
                      formatter={(value, entry) => (
                        <span className="text-foreground text-sm">{value}</span>
                      )}
                    />
                  }
                />
                <Bar dataKey="count" name="Количество токенов" isAnimationActive={true}>
                  {barData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ChartContainer>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Таблица с данными */}
      <Card className="bg-card border-border">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="text-left p-4 text-foreground font-medium">Часть речи</th>
                <th className="text-left p-4 text-foreground font-medium">Количество</th>
                <th className="text-left p-4 text-foreground font-medium">Процент</th>
              </tr>
            </thead>
            <tbody>
              {stats.map((stat, index) => (
                <tr 
                  key={stat.pos} 
                  className="border-b border-border hover:bg-muted/50 cursor-pointer transition-colors"
                  onClick={() => handlePosClick(stat.pos)}
                >
                  <td className="p-4 font-medium text-foreground">
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: POS_COLORS[index % POS_COLORS.length] }}
                      />
                      {stat.pos}
                    </div>
                  </td>
                  <td className="p-4 text-foreground">{stat.count?.toLocaleString() || '0'}</td>
                  <td className="p-4 text-muted-foreground">
                    {totalTokens > 0 
                      ? `${((stat.count / totalTokens) * 100).toFixed(1)}%` 
                      : '-'
                    }
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}