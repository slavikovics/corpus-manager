import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { Card } from "app/components/ui/card";
import { Progress } from "app/components/ui/progress";
import { Badge } from "app/components/ui/badge";
import { Button } from "app/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "app/components/ui/tabs";
import { Skeleton } from "app/components/ui/skeleton";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { toast } from "sonner";
import { tokensApi } from "app/api/tokens";
import type { TokenPosAggregate } from "app/api/types";
import { BookOpen, Hash, PieChart as PieChartIcon, BarChart3 } from "lucide-react";
const POS_COLORS = [
  "#3b82f6", "#ef4444", "#10b981", "#f59e0b", "#8b5cf6",
  "#ec4899", "#06b6d4", "#f97316", "#6b7280", "#84cc16",
  "#14b8a6", "#d946ef", "#64748b", "#f43f5e", "#0ea5e9",
];
export default function PosStatsPage() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<TokenPosAggregate[]>([]);
  const [totalTokens, setTotalTokens] = useState(0);
  const [totalUniqueWords, setTotalUniqueWords] = useState(0);
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
      setTotalTokens(response.total_tokens || 0);
      setTotalUniqueWords(response.total_unique_words || 0);
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
    percentage: stat.percentage,
  }));
  const barData = stats.map(stat => ({
    name: stat.pos,
    count: stat.count,
    uniqueWords: stat.unique_words,
  }));
  const handlePosClick = (pos: string) => {
    navigate(`/tokens?pos=${pos}`);
  };
  if (loading) {
    return (
      <div className="container mx-auto py-10">
        <h1 className="text-3xl font-bold mb-6">Статистика по частям речи</h1>
        {}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {[1, 2, 3].map(i => (
            <Card key={i} className="p-6">
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
        {}
        <Card className="p-6 mb-8">
          <Skeleton className="h-[400px] w-full" />
        </Card>
        {}
        <Card>
          <div className="p-4 space-y-4">
            <Skeleton className="h-10 w-full" />
            {[1, 2, 3, 4, 5].map(i => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        </Card>
      </div>
    );
  }
  if (error) {
    return (
      <div className="container mx-auto py-10">
        <h1 className="text-3xl font-bold mb-6">Статистика по частям речи</h1>
        <Card className="p-8 text-center">
          <p className="text-red-500 mb-4">Ошибка загрузки данных: {error.message}</p>
          <Button onClick={fetchStats}>Попробовать снова</Button>
        </Card>
      </div>
    );
  }
  if (!stats || stats.length === 0) {
    return (
      <div className="container mx-auto py-10">
        <h1 className="text-3xl font-bold mb-6">Статистика по частям речи</h1>
        <Card className="p-12 text-center text-gray-500">
          <PieChartIcon className="h-12 w-12 mx-auto mb-4 text-gray-300" />
          <p className="text-lg mb-2">Нет данных</p>
          <p className="text-sm">
            Статистика по частям речи пока не доступна
          </p>
        </Card>
      </div>
    );
  }
  return (
    <div className="container mx-auto py-10">
      <h1 className="text-3xl font-bold mb-6">Статистика по частям речи</h1>
      {}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card className="p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-100 rounded-full">
              <Hash className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Всего токенов</p>
              <p className="text-2xl font-bold">{totalTokens.toLocaleString()}</p>
            </div>
          </div>
        </Card>
        <Card className="p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-green-100 rounded-full">
              <BookOpen className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Уникальных слов</p>
              <p className="text-2xl font-bold">{totalUniqueWords.toLocaleString()}</p>
            </div>
          </div>
        </Card>
        <Card className="p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-purple-100 rounded-full">
              <PieChartIcon className="h-6 w-6 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Частей речи</p>
              <p className="text-2xl font-bold">{stats.length}</p>
            </div>
          </div>
        </Card>
      </div>
      {}
      <Tabs defaultValue="pie" className="mb-8">
        <TabsList>
          <TabsTrigger value="pie">
            <PieChartIcon className="h-4 w-4 mr-2" />
            Круговая диаграмма
          </TabsTrigger>
          <TabsTrigger value="bar">
            <BarChart3 className="h-4 w-4 mr-2" />
            Столбчатая диаграмма
          </TabsTrigger>
        </TabsList>
        <TabsContent value="pie">
          <Card className="p-6">
            <div className="h-[400px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} (${(percent * 100).toFixed(1)}%)`}
                    outerRadius={150}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={POS_COLORS[index % POS_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </TabsContent>
        <TabsContent value="bar">
          <Card className="p-6">
            <div className="h-[400px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="count" fill="#3b82f6" name="Количество токенов" />
                  <Bar dataKey="uniqueWords" fill="#10b981" name="Уникальных слов" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
      {}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-gray-50">
                <th className="text-left p-4">Часть речи</th>
                <th className="text-left p-4">Количество</th>
                <th className="text-left p-4">Процент</th>
                <th className="text-left p-4">Уникальных слов</th>
                <th className="text-left p-4">Примеры</th>
                <th className="text-left p-4"></th>
              </tr>
            </thead>
            <tbody>
              {stats.map((stat, index) => (
                <tr key={stat.pos} className="border-b hover:bg-gray-50">
                  <td className="p-4 font-medium">{stat.pos}</td>
                  <td className="p-4">{stat.count?.toLocaleString() || '0'}</td>
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <Progress value={stat.percentage || 0} className="w-20" />
                      <span>{(stat.percentage || 0).toFixed(1)}%</span>
                    </div>
                  </td>
                  <td className="p-4">{stat.unique_words?.toLocaleString() || '0'}</td>
                  <td className="p-4">
                    <div className="flex gap-1 flex-wrap">
                      {(stat.examples || []).map((example, i) => (
                        <Badge key={i} variant="outline">{example}</Badge>
                      ))}
                    </div>
                  </td>
                  <td className="p-4">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handlePosClick(stat.pos)}
                    >
                      Просмотр токенов
                    </Button>
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