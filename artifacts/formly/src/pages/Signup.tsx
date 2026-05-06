import { useState } from "react";
import { Link, useLocation } from "wouter";
import { FileText, Eye, EyeOff, Github, Check } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { useToast } from "@/hooks/use-toast";
import { useLang } from "@/contexts/LangContext";
import { t } from "@/lib/i18n";

export default function Signup() {
  const [showPassword, setShowPassword] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { lang } = useLang();
  const perks = [
    t(lang, "signupPerkUnlimitedForms"),
    t(lang, "signupPerkRealtimeAnalytics"),
    t(lang, "signupPerkConditionalLogic"),
    t(lang, "signupPerkCsvSheets"),
  ];

  const passwordStrength = (() => {
    if (password.length === 0) return null;
    if (password.length < 6) return { label: t(lang, "passwordWeak"), color: "bg-destructive", width: "w-1/4" };
    if (password.length < 10) return { label: t(lang, "passwordFair"), color: "bg-amber-400", width: "w-2/4" };
    if (!/[^a-zA-Z0-9]/.test(password)) return { label: t(lang, "passwordGood"), color: "bg-chart-2", width: "w-3/4" };
    return { label: t(lang, "passwordStrong"), color: "bg-green-500", width: "w-full" };
  })();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const result = await authClient.signUp.email({ name, email, password });
    setIsSubmitting(false);

    if (result.error) {
      toast({
        title: t(lang, "signUpFailed"),
        description: result.error.message ?? t(lang, "checkCredentials"),
        variant: "destructive",
      });
      return;
    }

    setLocation("/");
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left panel — branding */}
      <div className="hidden lg:flex w-[420px] flex-shrink-0 flex-col justify-between bg-sidebar border-r border-border p-10">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <FileText className="w-4 h-4 text-primary-foreground" />
          </div>
          <span className="font-semibold text-lg text-foreground tracking-tight">Formly</span>
        </div>

        <div className="space-y-6">
          <div>
            <h2 className="text-2xl font-bold text-foreground mb-2">{t(lang, "signupHeroTitle")}</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {t(lang, "signupHeroSubtitle")}
            </p>
          </div>

          <ul className="space-y-3">
            {perks.map((perk) => (
              <li key={perk} className="flex items-center gap-3 text-sm text-foreground/80">
                <div className="w-5 h-5 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
                  <Check className="w-3 h-3 text-primary" />
                </div>
                {perk}
              </li>
            ))}
          </ul>
        </div>

        <p className="text-xs text-muted-foreground">© {new Date().getFullYear()} Formly. {t(lang, "rightsReserved")}</p>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="flex items-center gap-2 mb-8 lg:hidden">
            <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center">
              <FileText className="w-3.5 h-3.5 text-primary-foreground" />
            </div>
            <span className="font-semibold text-foreground">Formly</span>
          </div>

          <h1 className="text-2xl font-bold text-foreground mb-1">{t(lang, "signupTitle")}</h1>
          <p className="text-sm text-muted-foreground mb-8">{t(lang, "signupSubtitle")}</p>

          {/* OAuth buttons */}
          <div className="space-y-2.5 mb-6">
            <button
              type="button"
              disabled
              className="w-full flex items-center justify-center gap-3 px-4 py-2.5 border border-border rounded-lg text-sm font-medium text-foreground bg-card hover:bg-muted transition-colors"
              data-testid="button-signup-google"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              {t(lang, "signupWithGoogle")}
            </button>

            <button
              type="button"
              disabled
              className="w-full flex items-center justify-center gap-3 px-4 py-2.5 border border-border rounded-lg text-sm font-medium text-foreground bg-card hover:bg-muted transition-colors"
              data-testid="button-signup-github"
            >
              <Github className="w-4 h-4" />
              {t(lang, "signupWithGithub")}
            </button>
          </div>

          {/* Divider */}
          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center">
              <span className="px-3 bg-background text-xs text-muted-foreground">{t(lang, "orSignUpWithEmail")}</span>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">{t(lang, "fullNameLabel")}</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t(lang, "fullNameLabel")}
                required
                className="w-full px-3.5 py-2.5 rounded-lg border border-input bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-shadow"
                data-testid="input-signup-name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">{t(lang, "emailLabel")}</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                className="w-full px-3.5 py-2.5 rounded-lg border border-input bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-shadow"
                data-testid="input-signup-email"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">{t(lang, "passwordLabel")}</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={t(lang, "passwordMinChars")}
                  required
                  minLength={8}
                  className="w-full px-3.5 py-2.5 pr-10 rounded-lg border border-input bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-shadow"
                  data-testid="input-signup-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  data-testid="button-signup-toggle-password"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {/* Password strength */}
              {passwordStrength && (
                <div className="mt-2">
                  <div className="h-1 w-full bg-muted rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all ${passwordStrength.color} ${passwordStrength.width}`} />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{passwordStrength.label} {t(lang, "passwordStrengthSuffix")}</p>
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-60"
              data-testid="button-signup-submit"
            >
              {isSubmitting ? t(lang, "creatingAccount") : t(lang, "createAccountLabel")}
            </button>
          </form>

          <p className="text-center text-xs text-muted-foreground mt-5 leading-relaxed">
            {t(lang, "signupTermsPrefix")}{" "}
            <span className="text-primary hover:underline cursor-pointer">{t(lang, "termsOfService")}</span>
            {" "}{t(lang, "andLabel")}{" "}
            <span className="text-primary hover:underline cursor-pointer">{t(lang, "privacyPolicy")}</span>.
          </p>

          <p className="text-center text-sm text-muted-foreground mt-4">
            {t(lang, "alreadyHaveAccount")}{" "}
            <Link href="/login">
              <span className="text-primary font-medium hover:underline cursor-pointer">{t(lang, "signInLabel")}</span>
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
