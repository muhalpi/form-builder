import { useState } from "react";
import { Link } from "wouter";
import { FileText } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { useToast } from "@/hooks/use-toast";
import { useLang } from "@/contexts/LangContext";
import { t } from "@/lib/i18n";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const { lang } = useLang();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const redirectTo = `${window.location.origin}${import.meta.env.BASE_URL}reset-password`;
    const result = await authClient.requestPasswordReset({ email, redirectTo });
    setIsSubmitting(false);

    if (result.error) {
      toast({
        title: t(lang, "resetPasswordError"),
        description: result.error.message,
        variant: "destructive",
      });
      return;
    }

    toast({
      title: t(lang, "resetLinkSentTitle"),
      description: t(lang, "resetLinkSentDescription"),
    });
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

        <h1 className="text-2xl font-bold text-foreground mb-1">{t(lang, "forgotPasswordTitle")}</h1>
        <p className="text-sm text-muted-foreground mb-6">{t(lang, "forgotPasswordSubtitle")}</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">{t(lang, "emailLabel")}</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              className="w-full px-3.5 py-2.5 rounded-lg border border-input bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-shadow"
              data-testid="input-forgot-email"
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-60"
            data-testid="button-forgot-submit"
          >
            {isSubmitting ? t(lang, "sendingResetLink") : t(lang, "sendResetLink")}
          </button>
        </form>

        <Link href="/login">
          <button
            className="w-full mt-3 py-2.5 border border-border rounded-lg text-sm font-medium text-foreground hover:bg-muted transition-colors"
            data-testid="button-back-login"
          >
            {t(lang, "backToLogin")}
          </button>
        </Link>
      </div>
    </div>
  );
}

