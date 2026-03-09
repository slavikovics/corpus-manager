import { Link, useLocation } from "react-router";
import { cn } from "app/lib/utils";
import { 
  FileText, 
  BookOpen, 
  Type, 
  Search,
  Hash,
  PieChart
} from "lucide-react";
interface MainLayoutProps {
  children: React.ReactNode;
}
const navigation = [
  { name: "Документы", href: "/documents", icon: FileText },
  { name: "Леммы", href: "/lemmas", icon: BookOpen },
  { name: "Словоформы", href: "/wordforms", icon: Type },
  { name: "Поиск", href: "/search", icon: Search },
  { name: "Токены", href: "/tokens", icon: Hash },
  { name: "Части речи", href: "/pos-stats", icon: PieChart },
];
export function MainLayout({ children }: MainLayoutProps) {
  const location = useLocation();
  return (
    <div className="min-h-screen flex">
      {}
      <div className="w-64 bg-gray-50 border-r">
        <div className="p-6">
          <h1 className="text-xl font-bold text-gray-900">Corpus Manager</h1>
        </div>
        <nav className="space-y-1 px-3">
          {navigation.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.href || 
                           location.pathname.startsWith(item.href + '/');
            return (
              <Link
                key={item.name}
                to={item.href}
                className={cn(
                  "flex items-center px-3 py-2 text-sm font-medium rounded-md",
                  "hover:bg-gray-100 transition-colors",
                  isActive
                    ? "bg-gray-200 text-gray-900"
                    : "text-gray-600 hover:text-gray-900"
                )}
              >
                <Icon className="mr-3 h-5 w-5" />
                {item.name}
              </Link>
            );
          })}
        </nav>
      </div>
      {}
      <div className="flex-1 bg-white overflow-auto">
        {children}
      </div>
    </div>
  );
}