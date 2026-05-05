import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Star, Check } from "lucide-react";
import { useListQuestions, useSubmitResponse, getListQuestionsQueryKey } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";

interface LogicRule {
  condition: string;
  value?: string | null;
  jumpToQuestionId?: string | null;
  jumpToEnd?: boolean;
}

interface Question {
  id: string;
  type: string;
  title: string;
  description?: string | null;
  required: boolean;
  order: number;
  options?: string[] | null;
  logic?: LogicRule[] | null;
}

interface Form {
  id: string;
  title: string;
  description?: string | null;
  themeColor: string;
  questions?: Question[];
}

interface FormFillerProps {
  form: Form;
  previewMode?: boolean;
}

function applyLogic(question: Question, answer: string, questions: Question[]): string | null {
  if (!question.logic || question.logic.length === 0) return null;
  for (const rule of question.logic) {
    let match = false;
    switch (rule.condition) {
      case "equals": match = answer === rule.value; break;
      case "not_equals": match = answer !== rule.value; break;
      case "contains": match = answer.includes(rule.value ?? ""); break;
      case "is_empty": match = !answer || answer.trim() === ""; break;
      case "is_not_empty": match = !!(answer && answer.trim()); break;
      case "greater_than": match = parseFloat(answer) > parseFloat(rule.value ?? "0"); break;
      case "less_than": match = parseFloat(answer) < parseFloat(rule.value ?? "0"); break;
    }
    if (match) {
      if (rule.jumpToEnd) return "end";
      if (rule.jumpToQuestionId) return rule.jumpToQuestionId;
    }
  }
  return null;
}

