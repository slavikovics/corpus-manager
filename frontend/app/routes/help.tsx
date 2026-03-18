import { Card } from "app/components/ui/card";
import { 
  FileText, 
  BookOpen, 
  Type, 
  Search,
  Hash,
  PieChart,
  Upload,
  Trash2,
  Eye,
  Filter,
  Download,
  HelpCircle,
  Moon,
  Sun,
  Info,
  CheckCircle,
  AlertCircle,
  Clock,
  XCircle,
  FileBarChart,
  Network,
  GitBranch,
  Code2,
  MoveRight,
  ArrowLeftRight,
  ScrollText,
  Layers
} from "lucide-react";
import { Badge } from "app/components/ui/badge";

export default function HelpPage() {
  return (
    <div className="container mx-auto py-10 max-w-4xl">
      <div className="flex items-center gap-3 mb-8">
        <HelpCircle className="h-8 w-8 text-blue-500" />
        <h1 className="text-3xl font-bold">Справка по использованию</h1>
      </div>

      <p className="text-lg text-muted-foreground mb-8">
        Corpus Manager - инструмент для управления и анализа текстовых корпусов. 
        Ниже описаны основные функции и возможности интерфейса.
      </p>

      <div className="space-y-6">
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
              <FileText className="h-6 w-6 text-blue-600 dark:text-blue-300" />
            </div>
            <h2 className="text-2xl font-semibold">Документы</h2>
          </div>
          
          <div className="space-y-4 pl-14">
            <div>
              <h3 className="font-medium flex items-center gap-2 mb-2">
                <Upload className="h-4 w-4" /> Загрузка документов
              </h3>
              <p className="text-muted-foreground">
                Нажмите кнопку "Загрузить документ" в правом верхнем углу. 
                Выберите файл (поддерживаются форматы .txt, .pdf, .doc, .rtf, .docx). 
                Можно указать метаданные: название, автор, год.
              </p>
            </div>
            
            <div>
              <h3 className="font-medium flex items-center gap-2 mb-2">
                <Info className="h-4 w-4" /> Статусы обработки
              </h3>
              <div className="flex flex-wrap gap-3 mb-2">
                <Badge variant="outline" className="bg-green-50 text-green-700 dark:bg-green-900 dark:text-green-300">
                  <CheckCircle className="h-3 w-3 mr-1" /> Готов
                </Badge>
                <span className="text-sm text-muted-foreground">- документ обработан</span>
              </div>
              <div className="flex flex-wrap gap-3 mb-2">
                <Badge variant="outline" className="bg-blue-50 text-blue-700 dark:bg-blue-900 dark:text-blue-300">
                  <Clock className="h-3 w-3 mr-1 animate-spin" /> Обрабатывается
                </Badge>
                <span className="text-sm text-muted-foreground">- в процессе обработки</span>
              </div>
              <div className="flex flex-wrap gap-3 mb-2">
                <Badge variant="outline" className="bg-yellow-50 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300">
                  <Clock className="h-3 w-3 mr-1" /> В очереди
                </Badge>
                <span className="text-sm text-muted-foreground">- ожидает обработки</span>
              </div>
              <div className="flex flex-wrap gap-3">
                <Badge variant="outline" className="bg-red-50 text-red-700 dark:bg-red-900 dark:text-red-300">
                  <XCircle className="h-3 w-3 mr-1" /> Ошибка
                </Badge>
                <span className="text-sm text-muted-foreground">- не удалось обработать</span>
              </div>
            </div>
            
            <div>
              <h3 className="font-medium flex items-center gap-2 mb-2">
                <Trash2 className="h-4 w-4" /> Удаление документов
              </h3>
              <p className="text-muted-foreground">
                Нажмите на иконку корзины в строке документа. 
                Удаление невозможно для документов в статусе "Обрабатывается".
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
              <BookOpen className="h-6 w-6 text-green-600 dark:text-green-300" />
            </div>
            <h2 className="text-2xl font-semibold">Леммы и Словоформы</h2>
          </div>
          
          <div className="space-y-4 pl-14">
            <div>
              <h3 className="font-medium flex items-center gap-2 mb-2">
                <Filter className="h-4 w-4" /> Фильтрация
              </h3>
              <p className="text-muted-foreground">
                Используйте панель фильтров для поиска:
              </p>
              <ul className="list-disc list-inside text-muted-foreground mt-2 space-y-1">
                <li>Поиск по лемме или словоформе</li>
                <li>Фильтр по части речи (выпадающий список)</li>
                <li>Фильтр по минимальной частоте</li>
              </ul>
            </div>
            
            <div>
              <h3 className="font-medium flex items-center gap-2 mb-2">
                <Eye className="h-4 w-4" /> Детальный просмотр
              </h3>
              <p className="text-muted-foreground">
                Кликните по любой строке в таблице, чтобы перейти к поиску 
                конкорданса для выбранной леммы или словоформы.
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
              <Search className="h-6 w-6 text-purple-600 dark:text-purple-300" />
            </div>
            <h2 className="text-2xl font-semibold">Поиск и конкорданс</h2>
          </div>
          
          <div className="space-y-4 pl-14">
            <div>
              <h3 className="font-medium mb-2">Режимы поиска</h3>
              <p className="text-muted-foreground">
                Режим определяется автоматически по количеству слов в запросе:
              </p>
              <ul className="list-disc list-inside text-muted-foreground mt-2 space-y-1">
                <li><strong>Одно слово</strong> - конкорданс (показывает контекст употребления)</li>
                <li><strong>Несколько слов</strong> - поиск фразы</li>
              </ul>
            </div>
            
            <div>
              <h3 className="font-medium mb-2">Параметры поиска</h3>
              <ul className="list-disc list-inside text-muted-foreground space-y-1">
                <li><strong>Тип поиска:</strong> точный или нечеткий (fuzzy)</li>
                <li><strong>Поле:</strong> поиск по лемме или словоформе</li>
                <li><strong>Slop:</strong> расстояние между словами для фраз (0 - строгая последовательность)</li>
              </ul>
            </div>
            
            <div>
              <h3 className="font-medium mb-2">Результаты</h3>
              <p className="text-muted-foreground">
                Для каждого результата отображается контекст с подсветкой искомого слова, 
                а также информация о документе, лемме и части речи.
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-orange-100 dark:bg-orange-900 rounded-lg">
              <Hash className="h-6 w-6 text-orange-600 dark:text-orange-300" />
            </div>
            <h2 className="text-2xl font-semibold">Токены</h2>
          </div>
          
          <div className="space-y-4 pl-14">
            <div>
              <h3 className="font-medium mb-2">Фильтрация токенов</h3>
              <p className="text-muted-foreground">
                Доступны расширенные фильтры:
              </p>
              <ul className="list-disc list-inside text-muted-foreground mt-2 space-y-1">
                <li>По ID документа</li>
                <li>По части речи</li>
                <li>По словоформе</li>
                <li>По типам (пунктуация, стоп-слова)</li>
              </ul>
            </div>
            
            <div>
              <h3 className="font-medium flex items-center gap-2 mb-2">
                <Eye className="h-4 w-4" /> Детальная информация
              </h3>
              <p className="text-muted-foreground">
                Нажмите на иконку глаза в строке токена для просмотра:
              </p>
              <ul className="list-disc list-inside text-muted-foreground mt-2 space-y-1">
                <li>Информация о документе</li>
                <li>Морфологические признаки</li>
                <li>Синтаксические отношения</li>
                <li>Контекст употребления</li>
                <li>Метаданные</li>
              </ul>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-cyan-100 dark:bg-cyan-900 rounded-lg">
              <Network className="h-6 w-6 text-cyan-600 dark:text-cyan-300" />
            </div>
            <h2 className="text-2xl font-semibold">Синтаксический анализ</h2>
          </div>
          
          <div className="space-y-4 pl-14">
            <div>
              <h3 className="font-medium flex items-center gap-2 mb-2">
                <GitBranch className="h-4 w-4" /> Дерево зависимостей
              </h3>
              <p className="text-muted-foreground">
                На странице отображается граф синтаксических связей между словами в предложении:
              </p>
              <ul className="list-disc list-inside text-muted-foreground mt-2 space-y-1">
                <li><strong>Узлы</strong> - слова с указанием части речи</li>
                <li><strong>Рёбра</strong> - синтаксические связи с подписями (подлежащее, сказуемое и т.д.)</li>
              </ul>
            </div>

            <div>
              <h3 className="font-medium flex items-center gap-2 mb-2">
                <Layers className="h-4 w-4" /> Таблица токенов
              </h3>
              <p className="text-muted-foreground">
                Под графом расположена таблица с детальной информацией:
              </p>
              <ul className="list-disc list-inside text-muted-foreground mt-2 space-y-1">
                <li><strong>Поз.</strong> - позиция слова в предложении</li>
                <li><strong>Слово</strong> - исходная словоформа</li>
                <li><strong>Лемма</strong> - начальная форма слова</li>
                <li><strong>POS</strong> - часть речи</li>
                <li><strong>Роль</strong> - синтаксическая роль (зависимость)</li>
                <li><strong>Главное</strong> - позиция главного слова</li>
              </ul>
            </div>

            <div>
              <h3 className="font-medium flex items-center gap-2 mb-2">
                <Info className="h-4 w-4" /> Интерактивность
              </h3>
              <ul className="list-disc list-inside text-muted-foreground mt-2 space-y-1">
                <li><strong>Перетаскивание</strong> - узлы графа можно перемещать для лучшего обзора</li>
                <li><strong>Масштабирование</strong> - колесо мыши для приближения/отдаления</li>
                <li><strong>Подсказки</strong> - при наведении на слово показывается дополнительная информация (лемма, морфология)</li>
                <li><strong>Цветовое кодирование</strong> - части речи и связи имеют свои цвета для быстрой идентификации</li>
              </ul>
            </div>

            <div>
              <h3 className="font-medium flex items-center gap-2 mb-2">
                <ScrollText className="h-4 w-4" /> Схема связей
              </h3>
              <p className="text-muted-foreground">
                Под графом отображается упрощенная схема всех синтаксических связей в предложении в виде списка, 
                где показаны пары слов и тип связи между ними.
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-pink-100 dark:bg-pink-900 rounded-lg">
              <PieChart className="h-6 w-6 text-pink-600 dark:text-pink-300" />
            </div>
            <h2 className="text-2xl font-semibold">Статистика по частям речи</h2>
          </div>
          
          <div className="space-y-4 pl-14">
            <div>
              <h3 className="font-medium mb-2">Визуализация</h3>
              <p className="text-muted-foreground">
                Страница показывает распределение частей речи в корпусе:
              </p>
              <ul className="list-disc list-inside text-muted-foreground mt-2 space-y-1">
                <li>Общее количество токенов и частей речи</li>
                <li>Круговая диаграмма распределения</li>
                <li>Столбчатая диаграмма для сравнения</li>
                <li>Таблица с процентами для каждой части речи</li>
              </ul>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-indigo-100 dark:bg-indigo-900 rounded-lg">
              <FileBarChart className="h-6 w-6 text-indigo-600 dark:text-indigo-300" />
            </div>
            <h2 className="text-2xl font-semibold">Отчёты</h2>
          </div>
          
          <div className="space-y-4 pl-14">
            <div>
              <h3 className="font-medium flex items-center gap-2 mb-2">
                <FileBarChart className="h-4 w-4" /> Отчёт по корпусу
              </h3>
              <p className="text-muted-foreground">
                Генерация PDF-отчёта со статистикой по всему корпусу.
              </p>
              <p className="text-muted-foreground mt-2">
                Отчёт включает: общую статистику, топ-100 лемм и словоформ, документы с самым большим количеством токенов.
              </p>
            </div>
            
            <div>
              <h3 className="font-medium flex items-center gap-2 mb-2">
                <FileText className="h-4 w-4" /> Отчёт по документу
              </h3>
              <p className="text-muted-foreground">
                Детальный анализ конкретного документа.
              </p>
              <p className="text-muted-foreground mt-2">
                Отчёт включает: метаданные документа, самые частотные слова и леммы.
              </p>
            </div>
            
            <div>
              <h3 className="font-medium flex items-center gap-2 mb-2">
                <Download className="h-4 w-4" /> Скачивание
              </h3>
              <p className="text-muted-foreground">
                После генерации PDF-файл автоматически скачивается на ваше устройство. 
                Имя файла содержит тип отчёта и временную метку.
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded-lg">
              <HelpCircle className="h-6 w-6 text-gray-600 dark:text-gray-300" />
            </div>
            <h2 className="text-2xl font-semibold">Интерфейс</h2>
          </div>
          
          <div className="space-y-4 pl-14">
            <div>
              <h3 className="font-medium flex items-center gap-2 mb-2">
                <Moon className="h-4 w-4" /> / <Sun className="h-4 w-4" /> Тема оформления
              </h3>
              <p className="text-muted-foreground">
                Кнопка переключения темы находится в левом верхнем углу, рядом с заголовком. 
                По умолчанию включена тёмная тема.
              </p>
            </div>
            
            <div>
              <h3 className="font-medium mb-2">Пагинация</h3>
              <p className="text-muted-foreground">
                Во всех таблицах доступна пагинация с возможностью:
              </p>
              <ul className="list-disc list-inside text-muted-foreground mt-2 space-y-1">
                <li>Выбора количества строк на странице (10, 25, 50, 100)</li>
                <li>Перехода между страницами</li>
                <li>Отображения общего количества записей</li>
              </ul>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}