import { useParams, useLocation } from "wouter";
import { ArrowLeft } from "lucide-react";
import { useGetForm, getGetFormQueryKey } from "@workspace/api-client-react";
import FormFiller from "@/components/FormFiller";

export default function FormPreview() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { data: form, isLoading } = useGetForm(id, { query: { queryKey: getGetFormQueryKey(id) } });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background relative">
      <div className="absolute top-4 left-4 z-50">
        <button
          onClick={() => setLocation(`/forms/${id}/build`)}
          className="flex items-center gap-2 px-3 py-2 text-sm font-medium bg-card border border-border rounded-lg shadow-sm hover:bg-muted transition-colors"
          data-testid="button-exit-preview"
        >
          <ArrowLeft className="w-4 h-4" />
          Exit Preview
        </button>
      </div>
      <div className="absolute top-4 right-4 z-50">
        <span className="px-2.5 py-1 text-xs font-medium bg-amber-100 text-amber-700 rounded-full border border-amber-200">
          Preview Mode
        </span>
      </div>
      {form && <FormFiller form={form} previewMode />}
    </div>
  );
}
