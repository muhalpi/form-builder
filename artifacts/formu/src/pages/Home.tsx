import { Link } from "wouter";
import { FileText, Globe, CheckCircle2 } from "lucide-react";
import { useLang } from "@/contexts/LangContext";
import { t } from "@/lib/i18n";

export default function Home() {
  const { lang, toggleLang } = useLang();
  const features = [
    t(lang, "homeFeatureOne"),
    t(lang, "homeFeatureTwo"),
    t(lang, "homeFeatureThree"),
  ];

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/80 backdrop-blur">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <FileText className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="text-lg font-semibold text-foreground tracking-tight">Formu</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={toggleLang}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border text-sm text-foreground hover:bg-muted transition-colors"
              data-testid="button-home-lang-toggle"
            >
              <Globe className="w-3.5 h-3.5" />
              {t(lang, "langSwitch")}
            </button>
            <Link href="/login">
              <button
                className="px-3.5 py-2 rounded-lg border border-border text-sm font-medium text-foreground hover:bg-muted transition-colors"
                data-testid="button-home-login"
              >
                {t(lang, "homeNavLogin")}
              </button>
            </Link>
            <Link href="/signup">
              <button
                className="px-3.5 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
                data-testid="button-home-signup"
              >
                {t(lang, "homeNavSignup")}
              </button>
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-16 md:py-24">
        <div className="max-w-3xl">
          <p className="inline-flex items-center rounded-full bg-muted text-muted-foreground text-xs font-semibold uppercase tracking-wider px-3 py-1">
            {t(lang, "homeBadge")}
          </p>
          <h1 className="mt-5 text-4xl md:text-5xl font-bold text-foreground leading-tight">
            {t(lang, "homeTitle")}
          </h1>
          <p className="mt-4 text-base md:text-lg text-muted-foreground max-w-2xl">
            {t(lang, "homeSubtitle")}
          </p>

          <div className="mt-8 flex flex-col sm:flex-row gap-3">
            <Link href="/signup">
              <button
                className="px-5 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors"
                data-testid="button-home-cta-signup"
              >
                {t(lang, "homePrimaryCta")}
              </button>
            </Link>
            <Link href="/login">
              <button
                className="px-5 py-2.5 rounded-lg border border-border text-sm font-semibold text-foreground hover:bg-muted transition-colors"
                data-testid="button-home-cta-login"
              >
                {t(lang, "homeSecondaryCta")}
              </button>
            </Link>
          </div>
        </div>

        <div className="mt-12 grid gap-3 md:max-w-3xl">
          {features.map((feature) => (
            <div key={feature} className="bg-card border border-card-border rounded-xl px-4 py-3 flex items-start gap-3">
              <CheckCircle2 className="w-4 h-4 text-primary mt-0.5 shrink-0" />
              <p className="text-sm text-foreground">{feature}</p>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
