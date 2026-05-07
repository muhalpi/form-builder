import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { ArrowLeft, FileText, BarChart2, Settings, Eye, MessageSquare, Globe, LogOut, CheckCircle2, Copy, Rocket, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLang } from "@/contexts/LangContext";
import { t } from "@/lib/i18n";
import { useQueryClient } from "@tanstack/react-query";
import { authClient } from "@/lib/auth-client";
import { getGetFormQueryKey, usePublishForm, useUpdateForm } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

interface FormLayoutProps {
  formId: string;
  formTitle?: string;
  formResponseCount?: number;
  formIsPublished?: boolean;
  children: React.ReactNode;
}

export function FormLayout({ formId, formTitle, formResponseCount, formIsPublished, children }: FormLayoutProps) {
  const [location, setLocation] = useLocation();
  const { lang, setLang } = useLang();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const session = authClient.useSession();
  const updateForm = useUpdateForm();
  const publishForm = usePublishForm();
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [localTitle, setLocalTitle] = useState(formTitle ?? "");

  useEffect(() => {
    if (!isEditingTitle) {
      setLocalTitle(formTitle ?? "");
    }
  }, [formTitle, isEditingTitle]);

  const tabs = [
    { id: "build", href: `/forms/${formId}/build`, icon: FileText, label: t(lang, "tabBuild") },
    { id: "responses", href: `/forms/${formId}/responses`, icon: MessageSquare, label: t(lang, "tabResponses") },
    { id: "stats", href: `/forms/${formId}/stats`, icon: BarChart2, label: t(lang, "tabStats") },
    { id: "settings", href: `/forms/${formId}/settings`, icon: Settings, label: t(lang, "tabSettings") },
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

  const handlePublishClick = () => {
    if (formIsPublished) {
      if (typeof window === "undefined") return;
      const formLink = `${window.location.origin}${import.meta.env.BASE_URL}f/${formId}`;
      navigator.clipboard.writeText(formLink);
      toast({ title: t(lang, "linkCopied") });
      return;
    }

    publishForm.mutate(
      { id: formId, data: { published: true } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetFormQueryKey(formId) });
          toast({ title: t(lang, "formPublished") });
        },
      }
    );
  };

  const commitTitle = () => {
    const nextTitle = localTitle.trim();
    const prevTitle = formTitle ?? "";

    setIsEditingTitle(false);
    if (!nextTitle) {
      setLocalTitle(prevTitle);
      return;
    }
    if (nextTitle === prevTitle) return;

    updateForm.mutate(
      { id: formId, data: { title: nextTitle } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetFormQueryKey(formId) });
        },
        onError: () => {
          setLocalTitle(prevTitle);
        },
      }
    );
  };

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Top bar */}
      <header className="flex items-center gap-4 px-5 py-3 border-b border-border bg-card shrink-0">
        <Link href="/dashboard">
          <button className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors" data-testid="link-back">
            <ArrowLeft className="w-4 h-4" />
            {t(lang, "backLabel")}
          </button>
        </Link>
        <div className="w-px h-5 bg-border" />
        {isEditingTitle ? (
          <input
            type="text"
            value={localTitle}
            onChange={(e) => setLocalTitle(e.target.value)}
            onBlur={commitTitle}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                commitTitle();
              } else if (e.key === "Escape") {
                setLocalTitle(formTitle ?? "");
                setIsEditingTitle(false);
              }
            }}
            className="max-w-xs w-full text-sm font-medium text-foreground bg-background border border-input rounded-md px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-ring"
            data-testid="input-form-title-inline"
            autoFocus
          />
        ) : (
          <button
            type="button"
            onClick={() => setIsEditingTitle(true)}
            className="max-w-xs w-full text-sm font-medium text-foreground truncate border border-input rounded-md px-2.5 py-1.5 bg-background text-left cursor-text hover:border-ring/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-colors"
            data-testid="button-edit-form-title"
          >
            {formTitle || t(lang, "untitledForm")}
          </button>
        )}

        <div className="flex-1" />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-muted-foreground border border-border rounded-md hover:bg-muted hover:text-foreground transition-colors"
              data-testid="button-lang-toggle"
            >
              <Globe className="w-3.5 h-3.5" />
              {langLabel}
              <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-44 p-1" align="end">
            <DropdownMenuItem onClick={() => setLang("en")} data-testid="button-lang-en">
              {t(lang, "english")}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setLang("id")} data-testid="button-lang-id">
              {t(lang, "indonesian")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <button
          onClick={handlePublishClick}
          disabled={publishForm.isPending || typeof formIsPublished !== "boolean"}
          className={cn(
            "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors disabled:opacity-60",
            formIsPublished === true
              ? "bg-green-600 text-white hover:bg-green-700"
              : formIsPublished === false
              ? "bg-green-600 text-white hover:bg-green-700"
              : "border border-border text-muted-foreground"
          )}
          title={formIsPublished ? t(lang, "copyLinkAction") : undefined}
          data-testid="button-publish-toggle-header"
        >
          {publishForm.isPending ? "..." : formIsPublished ? (
            <>
              <CheckCircle2 className="w-4 h-4" />
              <span>{t(lang, "publishedStatus")}!</span>
              <span className="hidden xl:inline text-white/90 text-xs">{t(lang, "copyLinkAction")}</span>
              <Copy className="w-3.5 h-3.5 text-white/90" />
            </>
          ) : (
            <>
              <Rocket className="w-4 h-4" />
              <span>{t(lang, "publishBtn")}</span>
            </>
          )}
        </button>

        <Link href={`/forms/${formId}/preview`}>
          <button className="flex items-center gap-1.5 px-3 py-1.5 text-sm border border-border rounded-md hover:bg-muted transition-colors" data-testid="button-preview">
            <Eye className="w-3.5 h-3.5" />
            {t(lang, "previewBtn")}
          </button>
        </Link>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="w-9 h-9 rounded-full bg-primary/15 text-primary text-sm font-semibold border border-border hover:bg-primary/20 transition-colors"
              title={userEmail ? `${userName} (${userEmail})` : userName}
              data-testid="button-profile-menu"
            >
              {initials}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-72 p-2" align="end">
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
      </header>

      {/* Tabs */}
      <div className="flex items-center gap-1 px-5 border-b border-border bg-card shrink-0">
        {tabs.map(({ id, href, icon: Icon, label }) => (
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
              {id === "responses" && typeof formResponseCount === "number" && (
                <span
                  className={cn(
                    "ml-1 min-w-5 h-5 px-1 rounded-full text-[11px] leading-none font-semibold inline-flex items-center justify-center",
                    location === href ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                  )}
                  data-testid="tab-responses-count"
                >
                  {formResponseCount}
                </span>
              )}
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