function QuestionInput({
  question,
  value,
  onChange,
  themeColor,
}: {
  question: Question;
  value: string;
  onChange: (v: string) => void;
  themeColor: string;
}) {
  const baseInput = "w-full px-4 py-3 rounded-xl border-2 border-border bg-background text-foreground text-base focus:outline-none focus:border-current transition-colors";

  switch (question.type) {
    case "short_text":
    case "email":
    case "phone":
    case "number":
      return (
        <input
          type={question.type === "email" ? "email" : question.type === "phone" ? "tel" : question.type === "number" ? "number" : "text"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={question.type === "email" ? "your@email.com" : question.type === "phone" ? "+1 (555) 000-0000" : "Your answer"}
          className={baseInput}
          style={{ "--tw-ring-color": themeColor } as any}
          data-testid="input-answer"
          autoFocus
        />
      );

    case "long_text":
      return (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Your answer"
          rows={4}
          className={`${baseInput} resize-none`}
          data-testid="textarea-answer"
          autoFocus
        />
      );

    case "multiple_choice":
      return (
        <div className="space-y-2">
          {(question.options || []).map((opt) => (
            <button
              key={opt}
              onClick={() => onChange(opt)}
              className={`w-full text-left px-4 py-3 rounded-xl border-2 text-base transition-all ${
                value === opt
                  ? "border-current text-foreground font-medium"
                  : "border-border text-foreground hover:border-muted-foreground"
              }`}
              style={value === opt ? { borderColor: themeColor, backgroundColor: themeColor + "15" } : {}}
              data-testid={`option-${opt}`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors`}
                  style={value === opt ? { borderColor: themeColor, backgroundColor: themeColor } : { borderColor: "hsl(var(--border))" }}
                >
                  {value === opt && <div className="w-2 h-2 rounded-full bg-white" />}
                </div>
                {opt}
              </div>
            </button>
          ))}
        </div>
      );

    case "checkbox":
      const selected = value ? value.split(",").filter(Boolean) : [];
      return (
        <div className="space-y-2">
          {(question.options || []).map((opt) => {
            const isChecked = selected.includes(opt);
            return (
              <button
                key={opt}
                onClick={() => {
                  const newSelected = isChecked
                    ? selected.filter((s) => s !== opt)
                    : [...selected, opt];
                  onChange(newSelected.join(","));
                }}
                className={`w-full text-left px-4 py-3 rounded-xl border-2 text-base transition-all ${
                  isChecked ? "border-current" : "border-border hover:border-muted-foreground"
                }`}
                style={isChecked ? { borderColor: themeColor, backgroundColor: themeColor + "15" } : {}}
                data-testid={`option-${opt}`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-colors"
                    style={isChecked ? { borderColor: themeColor, backgroundColor: themeColor } : { borderColor: "hsl(var(--border))" }}
                  >
                    {isChecked && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
                  </div>
                  {opt}
                </div>
              </button>
            );
          })}
        </div>
      );

    case "dropdown":
      return (
        <div className="relative">
          <select
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className={`${baseInput} appearance-none cursor-pointer pr-10`}
            data-testid="select-answer"
          >
            <option value="">Select an option</option>
            {(question.options || []).map((opt) => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
          <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
        </div>
      );

    case "rating":
      const max = 5;
      const rating = parseInt(value) || 0;
      return (
        <div className="flex gap-2">
          {Array.from({ length: max }, (_, i) => i + 1).map((n) => (
            <button
              key={n}
              onClick={() => onChange(String(n))}
              className="transition-transform hover:scale-110"
              data-testid={`star-${n}`}
            >
              <Star
                className="w-10 h-10"
                fill={n <= rating ? themeColor : "transparent"}
                stroke={n <= rating ? themeColor : "hsl(var(--border))"}
                strokeWidth={1.5}
              />
            </button>
          ))}
        </div>
      );

    case "date":
      return (
        <input
          type="date"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={baseInput}
          data-testid="input-date"
        />
      );

    case "yes_no":
      return (
        <div className="flex gap-3">
          {["Yes", "No"].map((opt) => (
            <button
              key={opt}
              onClick={() => onChange(opt)}
              className={`flex-1 py-4 rounded-xl border-2 text-base font-medium transition-all ${
                value === opt ? "border-current" : "border-border hover:border-muted-foreground"
              }`}
              style={value === opt ? { borderColor: themeColor, backgroundColor: themeColor + "15", color: themeColor } : {}}
              data-testid={`option-${opt.toLowerCase()}`}
            >
              {opt}
            </button>
          ))}
        </div>
      );

    default:
      return (
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Your answer"
          className={baseInput}
          data-testid="input-answer"
        />
      );
  }
}

export default function FormFiller({ form, previewMode }: FormFillerProps) {
  const { data: questionsData } = useListQuestions(form.id, {
    query: { queryKey: getListQuestionsQueryKey(form.id) }
  });

  const questions = (form.questions || questionsData || []) as Question[];
  const sortedQuestions = [...questions].sort((a, b) => a.order - b.order);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [direction, setDirection] = useState(1);
  const [submitted, setSubmitted] = useState(false);
  const submitResponse = useSubmitResponse();
  const { toast } = useToast();

  const currentQuestion = sortedQuestions[currentIndex];
  const progress = sortedQuestions.length > 0 ? ((currentIndex) / sortedQuestions.length) * 100 : 0;

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Enter" && currentQuestion) handleNext();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [currentIndex, answers, sortedQuestions]);

  const handleNext = useCallback(() => {
    if (!currentQuestion) return;
    const answer = answers[currentQuestion.id] ?? "";

    if (currentQuestion.required && !answer.trim()) {
      toast({ title: "This field is required", variant: "destructive" });
      return;
    }

    // Apply conditional logic
    const jumpTo = applyLogic(currentQuestion, answer, sortedQuestions);

    if (jumpTo === "end") {
      handleSubmit();
      return;
    }

    if (jumpTo) {
      const idx = sortedQuestions.findIndex((q) => q.id === jumpTo);
      if (idx !== -1) {
        setDirection(1);
        setCurrentIndex(idx);
        return;
      }
    }

    if (currentIndex < sortedQuestions.length - 1) {
      setDirection(1);
      setCurrentIndex((i) => i + 1);
    } else {
      handleSubmit();
    }
  }, [currentQuestion, answers, currentIndex, sortedQuestions]);

  const handleBack = () => {
    if (currentIndex > 0) {
      setDirection(-1);
      setCurrentIndex((i) => i - 1);
    }
  };

  const handleSubmit = () => {
    if (previewMode) {
      setSubmitted(true);
      return;
    }

    const answerPayload = sortedQuestions
      .filter((q) => answers[q.id] !== undefined)
      .map((q) => ({ questionId: q.id, value: answers[q.id] }));

    submitResponse.mutate(
      { id: form.id, data: { answers: answerPayload, completed: true } },
      {
        onSuccess: () => setSubmitted(true),
        onError: () => toast({ title: "Failed to submit. Please try again.", variant: "destructive" }),
      }
    );
  };

  if (submitted) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4 }}
        >
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6"
            style={{ backgroundColor: form.themeColor + "22" }}
          >
            <Check className="w-8 h-8" style={{ color: form.themeColor }} />
          </div>
          <h1 className="text-3xl font-bold text-foreground mb-3">Thank you!</h1>
          <p className="text-muted-foreground">Your response has been submitted successfully.</p>
        </motion.div>
      </div>
    );
  }

  if (sortedQuestions.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-lg font-semibold text-foreground mb-2">{form.title}</p>
          <p className="text-muted-foreground">This form has no questions yet.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Progress bar */}
      <div className="h-1 bg-border">
        <motion.div
          className="h-full transition-all"
          style={{ backgroundColor: form.themeColor, width: `${progress}%` }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.3 }}
        />
      </div>

      {/* Question */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12">
        <div className="w-full max-w-xl">
          <div className="text-xs text-muted-foreground mb-6 text-center">
            {currentIndex + 1} / {sortedQuestions.length}
          </div>

          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={currentQuestion?.id}
              custom={direction}
              initial={{ opacity: 0, x: direction * 60 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -direction * 60 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
            >
              <div className="mb-8">
                <h2 className="text-2xl font-bold text-foreground mb-2 leading-snug">
                  {currentQuestion?.title}
                  {currentQuestion?.required && (
                    <span style={{ color: form.themeColor }} className="ml-1">*</span>
                  )}
                </h2>
                {currentQuestion?.description && (
                  <p className="text-muted-foreground">{currentQuestion.description}</p>
                )}
              </div>

              {currentQuestion && (
                <QuestionInput
                  question={currentQuestion}
                  value={answers[currentQuestion.id] ?? ""}
                  onChange={(v) => setAnswers((prev) => ({ ...prev, [currentQuestion.id]: v }))}
                  themeColor={form.themeColor}
                />
              )}
            </motion.div>
          </AnimatePresence>

          <div className="flex items-center gap-3 mt-8">
            <button
              onClick={handleNext}
              disabled={submitResponse.isPending}
              className="px-6 py-3 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90 active:scale-95 disabled:opacity-60"
              style={{ backgroundColor: form.themeColor }}
              data-testid="button-next"
            >
              {submitResponse.isPending
                ? "Submitting..."
                : currentIndex === sortedQuestions.length - 1
                ? "Submit"
                : "Continue"}
            </button>

            {currentIndex > 0 && (
              <button
                onClick={handleBack}
                className="px-4 py-3 rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                data-testid="button-back"
              >
                Back
              </button>
            )}

            <span className="text-xs text-muted-foreground ml-2">Press Enter</span>
          </div>
        </div>
      </div>
    </div>
  );
}
