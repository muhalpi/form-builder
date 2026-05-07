import { createContext, useContext, useState } from "react";
import type { Lang } from "@/lib/i18n";

interface LangContextValue {
  lang: Lang;
  setLang: (lang: Lang) => void;
  toggleLang: () => void;
}

const LangContext = createContext<LangContextValue>({
  lang: "en",
  setLang: () => {},
  toggleLang: () => {},
});

export function LangProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLang] = useState<Lang>("en");
  const toggleLang = () => setLang(l => l === "en" ? "id" : "en");
  return <LangContext.Provider value={{ lang, setLang, toggleLang }}>{children}</LangContext.Provider>;
}

export function useLang() {
  return useContext(LangContext);
}
