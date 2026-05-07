import { useMemo, useState } from "react";
import { Link, useLocation } from "wouter";
import { FileText } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { useToast } from "@/hooks/use-toast";
import { useLang } from "@/contexts/LangContext";
import { t } from "@/lib/i18n";

export default function ResetPassword() {
  const token = useMemo(
    () => new URLSearchParams(window.location.search).get("token"),
    [],
  );
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { lang } = useLang();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) {
      toast({
        title: t(lang, "resetPasswordError"),
        description: t(lang, "resetTokenInvalid"),
        variant: "destructive",
      });
      return;
    }
    if (password !== confirmPassword) {
      toast({
        title: t(lang, "resetPasswordError"),
        description: t(lang, "passwordsDoNotMatch"),
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    const result = await authClient.resetPassword({
      token,
      newPassword: password,
    });
    setIsSubmitting(false);

    if (result.error) {
      toast({
        title: t(lang, "resetPasswordError"),
        description: result.error.message,
        variant: "destructive",
      });
      return;
    }

    toast({ title: t(lang, "resetPasswordSuccess") });
    setLocation("/login");
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm bg-card border border-card-border rounded-xl p-6">
        <div className="flex items-center gap-2 mb-6">
          <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center">
            <FileText className="w-4 h-4 text-primary-foreground" />
          </div>
          <span className="font-semibold text-foreground">Formu</span>
        </div>

        <h1 className="text-2xl font-bold text-foreground mb-1">{t(lang, "resetPasswordTitle")}</h1>
        <p className="text-sm text-muted-foreground mb-6">{t(lang, "resetPasswordSubtitle")}</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">{t(lang, "newPasswordLabel")}</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              className="w-full px-3.5 py-2.5 rounded-lg border border-input bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-shadow"
              data-testid="input-reset-password"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">{t(lang, "confirmPasswordLabel")}</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={8}
              className="w-full px-3.5 py-2.5 rounded-lg border border-input bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-shadow"
              data-testid="input-reset-confirm-password"
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-60"
            data-testid="button-reset-submit"
          >
            {isSubmitting ? t(lang, "resettingPassword") : t(lang, "resetPasswordAction")}
          </button>
        </form>

        <Link href="/login">
          <button
            className="w-full mt-3 py-2.5 border border-border rounded-lg text-sm font-medium text-foreground hover:bg-muted transition-colors"
            data-testid="button-reset-back-login"
          >
            {t(lang, "backToLogin")}
          </button>
        </Link>
      </div>
    </div>
  );
}

