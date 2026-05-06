import { useParams } from "wouter";
import { useGetPublicForm, getGetPublicFormQueryKey } from "@workspace/api-client-react";
import FormFiller from "@/components/FormFiller";
import { useLang } from "@/contexts/LangContext";
import { t } from "@/lib/i18n";

export default function PublicForm() {
  const { id } = useParams<{ id: string }>();
  const { lang } = useLang();
  const { data: form, isLoading, error } = useGetPublicForm(id, {
    query: { queryKey: getGetPublicFormQueryKey(id) },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !form) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <p className="text-lg font-semibold text-foreground mb-2">{t(lang, "publicFormNotFound")}</p>
          <p className="text-sm text-muted-foreground">{t(lang, "publicFormUnavailable")}</p>
        </div>
      </div>
    );
  }

  return <FormFiller form={form} />;
}
