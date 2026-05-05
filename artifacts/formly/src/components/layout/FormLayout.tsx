import { Link, useLocation } from "wouter";
import { ArrowLeft, FileText, BarChart2, Settings, Eye, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";

interface FormLayoutProps {
  formId: string;
  formTitle?: string;
  children: React.ReactNode;
}

export function FormLayout({ formId, formTitle, children }: FormLayoutProps) {
  const [location] = useLocation();

  const tabs = [
    { href: `/forms/${formId}/build`, icon: FileText, label: "Build" },
    { href: `/forms/${formId}/responses`, icon: MessageSquare, label: "Responses" },
    { href: `/forms/${formId}/stats`, icon: BarChart2, label: "Stats" },
    { href: `/forms/${formId}/settings`, icon: Settings, label: "Settings" },
  ];

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Top bar */}
      <header className="flex items-center gap-4 px-5 py-3 border-b border-border bg-card shrink-0">
        <Link href="/">
          <button className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors" data-testid="link-back">
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
        </Link>
        <div className="w-px h-5 bg-border" />
        <span className="text-sm font-medium text-foreground truncate max-w-xs">
          {formTitle || "Form"}
        </span>
        <div className="flex-1" />
        <Link href={`/forms/${formId}/preview`}>
          <button className="flex items-center gap-1.5 px-3 py-1.5 text-sm border border-border rounded-md hover:bg-muted transition-colors" data-testid="button-preview">
            <Eye className="w-3.5 h-3.5" />
            Preview
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
