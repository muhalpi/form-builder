import { useParams } from "wouter";
import { useGetForm, getGetFormQueryKey } from "@workspace/api-client-react";
import FormFiller from "@/components/FormFiller";

export default function PublicForm() {
  const { id } = useParams<{ id: string }>();
  const { data: form, isLoading, error } = useGetForm(id, { query: { queryKey: getGetFormQueryKey(id) } });

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
          <p className="text-lg font-semibold text-foreground mb-2">Form not found</p>
          <p className="text-sm text-muted-foreground">This form may have been removed or is unavailable.</p>
        </div>
      </div>
    );
  }

  if (!form.isPublished) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <p className="text-lg font-semibold text-foreground mb-2">This form is not published</p>
          <p className="text-sm text-muted-foreground">The form owner has not published it yet.</p>
        </div>
      </div>
    );
  }

  return <FormFiller form={form} />;
}
