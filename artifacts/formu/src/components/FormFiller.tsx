import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Star, Check, GripVertical } from "lucide-react";
import { useListQuestions, useSubmitResponse, getListQuestionsQueryKey } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { useLang } from "@/contexts/LangContext";
import { t } from "@/lib/i18n";

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

function RankingInput({ options, value, onChange, themeColor }: {
  options: string[];
  value: string;
  onChange: (v: string) => void;
  themeColor: string;
}) {
  const [items, setItems] = useState<string[]>(() => {
    if (value) {
      const ordered = value.split(",");
      const missing = options.filter(o => !ordered.includes(o));
      return [...ordered, ...missing];
    }
    return [...options];
  });
  const [dragging, setDragging] = useState<number | null>(null);
  const [over, setOver] = useState<number | null>(null);

  const reorder = (from: number, to: number) => {
    const next = [...items];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    setItems(next);
    onChange(next.join(","));
  };

  return (
    <div className="space-y-2">
      {items.map((item, idx) => (
        <div
          key={item}
          draggable
          onDragStart={() => setDragging(idx)}
          onDragOver={(e) => { e.preventDefault(); setOver(idx); }}
          onDrop={() => {
            if (dragging !== null && dragging !== idx) reorder(dragging, idx);
            setDragging(null); setOver(null);
          }}
          onDragEnd={() => { setDragging(null); setOver(null); }}
          className={`flex items-center gap-3 px-4 py-3 rounded-xl border-2 transition-all cursor-grab active:cursor-grabbing ${
            dragging === idx ? "opacity-40" : ""
          } ${over === idx && dragging !== idx ? "scale-105" : "border-border"}`}
          style={over === idx && dragging !== idx ? { borderColor: themeColor, backgroundColor: themeColor + "10" } : {}}
          data-testid={`rank-item-${idx}`}
        >
          <span
            className="w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center shrink-0 text-white"
            style={{ backgroundColor: themeColor }}
          >{idx + 1}</span>
          <GripVertical className="w-4 h-4 text-muted-foreground shrink-0" />
          <span className="text-sm font-medium text-foreground flex-1">{item}</span>
        </div>
      ))}
    </div>
  );
}

