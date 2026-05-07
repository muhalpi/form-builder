import { Link, useLocation } from "wouter";
import { LayoutDashboard, FileText, Globe, LogOut, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { useQueryClient } from "@tanstack/react-query";
import { useLang } from "@/contexts/LangContext";
import { t } from "@/lib/i18n";
import { authClient } from "@/lib/auth-client";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const [location, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const session = authClient.useSession();
  const { lang, setLang } = useLang();

  const nav = [
    { href: "/dashboard", icon: LayoutDashboard, label: t(lang, "dashboardNav") },
  ];

  const handleSignOut = async () => {
    await authClient.signOut();
    queryClient.clear();
    setLocation("/login");
  };

  const userName = session.data?.user?.name?.trim() || session.data?.user?.email || "User";
  const userEmail = session.data?.user?.email || "";
  const initials = userName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("") || "U";
  const langLabel = lang === "en" ? t(lang, "english") : t(lang, "indonesian");

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <aside className="w-56 flex-shrink-0 border-r border-border bg-sidebar flex flex-col">
        {/* Logo */}
        <div className="px-5 py-5 border-b border-sidebar-border">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center">
              <FileText className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-semibold text-sidebar-foreground tracking-tight">Formu</span>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {nav.map(({ href, icon: Icon, label }) => (
            <Link key={href} href={href}>
              <div
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium cursor-pointer transition-colors",
                  location === href
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-sidebar-foreground hover:bg-sidebar-accent/50"
                )}
                data-testid={`nav-${label.toLowerCase()}`}
              >
                <Icon className="w-4 h-4" />
                {label}
              </div>
            </Link>
          ))}
        </nav>

        {/* Bottom actions */}
        <div className="px-3 py-4 border-t border-sidebar-border space-y-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium text-sidebar-foreground hover:bg-sidebar-accent/50 transition-colors"
                data-testid="button-lang-toggle"
              >
                <Globe className="w-4 h-4" />
                <span className="flex-1 text-left">{langLabel}</span>
                <ChevronDown className="w-4 h-4 text-muted-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-44 p-1" align="end" side="right">
              <DropdownMenuItem onClick={() => setLang("en")} data-testid="button-lang-en">
                {t(lang, "english")}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setLang("id")} data-testid="button-lang-id">
                {t(lang, "indonesian")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium text-sidebar-foreground hover:bg-sidebar-accent/50 transition-colors"
                title={userEmail ? `${userName} (${userEmail})` : userName}
                data-testid="button-profile-menu"
              >
                <span className="w-6 h-6 rounded-full bg-primary/15 text-primary text-xs font-semibold inline-flex items-center justify-center">
                  {initials}
                </span>
                <span className="truncate">{userName}</span>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-72 p-2" align="end" side="right">
              <div className="px-2 py-2 flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-primary/15 text-primary text-sm font-semibold inline-flex items-center justify-center">
                  {initials}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">{userName}</p>
                  <p className="text-xs text-muted-foreground truncate">{userEmail}</p>
                </div>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setLocation("/dashboard")}>
                Dashboard
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={handleSignOut}
                className="text-destructive focus:text-destructive"
                data-testid="button-sign-out"
              >
                <LogOut className="w-4 h-4" />
                {t(lang, "signOut")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
}
