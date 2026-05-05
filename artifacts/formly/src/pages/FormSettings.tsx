import { useParams } from "wouter";
import { useState, useEffect } from "react";
import { Globe, Lock, RefreshCw, Trash2, Link2 } from "lucide-react";
import {
  useGetForm, useUpdateForm, usePublishForm,
  useGetSheetIntegration, useSaveSheetIntegration, useDeleteSheetIntegration, useSyncToSheets,
  getGetFormQueryKey, getGetSheetIntegrationQueryKey
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { FormLayout } from "@/components/layout/FormLayout";
import { useToast } from "@/hooks/use-toast";

const PRESET_COLORS = [
  "#6366f1", "#8b5cf6", "#ec4899", "#f43f5e",
  "#f97316", "#eab308", "#22c55e", "#14b8a6",
  "#3b82f6", "#06b6d4", "#64748b", "#1e293b",
];

export default function FormSettings() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: form } = useGetForm(id, { query: { queryKey: getGetFormQueryKey(id) } });
  const { data: sheetIntegration } = useGetSheetIntegration(id, {
    query: { queryKey: getGetSheetIntegrationQueryKey(id) }
  });

  const updateForm = useUpdateForm();
  const publishForm = usePublishForm();
  const saveSheet = useSaveSheetIntegration();
  const deleteSheet = useDeleteSheetIntegration();
  const syncSheets = useSyncToSheets();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [themeColor, setThemeColor] = useState("#6366f1");
  const [spreadsheetId, setSpreadsheetId] = useState("");
  const [spreadsheetName, setSpreadsheetName] = useState("");
  const [sheetName, setSheetName] = useState("Form Responses");
  const [sheetEnabled, setSheetEnabled] = useState(true);

  useEffect(() => {
    if (form) {
      setTitle(form.title);
      setDescription(form.description ?? "");
      setThemeColor(form.themeColor);
    }
  }, [form]);

  useEffect(() => {
    if (sheetIntegration) {
      setSpreadsheetId(sheetIntegration.spreadsheetId);
      setSpreadsheetName(sheetIntegration.spreadsheetName);
      setSheetName(sheetIntegration.sheetName);
      setSheetEnabled(sheetIntegration.enabled);
    }
  }, [sheetIntegration]);

  const handleSaveGeneral = () => {
    updateForm.mutate(
      { id, data: { title, description, themeColor } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetFormQueryKey(id) });
          toast({ title: "Settings saved" });
        },
      }
    );
  };

  const handlePublishToggle = () => {
    publishForm.mutate(
      { id, data: { published: !form?.isPublished } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetFormQueryKey(id) });
          toast({ title: form?.isPublished ? "Form unpublished" : "Form published" });
        },
      }
    );
  };

  const handleSaveSheet = () => {
    if (!spreadsheetId || !spreadsheetName || !sheetName) {
      toast({ title: "Please fill all sheet fields", variant: "destructive" });
      return;
    }
    saveSheet.mutate(
      { id, data: { spreadsheetId, spreadsheetName, sheetName, enabled: sheetEnabled } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetSheetIntegrationQueryKey(id) });
          toast({ title: "Sheet integration saved" });
        },
      }
    );
  };

  const handleSync = () => {
    syncSheets.mutate(
      { id },
      {
        onSuccess: (result) => {
          queryClient.invalidateQueries({ queryKey: getGetSheetIntegrationQueryKey(id) });
          toast({ title: result.message });
        },
        onError: () => {
          toast({ title: "Sync failed. Check integration settings.", variant: "destructive" });
        },
      }
    );
  };

  const handleRemoveSheet = () => {
    deleteSheet.mutate(
      { id },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetSheetIntegrationQueryKey(id) });
          setSpreadsheetId("");
          setSpreadsheetName("");
          setSheetName("Form Responses");
          setSheetEnabled(true);
          toast({ title: "Integration removed" });
        },
      }
    );
  };

  const formLink = typeof window !== "undefined"
    ? `${window.location.origin}${import.meta.env.BASE_URL}f/${id}`
    : "";

  return (
    <FormLayout formId={id} formTitle={form?.title}>
      <div className="h-full overflow-auto">
        <div className="max-w-2xl mx-auto px-6 py-6 space-y-6">

          {/* General */}
          <div className="bg-card border border-card-border rounded-xl p-6">
            <h3 className="text-sm font-semibold text-foreground mb-4">General</h3>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider block mb-1.5">
                  Form Title
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  data-testid="input-title"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider block mb-1.5">
                  Description
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                  data-testid="input-description"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider block mb-2">
                  Theme Color
                </label>
                <div className="flex items-center gap-2 flex-wrap">
                  {PRESET_COLORS.map((color) => (
                    <button
                      key={color}
                      onClick={() => setThemeColor(color)}
                      className={`w-7 h-7 rounded-full transition-all ${themeColor === color ? "ring-2 ring-offset-2 ring-foreground scale-110" : "hover:scale-105"}`}
                      style={{ backgroundColor: color }}
                      data-testid={`color-${color}`}
                    />
                  ))}
                  <div className="flex items-center gap-2 ml-2">
                    <input
                      type="color"
                      value={themeColor}
                      onChange={(e) => setThemeColor(e.target.value)}
                      className="w-7 h-7 rounded-full cursor-pointer border-none p-0"
                      data-testid="input-color-custom"
                    />
                    <input
                      type="text"
                      value={themeColor}
                      onChange={(e) => setThemeColor(e.target.value)}
                      className="w-24 px-2 py-1 rounded-md border border-input bg-background text-xs font-mono focus:outline-none focus:ring-1 focus:ring-ring"
                      data-testid="input-color-hex"
                    />
                  </div>
                </div>
              </div>

              <button
                onClick={handleSaveGeneral}
                disabled={updateForm.isPending}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-60"
                data-testid="button-save-general"
              >
                {updateForm.isPending ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>

          {/* Publish */}
          <div className="bg-card border border-card-border rounded-xl p-6">
            <h3 className="text-sm font-semibold text-foreground mb-4">Publish</h3>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                {form?.isPublished ? (
                  <Globe className="w-5 h-5 text-green-500" />
                ) : (
                  <Lock className="w-5 h-5 text-muted-foreground" />
                )}
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {form?.isPublished ? "Published" : "Unpublished"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {form?.isPublished ? "Your form is live and accepting responses." : "Your form is private."}
                  </p>
                </div>
              </div>
              <button
                onClick={handlePublishToggle}
                disabled={publishForm.isPending}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-60 ${
                  form?.isPublished
                    ? "border border-border text-foreground hover:bg-muted"
                    : "bg-green-600 text-white hover:bg-green-700"
                }`}
                data-testid="button-publish-toggle"
              >
                {publishForm.isPending ? "..." : form?.isPublished ? "Unpublish" : "Publish"}
              </button>
            </div>

            {form?.isPublished && (
              <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
                <Link2 className="w-4 h-4 text-muted-foreground shrink-0" />
                <span className="text-xs text-foreground font-mono flex-1 truncate">{formLink}</span>
                <button
                  onClick={() => { navigator.clipboard.writeText(formLink); toast({ title: "Link copied!" }); }}
                  className="text-xs text-primary hover:underline shrink-0"
                  data-testid="button-copy-link"
                >
                  Copy
                </button>
              </div>
            )}
          </div>

          {/* Google Sheets */}
          <div className="bg-card border border-card-border rounded-xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-5 h-5 flex items-center justify-center">
                <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none">
                  <rect width="24" height="24" rx="3" fill="#0F9D58" />
                  <path d="M7 8h10M7 12h10M7 16h6" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </div>
              <h3 className="text-sm font-semibold text-foreground">Google Sheets Integration</h3>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider block mb-1.5">
                  Spreadsheet ID
                </label>
                <input
                  type="text"
                  placeholder="1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms"
                  value={spreadsheetId}
                  onChange={(e) => setSpreadsheetId(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm font-mono focus:outline-none focus:ring-2 focus:ring-ring"
                  data-testid="input-spreadsheet-id"
                />
                <p className="text-xs text-muted-foreground mt-1">Found in the Google Sheets URL after /spreadsheets/d/</p>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider block mb-1.5">
                  Spreadsheet Name
                </label>
                <input
                  type="text"
                  placeholder="My Form Responses"
                  value={spreadsheetName}
                  onChange={(e) => setSpreadsheetName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  data-testid="input-spreadsheet-name"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider block mb-1.5">
                  Sheet Name (Tab)
                </label>
                <input
                  type="text"
                  placeholder="Form Responses"
                  value={sheetName}
                  onChange={(e) => setSheetName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  data-testid="input-sheet-name"
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="sheet-enabled"
                  checked={sheetEnabled}
                  onChange={(e) => setSheetEnabled(e.target.checked)}
                  className="rounded border-input"
                  data-testid="checkbox-sheet-enabled"
                />
                <label htmlFor="sheet-enabled" className="text-sm text-foreground">Enable auto-sync</label>
              </div>

              {sheetIntegration?.lastSyncedAt && (
                <p className="text-xs text-muted-foreground">
                  Last synced: {new Date(sheetIntegration.lastSyncedAt).toLocaleString()}
                </p>
              )}

              <div className="flex items-center gap-2 pt-2">
                <button
                  onClick={handleSaveSheet}
                  disabled={saveSheet.isPending}
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-60"
                  data-testid="button-save-sheet"
                >
                  {saveSheet.isPending ? "Saving..." : "Save Integration"}
                </button>
                {sheetIntegration && (
                  <>
                    <button
                      onClick={handleSync}
                      disabled={syncSheets.isPending}
                      className="flex items-center gap-1.5 px-4 py-2 border border-border rounded-lg text-sm font-medium hover:bg-muted transition-colors disabled:opacity-60"
                      data-testid="button-sync-now"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${syncSheets.isPending ? "animate-spin" : ""}`} />
                      {syncSheets.isPending ? "Syncing..." : "Sync Now"}
                    </button>
                    <button
                      onClick={handleRemoveSheet}
                      disabled={deleteSheet.isPending}
                      className="flex items-center gap-1.5 px-4 py-2 border border-destructive/30 text-destructive rounded-lg text-sm font-medium hover:bg-destructive/10 transition-colors disabled:opacity-60"
                      data-testid="button-remove-sheet"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Remove
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </FormLayout>
  );
}
