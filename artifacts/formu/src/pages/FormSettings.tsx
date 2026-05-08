import { useParams } from "wouter";
import { useState, useEffect } from "react";
import { Globe, Lock, RefreshCw, Trash2, Link2, Shuffle, Trophy, Monitor } from "lucide-react";
import {
  useGetForm, useUpdateForm, usePublishForm,
  useGetSheetIntegration, useSaveSheetIntegration, useDeleteSheetIntegration, useSyncToSheets,
  getGetFormQueryKey, getGetSheetIntegrationQueryKey
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { FormLayout } from "@/components/layout/FormLayout";
import { useToast } from "@/hooks/use-toast";
import { useLang } from "@/contexts/LangContext";
import { t } from "@/lib/i18n";
import { authClient } from "@/lib/auth-client";
import { enableGoogleSheetsIntegration } from "@/lib/feature-flags";

const PRESET_COLORS = [
  "#6366f1", "#8b5cf6", "#ec4899", "#f43f5e",
  "#f97316", "#eab308", "#22c55e", "#14b8a6",
  "#3b82f6", "#06b6d4", "#64748b", "#1e293b",
];

export default function FormSettings() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { lang } = useLang();

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
  const [googleConnected, setGoogleConnected] = useState(false);
  const [checkingGoogleConnection, setCheckingGoogleConnection] = useState(true);
  const [isConnectingGoogle, setIsConnectingGoogle] = useState(false);

  // New feature states
  const [randomizeQuestions, setRandomizeQuestions] = useState(false);
  const [showScore, setShowScore] = useState(false);
  const [endScreenTitle, setEndScreenTitle] = useState("");
  const [endScreenDescription, setEndScreenDescription] = useState("");
  const [endScreenButtonText, setEndScreenButtonText] = useState("");
  const [endScreenButtonUrl, setEndScreenButtonUrl] = useState("");

  useEffect(() => {
    if (form) {
      setTitle(form.title);
      setDescription(form.description ?? "");
      setThemeColor(form.themeColor);
      setRandomizeQuestions(form.randomizeQuestions ?? false);
      setShowScore(form.showScore ?? false);
      setEndScreenTitle(form.endScreenTitle ?? "");
      setEndScreenDescription(form.endScreenDescription ?? "");
      setEndScreenButtonText(form.endScreenButtonText ?? "");
      setEndScreenButtonUrl(form.endScreenButtonUrl ?? "");
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

  useEffect(() => {
    if (!enableGoogleSheetsIntegration) {
      setCheckingGoogleConnection(false);
      return;
    }

    const loadGoogleConnectionStatus = async () => {
      try {
        setCheckingGoogleConnection(true);
        const apiBase = import.meta.env.VITE_API_URL ?? "http://localhost:8080";
        const response = await fetch(`${apiBase}/api/forms/${id}/sheets/oauth/status`, {
          credentials: "include",
        });

        if (!response.ok) {
          setGoogleConnected(false);
          return;
        }

        const data = (await response.json()) as { connected?: boolean };
        setGoogleConnected(Boolean(data.connected));
      } catch {
        setGoogleConnected(false);
      } finally {
        setCheckingGoogleConnection(false);
      }
    };

    void loadGoogleConnectionStatus();
  }, [id]);

  const handleConnectGoogle = async () => {
    if (!enableGoogleSheetsIntegration) return;

    setIsConnectingGoogle(true);
    const result = await authClient.linkSocial({
      provider: "google",
      callbackURL: `/forms/${id}/settings`,
      scopes: [
        "openid",
        "email",
        "profile",
        "https://www.googleapis.com/auth/spreadsheets",
        "https://www.googleapis.com/auth/drive.file",
      ],
    });
    setIsConnectingGoogle(false);

    if (result.error) {
      toast({
        title: t(lang, "googleConnectionFailed"),
        description: result.error.message,
        variant: "destructive",
      });
      return;
    }

    setGoogleConnected(true);
    toast({ title: t(lang, "googleConnectedSuccess") });
  };

  const handleSaveGeneral = () => {
    updateForm.mutate(
      { id, data: { title, description, themeColor } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetFormQueryKey(id) });
          toast({ title: t(lang, "settingsSaved") });
        },
      }
    );
  };

  const handleSaveRandomize = () => {
    updateForm.mutate(
      { id, data: { randomizeQuestions } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetFormQueryKey(id) });
          toast({ title: t(lang, "settingsSaved") });
        },
      }
    );
  };

  const handleSaveScore = () => {
    updateForm.mutate(
      { id, data: { showScore } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetFormQueryKey(id) });
          toast({ title: t(lang, "settingsSaved") });
        },
      }
    );
  };

  const handleSaveEndScreen = () => {
    updateForm.mutate(
      {
        id,
        data: {
          endScreenTitle: endScreenTitle || null,
          endScreenDescription: endScreenDescription || null,
          endScreenButtonText: endScreenButtonText || null,
          endScreenButtonUrl: endScreenButtonUrl || null,
        }
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetFormQueryKey(id) });
          toast({ title: t(lang, "settingsSaved") });
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
          toast({ title: form?.isPublished ? t(lang, "formUnpublished") : t(lang, "formPublished") });
        },
      }
    );
  };

  const handleSaveSheet = () => {
    if (!spreadsheetId || !spreadsheetName || !sheetName) {
      toast({ title: t(lang, "fillAllSheetFields"), variant: "destructive" });
      return;
    }
    saveSheet.mutate(
      { id, data: { spreadsheetId, spreadsheetName, sheetName, enabled: sheetEnabled } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetSheetIntegrationQueryKey(id) });
          toast({ title: t(lang, "sheetIntegrationSaved") });
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
        onError: (error) => {
          const message = error instanceof Error ? error.message : t(lang, "syncFailed");
          toast({ title: message, variant: "destructive" });
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
          toast({ title: t(lang, "integrationRemoved") });
        },
      }
    );
  };

  const formLink = typeof window !== "undefined"
    ? `${window.location.origin}${import.meta.env.BASE_URL}f/${id}`
    : "";

  const inputClass = "w-full px-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring";
  const labelClass = "text-xs font-medium text-muted-foreground uppercase tracking-wider block mb-1.5";
  const sectionClass = "bg-card border border-card-border rounded-xl p-6";
  const saveBtnClass = "px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-60";

  function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
    return (
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative w-10 h-5.5 rounded-full transition-colors flex-shrink-0 ${checked ? "bg-primary" : "bg-muted"}`}
        style={{ minWidth: 40, height: 22 }}
      >
        <div className={`absolute top-0.5 w-4.5 h-4.5 rounded-full bg-white shadow transition-transform ${checked ? "translate-x-[19px]" : "translate-x-0.5"}`} style={{ width: 18, height: 18 }} />
      </button>
    );
  }

  return (
    <FormLayout
      formId={id}
      formTitle={form?.title}
      formResponseCount={form?.responseCount}
      formIsPublished={form?.isPublished}
    >
      <div className="h-full overflow-auto">
        <div className="max-w-2xl mx-auto px-6 py-6 space-y-6">

          {/* General */}
          <div className={sectionClass}>
            <h3 className="text-sm font-semibold text-foreground mb-4">{t(lang, "general")}</h3>
            <div className="space-y-4">
              <div>
                <label className={labelClass}>{t(lang, "formTitleLabel")}</label>
                <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} className={inputClass} data-testid="input-title" />
              </div>
              <div>
                <label className={labelClass}>{t(lang, "descriptionFieldLabel")}</label>
                <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className={`${inputClass} resize-none`} data-testid="input-description" />
              </div>
              <div>
                <label className={labelClass}>{t(lang, "themeColor")}</label>
                <div className="flex items-center gap-2 flex-wrap">
                  {PRESET_COLORS.map((color) => (
                    <button key={color} onClick={() => setThemeColor(color)}
                      className={`w-7 h-7 rounded-full transition-all ${themeColor === color ? "ring-2 ring-offset-2 ring-foreground scale-110" : "hover:scale-105"}`}
                      style={{ backgroundColor: color }} data-testid={`color-${color}`} />
                  ))}
                  <div className="flex items-center gap-2 ml-2">
                    <input type="color" value={themeColor} onChange={(e) => setThemeColor(e.target.value)} className="w-7 h-7 rounded-full cursor-pointer border-none p-0" data-testid="input-color-custom" />
                    <input type="text" value={themeColor} onChange={(e) => setThemeColor(e.target.value)} className="w-24 px-2 py-1 rounded-md border border-input bg-background text-xs font-mono focus:outline-none focus:ring-1 focus:ring-ring" data-testid="input-color-hex" />
                  </div>
                </div>
              </div>
              <button onClick={handleSaveGeneral} disabled={updateForm.isPending} className={saveBtnClass} data-testid="button-save-general">
                {updateForm.isPending ? t(lang, "saving") : t(lang, "saveChanges")}
              </button>
            </div>
          </div>

          {/* Publish */}
          <div className={sectionClass}>
            <h3 className="text-sm font-semibold text-foreground mb-4">{t(lang, "publishSection")}</h3>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                {form?.isPublished ? <Globe className="w-5 h-5 text-green-500" /> : <Lock className="w-5 h-5 text-muted-foreground" />}
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {form?.isPublished ? t(lang, "publishedStatus") : t(lang, "unpublishedStatus")}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {form?.isPublished ? t(lang, "formIsLive") : t(lang, "formIsPrivate")}
                  </p>
                </div>
              </div>
              <button
                onClick={handlePublishToggle}
                disabled={publishForm.isPending}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-60 ${form?.isPublished ? "border border-border text-foreground hover:bg-muted" : "bg-green-600 text-white hover:bg-green-700"}`}
                data-testid="button-publish-toggle"
              >
                {publishForm.isPending ? "..." : form?.isPublished ? t(lang, "unpublish") : t(lang, "publishBtn")}
              </button>
            </div>
            {form?.isPublished && (
              <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
                <Link2 className="w-4 h-4 text-muted-foreground shrink-0" />
                <span className="text-xs text-foreground font-mono flex-1 truncate">{formLink}</span>
                <button onClick={() => { navigator.clipboard.writeText(formLink); toast({ title: t(lang, "linkCopied") }); }} className="text-xs text-primary hover:underline shrink-0" data-testid="button-copy-link">
                  {t(lang, "copy")}
                </button>
              </div>
            )}
          </div>

          {/* Randomize */}
          <div className={sectionClass}>
            <div className="flex items-center gap-2 mb-4">
              <Shuffle className="w-4 h-4 text-muted-foreground" />
              <h3 className="text-sm font-semibold text-foreground">{t(lang, "randomizeSection")}</h3>
            </div>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <Toggle checked={randomizeQuestions} onChange={setRandomizeQuestions} />
                <div>
                  <p className="text-sm font-medium text-foreground">{t(lang, "randomizeLabel")}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{t(lang, "randomizeHint")}</p>
                </div>
              </div>
              <button onClick={handleSaveRandomize} disabled={updateForm.isPending} className={saveBtnClass} data-testid="button-save-randomize">
                {updateForm.isPending ? t(lang, "saving") : t(lang, "saveChanges")}
              </button>
            </div>
          </div>

          {/* Point Score */}
          <div className={sectionClass}>
            <div className="flex items-center gap-2 mb-4">
              <Trophy className="w-4 h-4 text-muted-foreground" />
              <h3 className="text-sm font-semibold text-foreground">{t(lang, "pointsSection")}</h3>
            </div>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <Toggle checked={showScore} onChange={setShowScore} />
                <div>
                  <p className="text-sm font-medium text-foreground">{t(lang, "showScoreLabel")}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{t(lang, "pointsHint")}</p>
                </div>
              </div>
              <p className="text-xs text-muted-foreground bg-muted/40 px-3 py-2 rounded-lg">
                {lang === "id"
                  ? "Aktifkan poin pada setiap pertanyaan di tab Build untuk memberi nilai pada jawaban."
                  : "Enable points on each question in the Build tab to score answers."}
              </p>
              <button onClick={handleSaveScore} disabled={updateForm.isPending} className={saveBtnClass} data-testid="button-save-score">
                {updateForm.isPending ? t(lang, "saving") : t(lang, "saveChanges")}
              </button>
            </div>
          </div>

          {/* End Screen */}
          <div className={sectionClass}>
            <div className="flex items-center gap-2 mb-4">
              <Monitor className="w-4 h-4 text-muted-foreground" />
              <h3 className="text-sm font-semibold text-foreground">{t(lang, "endScreenSection")}</h3>
            </div>
            <div className="space-y-4">
              <div>
                <label className={labelClass}>{t(lang, "endScreenTitle")}</label>
                <input type="text" value={endScreenTitle} onChange={(e) => setEndScreenTitle(e.target.value)} placeholder={t(lang, "endScreenTitlePlaceholder")} className={inputClass} data-testid="input-end-screen-title" />
              </div>
              <div>
                <label className={labelClass}>{t(lang, "endScreenDescription")}</label>
                <textarea value={endScreenDescription} onChange={(e) => setEndScreenDescription(e.target.value)} placeholder={t(lang, "endScreenDescPlaceholder")} rows={3} className={`${inputClass} resize-none`} data-testid="input-end-screen-desc" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>{t(lang, "endScreenButtonText")}</label>
                  <input type="text" value={endScreenButtonText} onChange={(e) => setEndScreenButtonText(e.target.value)} placeholder={t(lang, "endScreenBtnTextPlaceholder")} className={inputClass} data-testid="input-end-screen-btn-text" />
                </div>
                <div>
                  <label className={labelClass}>{t(lang, "endScreenButtonUrl")}</label>
                  <input type="url" value={endScreenButtonUrl} onChange={(e) => setEndScreenButtonUrl(e.target.value)} placeholder={t(lang, "endScreenBtnUrlPlaceholder")} className={inputClass} data-testid="input-end-screen-btn-url" />
                </div>
              </div>
              <button onClick={handleSaveEndScreen} disabled={updateForm.isPending} className={saveBtnClass} data-testid="button-save-end-screen">
                {updateForm.isPending ? t(lang, "saving") : t(lang, "saveChanges")}
              </button>
            </div>
          </div>

          {/* Google Sheets */}
          {enableGoogleSheetsIntegration && (
            <div className={sectionClass}>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-5 h-5 flex items-center justify-center">
                  <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none">
                    <rect width="24" height="24" rx="3" fill="#0F9D58" />
                    <path d="M7 8h10M7 12h10M7 16h6" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                </div>
                <h3 className="text-sm font-semibold text-foreground">{t(lang, "googleSheets")}</h3>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 rounded-lg border border-border bg-muted/30">
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {googleConnected ? t(lang, "googleConnected") : t(lang, "googleDisconnected")}
                    </p>
                    {!googleConnected && !checkingGoogleConnection && (
                      <p className="text-xs text-muted-foreground mt-0.5">{t(lang, "googleConnectionNeeded")}</p>
                    )}
                  </div>
                  <button onClick={handleConnectGoogle} disabled={isConnectingGoogle || checkingGoogleConnection} className="px-3.5 py-2 rounded-lg border border-border text-sm font-medium text-foreground hover:bg-muted transition-colors disabled:opacity-60" data-testid="button-connect-google">
                    {isConnectingGoogle ? t(lang, "saving") : t(lang, "connectGoogleSheets")}
                  </button>
                </div>

                <div>
                  <label className={labelClass}>{t(lang, "spreadsheetIdLabel")}</label>
                  <input type="text" placeholder="1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms" value={spreadsheetId} onChange={(e) => setSpreadsheetId(e.target.value)} className={`${inputClass} font-mono`} data-testid="input-spreadsheet-id" />
                  <p className="text-xs text-muted-foreground mt-1">{t(lang, "spreadsheetIdHint")}</p>
                </div>
                <div>
                  <label className={labelClass}>{t(lang, "spreadsheetNameLabel")}</label>
                  <input type="text" placeholder="My Form Responses" value={spreadsheetName} onChange={(e) => setSpreadsheetName(e.target.value)} className={inputClass} data-testid="input-spreadsheet-name" />
                </div>
                <div>
                  <label className={labelClass}>{t(lang, "sheetNameLabel")}</label>
                  <input type="text" placeholder="Form Responses" value={sheetName} onChange={(e) => setSheetName(e.target.value)} className={inputClass} data-testid="input-sheet-name" />
                </div>
                <div className="flex items-center gap-2">
                  <input type="checkbox" id="sheet-enabled" checked={sheetEnabled} onChange={(e) => setSheetEnabled(e.target.checked)} className="rounded border-input" data-testid="checkbox-sheet-enabled" />
                  <label htmlFor="sheet-enabled" className="text-sm text-foreground">{t(lang, "enableAutoSync")}</label>
                </div>

                {sheetIntegration?.lastSyncedAt && (
                  <p className="text-xs text-muted-foreground">
                    {t(lang, "lastSynced")} {new Date(sheetIntegration.lastSyncedAt).toLocaleString()}
                  </p>
                )}

                <div className="flex items-center gap-2 pt-2">
                  <button onClick={handleSaveSheet} disabled={saveSheet.isPending} className={saveBtnClass} data-testid="button-save-sheet">
                    {saveSheet.isPending ? t(lang, "saving") : t(lang, "saveIntegration")}
                  </button>
                  {sheetIntegration && (
                    <>
                      <button onClick={handleSync} disabled={syncSheets.isPending || !googleConnected} className="flex items-center gap-1.5 px-4 py-2 border border-border rounded-lg text-sm font-medium hover:bg-muted transition-colors disabled:opacity-60" data-testid="button-sync-now">
                        <RefreshCw className={`w-3.5 h-3.5 ${syncSheets.isPending ? "animate-spin" : ""}`} />
                        {syncSheets.isPending ? t(lang, "syncing") : t(lang, "syncNow")}
                      </button>
                      <button onClick={handleRemoveSheet} disabled={deleteSheet.isPending} className="flex items-center gap-1.5 px-4 py-2 border border-destructive/30 text-destructive rounded-lg text-sm font-medium hover:bg-destructive/10 transition-colors disabled:opacity-60" data-testid="button-remove-sheet">
                        <Trash2 className="w-3.5 h-3.5" />
                        {t(lang, "remove")}
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </FormLayout>
  );
}
