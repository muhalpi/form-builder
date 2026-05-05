import { useLocation } from "wouter";
import { Plus, FileText, BarChart2, ExternalLink, Trash2, Globe, Lock } from "lucide-react";
import { useListForms, useCreateForm, useDeleteForm, useGetDashboardSummary, getListFormsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { AppLayout } from "@/components/layout/AppLayout";
import { formatDistanceToNow } from "date-fns";

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

  const { data: forms, isLoading: formsLoading } = useListForms();
  const { data: summary } = useGetDashboardSummary();
  const createForm = useCreateForm();
  const deleteForm = useDeleteForm();

  const handleNewForm = () => {
    createForm.mutate(
      { data: { title: "Untitled Form", themeColor: "#6366f1" } },
      {
        onSuccess: (form) => {
          queryClient.invalidateQueries({ queryKey: getListFormsQueryKey() });
          setLocation(`/forms/${form.id}/build`);
        },
      }
    );
  };

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Delete this form and all its responses?")) return;
    deleteForm.mutate(
      { id },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListFormsQueryKey() });
        },
      }
    );
  };

  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Manage your forms and track responses</p>
          </div>
          <button
            onClick={handleNewForm}
            disabled={createForm.isPending}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-60"
            data-testid="button-create-form"
          >
            <Plus className="w-4 h-4" />
            {createForm.isPending ? "Creating..." : "New Form"}
          </button>
        </div>

        {/* Stats */}
        {summary && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <StatCard label="Total Forms" value={summary.totalForms} />
            <StatCard label="Published" value={summary.publishedForms} />
            <StatCard label="Total Responses" value={summary.totalResponses} />
            <StatCard label="This Week" value={summary.responsesThisWeek} />
          </div>
        )}

        {/* Forms list */}
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">Your Forms</h2>

        {formsLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 bg-muted rounded-xl animate-pulse" />
            ))}
          </div>
        ) : !forms || forms.length === 0 ? (
          <div className="text-center py-16 border border-dashed border-border rounded-xl">
            <FileText className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground text-sm">No forms yet. Create your first form.</p>
            <button
              onClick={handleNewForm}
              className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
              data-testid="button-create-first-form"
            >
              Create Form
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {forms.map((form) => (
              <div
                key={form.id}
                className="group flex items-center gap-4 px-5 py-4 bg-card border border-card-border rounded-xl hover:border-primary/30 transition-all cursor-pointer"
                onClick={() => setLocation(`/forms/${form.id}/build`)}
                data-testid={`card-form-${form.id}`}
              >
                <div
                  className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                  style={{ backgroundColor: form.themeColor + "22" }}
                >
                  <FileText className="w-4 h-4" style={{ color: form.themeColor }} />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-foreground truncate">{form.title}</p>
                    {form.isPublished ? (
                      <Globe className="w-3.5 h-3.5 text-green-500 shrink-0" />
                    ) : (
                      <Lock className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {form.questionCount} question{form.questionCount !== 1 ? "s" : ""} &middot;{" "}
                    {form.responseCount} response{form.responseCount !== 1 ? "s" : ""} &middot;{" "}
                    updated {formatDistanceToNow(new Date(form.updatedAt), { addSuffix: true })}
                  </p>
                </div>

                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={(e) => { e.stopPropagation(); setLocation(`/forms/${form.id}/stats`); }}
                    className="p-2 rounded-md hover:bg-muted transition-colors"
                    title="View stats"
                    data-testid={`button-stats-${form.id}`}
                  >
                    <BarChart2 className="w-4 h-4 text-muted-foreground" />
                  </button>
                  {form.isPublished && (
                    <button
                      onClick={(e) => { e.stopPropagation(); window.open(`/f/${form.id}`, "_blank"); }}
                      className="p-2 rounded-md hover:bg-muted transition-colors"
                      title="Open form"
                      data-testid={`button-open-${form.id}`}
                    >
                      <ExternalLink className="w-4 h-4 text-muted-foreground" />
                    </button>
                  )}
                  <button
                    onClick={(e) => handleDelete(form.id, e)}
                    className="p-2 rounded-md hover:bg-destructive/10 transition-colors"
                    title="Delete"
                    data-testid={`button-delete-${form.id}`}
                  >
                    <Trash2 className="w-4 h-4 text-destructive/70" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
