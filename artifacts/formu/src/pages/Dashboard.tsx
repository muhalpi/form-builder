import { useLocation } from "wouter";
import { Plus, FileText, Trash2, Globe, Lock, Ellipsis } from "lucide-react";
import { useListForms, useCreateForm, useDeleteForm, useDuplicateForm, useGetDashboardSummary, getListFormsQueryKey, getFormStats, getGetFormStatsQueryKey, usePublishForm, getGetDashboardSummaryQueryKey, listResponses, getListResponsesQueryKey } from "@workspace/api-client-react";
import { useQueries, useQueryClient } from "@tanstack/react-query";
import { AppLayout } from "@/components/layout/AppLayout";
import { format, formatDistanceToNow } from "date-fns";
import { enUS, id as idLocale } from "date-fns/locale";
import { useLang } from "@/contexts/LangContext";
import { t } from "@/lib/i18n";
import { useToast } from "@/hooks/use-toast";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

function StatCard({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="bg-card border border-card-border rounded-xl p-5">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="text-3xl font-bold text-foreground mt-1">{value}</p>
    </div>
  );
}

export default function Dashboard() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { lang } = useLang();
  const { toast } = useToast();
  const dateLocale = lang === "id" ? idLocale : enUS;

  const { data: forms, isLoading: formsLoading } = useListForms();
  const { data: summary } = useGetDashboardSummary();
  const createForm = useCreateForm();
  const deleteForm = useDeleteForm();
  const publishForm = usePublishForm();
  const formStatsQueries = useQueries({
    queries: (forms || []).map((form) => ({
      queryKey: getGetFormStatsQueryKey(form.id),
      queryFn: () => getFormStats(form.id),
      enabled: Boolean(forms),
      staleTime: 30_000,
    })),
  });
  const latestResponseQueries = useQueries({
    queries: (forms || []).map((form) => ({
      queryKey: getListResponsesQueryKey(form.id, { page: 1, limit: 1 }),
      queryFn: () => listResponses(form.id, { page: 1, limit: 1 }),
      enabled: Boolean(forms),
      staleTime: 30_000,
    })),
  });

  const duplicateForm = useDuplicateForm({
    mutation: {
      onSuccess: (newForm) => {
        queryClient.invalidateQueries({ queryKey: getListFormsQueryKey() });
        toast({ title: t(lang, "formDuplicated") });
        setLocation(`/forms/${newForm.id}/build`);
      },
      onError: () => {
        toast({ title: t(lang, "duplicateError"), variant: "destructive" });
      },
    },
  });

  const handleNewForm = () => {
    createForm.mutate(
      { data: { title: t(lang, "untitledForm"), themeColor: "#6366f1" } },
      {
        onSuccess: (form) => {
          queryClient.invalidateQueries({ queryKey: getListFormsQueryKey() });
          setLocation(`/forms/${form.id}/build`);
        },
      }
    );
  };

  const handleDelete = (id: string) => {
    if (!confirm(t(lang, "deleteFormConfirm"))) return;
    deleteForm.mutate(
      { id },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListFormsQueryKey() });
        },
      }
    );
  };

  const handleDuplicate = (id: string) => {
    duplicateForm.mutate({ id });
  };

  const handlePublishState = (id: string, published: boolean) => {
    publishForm.mutate(
      { id, data: { published } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListFormsQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() });
          toast({ title: published ? t(lang, "formPublished") : t(lang, "formUnpublished") });
        },
      }
    );
  };

  const completionRateById = new Map(
    (forms || []).map((form, idx) => [form.id, formStatsQueries[idx]?.data?.completionRate])
  );
  const latestResponseAtById = new Map(
    (forms || []).map((form, idx) => [form.id, latestResponseQueries[idx]?.data?.data?.[0]?.submittedAt])
  );

  const withFormLink = (formId: string) => `${window.location.origin}${import.meta.env.BASE_URL}f/${formId}`;

  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto px-8 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-foreground">{t(lang, "dashboardTitle")}</h1>
            <p className="text-sm text-muted-foreground mt-0.5">{t(lang, "dashboardSubtitle")}</p>
          </div>
          <button
            onClick={handleNewForm}
            disabled={createForm.isPending}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-60"
            data-testid="button-create-form"
          >
            <Plus className="w-4 h-4" />
            {createForm.isPending ? t(lang, "creating") : t(lang, "newForm")}
          </button>
        </div>

        {summary && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <StatCard label={t(lang, "totalForms")} value={summary.totalForms} />
            <StatCard label={t(lang, "publishedForms")} value={summary.publishedForms} />
            <StatCard label={t(lang, "totalResponses")} value={summary.totalResponses} />
            <StatCard label={t(lang, "thisWeek")} value={summary.responsesThisWeek} />
          </div>
        )}

        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">
          {t(lang, "yourForms")}
        </h2>

        {formsLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 bg-muted rounded-xl animate-pulse" />
            ))}
          </div>
        ) : !forms || forms.length === 0 ? (
          <div className="text-center py-16 border border-dashed border-border rounded-xl">
            <FileText className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground text-sm">{t(lang, "noFormsYet")}</p>
            <button
              onClick={handleNewForm}
              className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
              data-testid="button-create-first-form"
            >
              {t(lang, "createForm")}
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="grid grid-cols-[minmax(0,1fr)_96px_118px_126px_44px] items-center gap-4 px-5 pb-1 text-[11px] leading-none text-muted-foreground">
              <span />
              <span className="text-right whitespace-nowrap">{t(lang, "responsesTitle")}</span>
              <span className="text-right whitespace-nowrap">{t(lang, "completionRate")}</span>
              <span className="text-right whitespace-nowrap">{t(lang, "updatedLabel")}</span>
              <span />
            </div>

            {forms.map((form) => {
                const completionRate = completionRateById.get(form.id);
                const completionLabel =
                  typeof completionRate === "number"
                    ? `${Math.round(completionRate * 100)}%`
                    : form.responseCount > 0
                    ? "..."
                    : "-";
                const latestResponseAt = latestResponseAtById.get(form.id);
                const latestResponseLabel = latestResponseAt
                  ? formatDistanceToNow(new Date(latestResponseAt), { addSuffix: true, locale: dateLocale })
                  : t(lang, "noResponsesYetShort");

                return (
              <div
                key={form.id}
                className="group grid grid-cols-[minmax(0,1fr)_96px_118px_126px_44px] items-center gap-4 px-5 py-4 bg-card border border-card-border rounded-xl hover:border-primary/30 transition-all cursor-pointer"
                onClick={() => setLocation(`/forms/${form.id}/build`)}
                data-testid={`card-form-${form.id}`}
              >
                <div className="flex items-center gap-4 min-w-0">
                  <div
                    className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                    style={{ backgroundColor: form.themeColor + "22" }}
                  >
                    <FileText className="w-4 h-4" style={{ color: form.themeColor }} />
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-[13px] font-medium text-foreground truncate">{form.title}</p>
                      {form.isPublished ? (
                        <span className="shrink-0 flex items-center gap-1 text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded-full font-medium">
                          <Globe className="w-3 h-3" />
                          {t(lang, "publishedStatus")}
                        </span>
                      ) : (
                        <span className="shrink-0 flex items-center gap-1 text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full font-medium">
                          <Lock className="w-3 h-3" />
                          {t(lang, "unpublishedStatus")}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-0.5">{form.questionCount} {t(lang, "questionsLabel").toLowerCase()}</p>
                    <p className="text-[11px] text-muted-foreground leading-tight mt-0.5 truncate">
                      {t(lang, "lastResponseLabel")}: {latestResponseLabel}
                    </p>
                  </div>
                </div>

                <div className="text-right text-sm text-foreground">{form.responseCount}</div>
                <div className="text-right text-sm text-foreground">{completionLabel}</div>
                <div className="text-right text-sm text-foreground">{format(new Date(form.updatedAt), "dd MMM yyyy", { locale: dateLocale })}</div>

                <div className="flex items-center justify-end">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        onClick={(e) => e.stopPropagation()}
                        className="w-8 h-8 rounded-md inline-flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                        data-testid={`button-form-menu-${form.id}`}
                      >
                        <Ellipsis className="w-4 h-4" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-52" onClick={(e) => e.stopPropagation()}>
                      <DropdownMenuItem
                        onClick={() => {
                          navigator.clipboard.writeText(withFormLink(form.id));
                          toast({ title: t(lang, "linkCopied") });
                        }}
                        data-testid={`menu-copy-link-${form.id}`}
                      >
                        {t(lang, "copyLinkAction")}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handlePublishState(form.id, !form.isPublished)}
                        disabled={publishForm.isPending && publishForm.variables?.id === form.id}
                        data-testid={form.isPublished ? `menu-back-to-draft-${form.id}` : `menu-publish-${form.id}`}
                      >
                        {form.isPublished ? t(lang, "backToDraftAction") : t(lang, "publishBtn")}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => setLocation(`/forms/${form.id}/responses`)}
                        data-testid={`menu-responses-${form.id}`}
                      >
                        {t(lang, "responseMenuAction")}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => setLocation(`/forms/${form.id}/stats`)}
                        data-testid={`menu-statistic-${form.id}`}
                      >
                        {t(lang, "statisticMenuAction")}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => setLocation(`/forms/${form.id}/settings`)}
                        data-testid={`menu-rename-${form.id}`}
                      >
                        {t(lang, "renameAction")}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => handleDuplicate(form.id)}
                        disabled={duplicateForm.isPending && duplicateForm.variables?.id === form.id}
                        data-testid={`menu-duplicate-${form.id}`}
                      >
                        {t(lang, "duplicateAction")}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => handleDelete(form.id)}
                        className="text-destructive focus:text-destructive"
                        data-testid={`menu-delete-${form.id}`}
                      >
                        <Trash2 className="w-4 h-4" />
                        {t(lang, "deleteAction")}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
                );
            })}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