function OpinionScaleInput({ options, value, onChange, themeColor }: {
  options: string[] | null | undefined;
  value: string;
  onChange: (v: string) => void;
  themeColor: string;
}) {
  const min = parseInt(options?.[0] ?? "1");
  const max = parseInt(options?.[1] ?? "10");
  const lowLabel = options?.[2] ?? "";
  const highLabel = options?.[3] ?? "";
  const nums = Array.from({ length: max - min + 1 }, (_, i) => min + i);
  const selected = value ? parseInt(value) : null;

  return (
    <div>
      <div className="flex gap-1.5 flex-wrap">
        {nums.map((n) => {
          const isSelected = selected === n;
          return (
            <button
              key={n}
              onClick={() => onChange(String(n))}
              className={`w-10 h-10 rounded-lg text-sm font-semibold transition-all hover:scale-110 active:scale-95 border-2 ${
                isSelected ? "text-white border-transparent" : "border-border text-foreground hover:border-current"
              }`}
              style={isSelected ? { backgroundColor: themeColor } : {}}
              data-testid={`scale-${n}`}
            >
              {n}
            </button>
          );
        })}
      </div>
      {(lowLabel || highLabel) && (
        <div className="flex justify-between mt-2">
          {lowLabel && <span className="text-xs text-muted-foreground">{lowLabel}</span>}
          {highLabel && <span className="text-xs text-muted-foreground">{highLabel}</span>}
        </div>
      )}
    </div>
  );
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
  const { lang } = useLang();
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
          placeholder={
            question.type === "email" ? "your@email.com"
              : question.type === "phone" ? "+62 812 3456 7890"
              : t(lang, "yourAnswer")
          }
          className={baseInput}
          data-testid="input-answer"
          autoFocus
        />
      );

    case "long_text":
      return (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={t(lang, "yourAnswer")}
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
                value === opt ? "border-current font-medium" : "border-border hover:border-muted-foreground"
              }`}
              style={value === opt ? { borderColor: themeColor, backgroundColor: themeColor + "15" } : {}}
              data-testid={`option-${opt}`}
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0"
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

    case "checkbox": {
      const selected = value ? value.split(",").filter(Boolean) : [];
      return (
        <div className="space-y-2">
          {(question.options || []).map((opt) => {
            const isChecked = selected.includes(opt);
            return (
              <button
                key={opt}
                onClick={() => {
                  const next = isChecked ? selected.filter(s => s !== opt) : [...selected, opt];
                  onChange(next.join(","));
                }}
                className={`w-full text-left px-4 py-3 rounded-xl border-2 text-base transition-all ${
                  isChecked ? "border-current" : "border-border hover:border-muted-foreground"
                }`}
                style={isChecked ? { borderColor: themeColor, backgroundColor: themeColor + "15" } : {}}
                data-testid={`option-${opt}`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0"
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
    }

    case "dropdown":
      return (
        <div className="relative">
          <select
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className={`${baseInput} appearance-none cursor-pointer pr-10`}
            data-testid="select-answer"
          >
            <option value="">{t(lang, "selectOption")}</option>
            {(question.options || []).map((opt) => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
          <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
        </div>
      );

    case "rating": {
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
    }

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
          {[t(lang, "yes"), t(lang, "no")].map((opt) => (
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

    case "ranking":
      return (
        <RankingInput
          options={question.options || []}
          value={value}
          onChange={onChange}
          themeColor={themeColor}
        />
      );

    case "opinion_scale":
      return (
        <OpinionScaleInput
          options={question.options}
          value={value}
          onChange={onChange}
          themeColor={themeColor}
        />
      );

    default:
      return (
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={t(lang, "yourAnswer")}
          className={baseInput}
          data-testid="input-answer"
        />
      );
  }
}

// ─── Welcome Screen ───────────────────────────────────────────────────────────
function WelcomeScreen({ form, onStart }: { form: Form; onStart: () => void }) {
  const { lang } = useLang();

  return (
    <div className="min-h-screen flex flex-col">
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="w-full max-w-xl text-center"
        >
          <div
            className="w-14 h-14 rounded-2xl mx-auto mb-8 flex items-center justify-center shadow-md"
            style={{ backgroundColor: form.themeColor }}
          >
            <svg viewBox="0 0 24 24" className="w-7 h-7 fill-white">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zm-1 1.5L18.5 9H13V3.5zM6 20V4h5v7h7v9H6z"/>
            </svg>
          </div>

          <h1 className="text-4xl font-bold text-foreground mb-4 leading-tight">{form.title}</h1>

          {form.description && (
            <p className="text-lg text-muted-foreground mb-8 leading-relaxed">{form.description}</p>
          )}

          <motion.button
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.97 }}
            onClick={onStart}
            className="px-10 py-4 rounded-2xl text-lg font-semibold text-white shadow-lg hover:shadow-xl transition-shadow"
            style={{ backgroundColor: form.themeColor }}
            data-testid="button-start"
          >
            {t(lang, "start")} →
          </motion.button>
        </motion.div>
      </div>

      <div className="text-center py-4">
        <span className="text-xs text-muted-foreground">{t(lang, "poweredBy")}</span>
      </div>
    </div>
  );
}

// ─── Main FormFiller ─────────────────────────────────────────────────────────
export default function FormFiller({ form, previewMode }: FormFillerProps) {
  const { lang } = useLang();

  const { data: questionsData } = useListQuestions(form.id, {
    query: {
      enabled: !form.questions,
      queryKey: getListQuestionsQueryKey(form.id),
    },
  });

  const questions = (form.questions || questionsData || []) as Question[];
  const sortedQuestions = [...questions].sort((a, b) => a.order - b.order);

  const [started, setStarted] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [direction, setDirection] = useState(1);
  const [submitted, setSubmitted] = useState(false);
  const submitResponse = useSubmitResponse();
  const { toast } = useToast();

  const currentQuestion = sortedQuestions[currentIndex];
  const progress = sortedQuestions.length > 0 ? (currentIndex / sortedQuestions.length) * 100 : 0;
  const isLongTextQuestion = currentQuestion?.type === "long_text";

  const handleNext = useCallback(() => {
    if (!currentQuestion) return;
    const answer = answers[currentQuestion.id] ?? "";

    if (currentQuestion.required && !answer.trim()) {
      toast({ title: t(lang, "required"), variant: "destructive" });
      return;
    }

    const jumpTo = applyLogic(currentQuestion, answer, sortedQuestions);
    if (jumpTo === "end") { handleSubmit(); return; }
    if (jumpTo) {
      const idx = sortedQuestions.findIndex(q => q.id === jumpTo);
      if (idx !== -1) { setDirection(1); setCurrentIndex(idx); return; }
    }

    if (currentIndex < sortedQuestions.length - 1) {
      setDirection(1);
      setCurrentIndex(i => i + 1);
    } else {
      handleSubmit();
    }
  }, [currentQuestion, answers, currentIndex, sortedQuestions, lang]);

  const handleBack = () => {
    if (currentIndex > 0) { setDirection(-1); setCurrentIndex(i => i - 1); }
  };

  const handleQuestionKeyDown = useCallback((e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== "Enter" || e.nativeEvent.isComposing) return;

    if (isLongTextQuestion) {
      if (!(e.ctrlKey || e.metaKey)) return;
    } else if (e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) {
      return;
    }

    e.preventDefault();
    handleNext();
  }, [handleNext, isLongTextQuestion]);

  const handleSubmit = () => {
    if (previewMode) { setSubmitted(true); return; }

    const answerPayload = sortedQuestions
      .filter(q => answers[q.id] !== undefined)
      .map(q => ({ questionId: q.id, value: answers[q.id] }));

    submitResponse.mutate(
      { id: form.id, data: { answers: answerPayload, completed: true } },
      {
        onSuccess: () => setSubmitted(true),
        onError: (error) => {
          const message = error instanceof Error ? error.message.toLowerCase() : "";
          const title = message.includes("already submitted")
            ? t(lang, "responseAlreadySubmitted")
            : t(lang, "submitFailed");
          toast({ title, variant: "destructive" });
        },
      }
    );
  };

  if (!started) {
    return <WelcomeScreen form={form} onStart={() => setStarted(true)} />;
  }

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
          <h1 className="text-3xl font-bold text-foreground mb-3">{t(lang, "thankYou")}</h1>
          <p className="text-muted-foreground">{t(lang, "responseSubmitted")}</p>
        </motion.div>
        <div className="mt-12 text-xs text-muted-foreground">{t(lang, "poweredBy")}</div>
      </div>
    );
  }

  if (sortedQuestions.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">{t(lang, "noQuestions")}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Progress bar */}
      <div className="h-1 bg-border">
        <motion.div
          className="h-full"
          style={{ backgroundColor: form.themeColor }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.3 }}
        />
      </div>

      {/* Question */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12">
        <div className="w-full max-w-xl">
          <div className="text-xs text-muted-foreground mb-6 text-center">
            {t(lang, "question")} {currentIndex + 1} {t(lang, "of")} {sortedQuestions.length}
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
                <div onKeyDown={handleQuestionKeyDown}>
                  <QuestionInput
                    question={currentQuestion}
                    value={answers[currentQuestion.id] ?? ""}
                    onChange={(v) => setAnswers(prev => ({ ...prev, [currentQuestion.id]: v }))}
                    themeColor={form.themeColor}
                  />
                </div>
              )}
            </motion.div>
          </AnimatePresence>

          <div className="flex items-center gap-3 mt-8">
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={handleNext}
              disabled={submitResponse.isPending}
              className="px-7 py-3 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-60"
              style={{ backgroundColor: form.themeColor }}
              data-testid="button-next"
            >
              {submitResponse.isPending
                ? t(lang, "submitting")
                : currentIndex === sortedQuestions.length - 1
                ? t(lang, "submit")
                : t(lang, "continue")}
            </motion.button>

            {currentIndex > 0 && (
              <button
                onClick={handleBack}
                className="px-4 py-3 rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                data-testid="button-back"
              >
                {t(lang, "back")}
              </button>
            )}

            <span className="text-xs text-muted-foreground ml-1">
              {isLongTextQuestion ? t(lang, "pressCtrlEnter") : t(lang, "pressEnter")}
            </span>
          </div>
        </div>
      </div>

      <div className="text-center py-4">
        <span className="text-xs text-muted-foreground">{t(lang, "poweredBy")}</span>
      </div>
    </div>
  );
}
