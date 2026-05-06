import { Link, useLocation } from "wouter";
import { ArrowLeft, FileText, BarChart2, Settings, Eye, MessageSquare, Globe, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLang } from "@/contexts/LangContext";
import { t } from "@/lib/i18n";
import { useQueryClient } from "@tanstack/react-query";
import { authClient } from "@/lib/auth-client";

interface FormLayoutProps {
  formId: string;
  formTitle?: string;
  children: React.ReactNode;
}

export function FormLayout({ formId, formTitle, children }: FormLayoutProps) {
  const [location, setLocation] = useLocation();
  const { lang, toggleLang } = useLang();
  const queryClient = useQueryClient();

  const tabs = [
    { href: `/forms/${formId}/build`, icon: FileText, label: t(lang, "tabBuild") },
    { href: `/forms/${formId}/responses`, icon: MessageSquare, label: t(lang, "tabResponses") },
    { href: `/forms/${formId}/stats`, icon: BarChart2, label: t(lang, "tabStats") },
    { href: `/forms/${formId}/settings`, icon: Settings, label: t(lang, "tabSettings") },
  ];

  const handleSignOut = async () => {
    await authClient.signOut();
    queryClient.clear();
    setLocation("/login");
  };

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Top bar */}
      <header className="flex items-center gap-4 px-5 py-3 border-b border-border bg-card shrink-0">
        <Link href="/">
          <button className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors" data-testid="link-back">
            <ArrowLeft className="w-4 h-4" />
            {t(lang, "backLabel")}
          </button>
        </Link>
        <div className="w-px h-5 bg-border" />
        <span className="text-sm font-medium text-foreground truncate max-w-xs">
          {formTitle || "Form"}
        </span>

        <div className="flex-1" />

        {/* Language toggle */}
        <button
          onClick={toggleLang}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-muted-foreground border border-border rounded-md hover:bg-muted hover:text-foreground transition-colors"
          data-testid="button-lang-toggle"
        >
          <Globe className="w-3.5 h-3.5" />
          {t(lang, "langSwitch")}
        </button>

        <button
          onClick={handleSignOut}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-muted-foreground border border-border rounded-md hover:bg-muted hover:text-foreground transition-colors"
          data-testid="button-sign-out"
        >
          <LogOut className="w-3.5 h-3.5" />
          {t(lang, "signOut")}
        </button>

        <Link href={`/forms/${formId}/preview`}>
          <button className="flex items-center gap-1.5 px-3 py-1.5 text-sm border border-border rounded-md hover:bg-muted transition-colors" data-testid="button-preview">
            <Eye className="w-3.5 h-3.5" />
            {t(lang, "previewBtn")}
          </button>
        </Link>
      </header>

      {/* Tabs */}
      <div className="flex items-center gap-1 px-5 border-b border-border bg-card shrink-0">
        {tabs.map(({ href, icon: Icon, label }) => (
          <Link key={href} href={href}>
            <div
              className={cn(
                "flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors cursor-pointer",
                location === href
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
              data-testid={`tab-${label.toLowerCase()}`}
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
            </div>
          </Link>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {children}
      </div>
    </div>
  );
}
