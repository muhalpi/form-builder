import { useParams } from "wouter";
import { useState } from "react";
import { ChevronDown, ChevronUp, MessageSquare } from "lucide-react";
import { useGetForm, useListResponses, getGetFormQueryKey } from "@workspace/api-client-react";
import { FormLayout } from "@/components/layout/FormLayout";
import { formatDistanceToNow, format } from "date-fns";

function ResponseCard({ response }: { response: any }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="bg-card border border-card-border rounded-xl overflow-hidden" data-testid={`card-response-${response.id}`}>
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-muted/30 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className={`w-2 h-2 rounded-full ${response.completed ? "bg-green-500" : "bg-amber-400"}`} />
          <span className="text-sm font-medium text-foreground">
            Response from {format(new Date(response.submittedAt), "MMM d, yyyy 'at' h:mm a")}
          </span>
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${response.completed ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}`}>
            {response.completed ? "Completed" : "Partial"}
          </span>
        </div>
        <div className="flex items-center gap-2 text-muted-foreground">
          <span className="text-xs">{response.answers?.length || 0} answers</span>
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </div>
      </button>

      {expanded && response.answers && response.answers.length > 0 && (
        <div className="border-t border-border px-5 py-4 space-y-4">
          {response.answers.map((answer: any) => (
            <div key={answer.id} data-testid={`answer-${answer.id}`}>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">{answer.questionTitle}</p>
              <p className="text-sm text-foreground">{answer.value || <span className="text-muted-foreground italic">No answer</span>}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function FormResponses() {
  const { id } = useParams<{ id: string }>();
  const [page, setPage] = useState(1);

  const { data: form } = useGetForm(id, { query: { queryKey: getGetFormQueryKey(id) } });
  const { data: responsesData, isLoading } = useListResponses(id, { page, limit: 20 });

  return (
    <FormLayout formId={id} formTitle={form?.title}>
      <div className="h-full overflow-auto">
        <div className="max-w-3xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-foreground">Responses</h2>
            {responsesData && (
              <span className="text-sm text-muted-foreground">{responsesData.total} total</span>
            )}
          </div>

          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-16 bg-muted rounded-xl animate-pulse" />
              ))}
            </div>
          ) : !responsesData?.data || responsesData.data.length === 0 ? (
            <div className="text-center py-16 border border-dashed border-border rounded-xl">
              <MessageSquare className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground text-sm">No responses yet.</p>
              {form?.isPublished ? (
                <p className="text-xs text-muted-foreground mt-1">Share your form to start collecting responses.</p>
              ) : (
                <p className="text-xs text-muted-foreground mt-1">Publish your form to start collecting responses.</p>
              )}
            </div>
          ) : (
            <>
              <div className="space-y-3">
                {responsesData.data.map((response) => (
                  <ResponseCard key={response.id} response={response} />
                ))}
              </div>

              {responsesData.totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 mt-6">
                  <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="px-3 py-1.5 text-sm border border-border rounded-md disabled:opacity-40 hover:bg-muted transition-colors"
                  >
                    Previous
                  </button>
                  <span className="text-sm text-muted-foreground">
                    Page {page} of {responsesData.totalPages}
                  </span>
                  <button
                    onClick={() => setPage(p => Math.min(responsesData.totalPages, p + 1))}
                    disabled={page === responsesData.totalPages}
                    className="px-3 py-1.5 text-sm border border-border rounded-md disabled:opacity-40 hover:bg-muted transition-colors"
                  >
                    Next
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </FormLayout>
  );
}
