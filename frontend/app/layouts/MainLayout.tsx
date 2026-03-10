import { Link, useLocation } from "react-router";
import { cn } from "app/lib/utils";
import { 
  FileText, 
  BookOpen, 
  Type, 
  Search,
  Hash,
  PieChart,
} from "lucide-react";
import { ThemeToggle } from "app/components/theme/theme-toggle";

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
    <div className="min-h-screen flex bg-background">
      {}
      <div className="w-64 bg-card border-r border-border flex flex-col">
        <div className="p-6 flex items-center justify-between">
          <h1 className="text-xl font-bold text-foreground">Corpus Manager</h1>
          <ThemeToggle />
        </div>
        <nav className="flex-1 space-y-1 px-3">
          {navigation.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.href || 
                           location.pathname.startsWith(item.href + '/');
            
            return (
              <Link
                key={item.name}
                to={item.href}
                className={cn(
                  "flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors",
                  "hover:bg-accent hover:text-accent-foreground",
                  isActive
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground"
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
      <div className="flex-1 bg-background overflow-auto">
        {children}
      </div>
    </div>
  );
}