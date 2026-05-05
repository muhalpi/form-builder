import { useParams } from "wouter";
import { useState } from "react";
import {
  Type, AlignLeft, List, CheckSquare, ChevronDown as DropdownIcon,
  Star, Calendar, Mail, Phone, Hash, ToggleLeft, BarChart2, ArrowUpDown,
  Plus, GripVertical, Trash2, ChevronDown, ChevronRight, X, Check
} from "lucide-react";
import {
  useGetForm, useListQuestions, useCreateQuestion, useUpdateQuestion,
  useDeleteQuestion, useReorderQuestions,
  getGetFormQueryKey, getListQuestionsQueryKey
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { FormLayout } from "@/components/layout/FormLayout";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

type QuestionType =
  | "short_text" | "long_text"
  | "multiple_choice" | "checkbox" | "dropdown" | "ranking"
  | "rating" | "opinion_scale"
  | "date" | "email" | "phone" | "number" | "yes_no";

interface QuestionTypeDef {
  type: QuestionType;
  label: string;
  icon: any;
  description: string;
}

const QUESTION_CATEGORIES: { label: string; types: QuestionTypeDef[] }[] = [
  {
    label: "Text",
    types: [
      { type: "short_text", label: "Short Text", icon: Type, description: "Single line" },
      { type: "long_text", label: "Long Text", icon: AlignLeft, description: "Multi-line" },
    ],
  },
  {
    label: "Choice",
    types: [
      { type: "multiple_choice", label: "Multiple Choice", icon: List, description: "Pick one" },
      { type: "checkbox", label: "Checkbox", icon: CheckSquare, description: "Pick many" },
      { type: "dropdown", label: "Dropdown", icon: DropdownIcon, description: "Select from list" },
      { type: "ranking", label: "Ranking", icon: ArrowUpDown, description: "Drag to rank" },
    ],
  },
  {
    label: "Scale & Rating",
    types: [
      { type: "rating", label: "Star Rating", icon: Star, description: "Stars 1–5" },
      { type: "opinion_scale", label: "Opinion Scale", icon: BarChart2, description: "Numeric scale" },
    ],
  },
  {
    label: "Contact & Other",
    types: [
      { type: "email", label: "Email", icon: Mail, description: "Email address" },
      { type: "phone", label: "Phone", icon: Phone, description: "Phone number" },
      { type: "number", label: "Number", icon: Hash, description: "Numeric input" },
      { type: "date", label: "Date", icon: Calendar, description: "Date picker" },
      { type: "yes_no", label: "Yes / No", icon: ToggleLeft, description: "Binary choice" },
    ],
  },
];

const ALL_TYPES: QuestionTypeDef[] = QUESTION_CATEGORIES.flatMap(c => c.types);

interface Question {
  id: string;
  formId: string;
  type: string;
  title: string;
  description?: string | null;
  required: boolean;
  order: number;
  options?: string[] | null;
  logic?: LogicRule[] | null;
  createdAt: string;
}

interface LogicRule {
  condition: string;
  value?: string | null;
  jumpToQuestionId?: string | null;
  jumpToEnd?: boolean;
}

const CONDITIONS = [
  { value: "equals", label: "equals" },
  { value: "not_equals", label: "does not equal" },
  { value: "contains", label: "contains" },
  { value: "is_empty", label: "is empty" },
  { value: "is_not_empty", label: "is not empty" },
  { value: "greater_than", label: "greater than" },
  { value: "less_than", label: "less than" },
];

function QuestionEditor({
  question,
  questions,
  onUpdate,
  onDelete,
}: {
  question: Question;
  questions: Question[];
  onUpdate: (data: Partial<Question>) => void;
  onDelete: () => void;
}) {
  const [localTitle, setLocalTitle] = useState(question.title);
  const [localDesc, setLocalDesc] = useState(question.description ?? "");
  const [showLogic, setShowLogic] = useState(false);
  const [options, setOptions] = useState<string[]>(question.options ?? []);
  const [logic, setLogic] = useState<LogicRule[]>((question.logic as LogicRule[]) ?? []);
  const [newOption, setNewOption] = useState("");

  const hasOptions = ["multiple_choice", "checkbox", "dropdown", "ranking"].includes(question.type);
  const isOpinionScale = question.type === "opinion_scale";

  const handleBlurTitle = () => { if (localTitle !== question.title) onUpdate({ title: localTitle }); };
  const handleBlurDesc = () => { if (localDesc !== (question.description ?? "")) onUpdate({ description: localDesc }); };

  const addOption = () => {
    if (!newOption.trim()) return;
    const next = [...options, newOption.trim()];
    setOptions(next); setNewOption("");
    onUpdate({ options: next });
  };

  const removeOption = (idx: number) => {
    const next = options.filter((_, i) => i !== idx);
    setOptions(next); onUpdate({ options: next });
  };

  const addLogicRule = () => {
    const next = [...logic, { condition: "equals", value: "", jumpToQuestionId: null, jumpToEnd: false }];
    setLogic(next); onUpdate({ logic: next });
  };

  const updateLogicRule = (idx: number, rule: Partial<LogicRule>) => {
    const next = logic.map((r, i) => i === idx ? { ...r, ...rule } : r);
    setLogic(next); onUpdate({ logic: next });
  };

  const removeLogicRule = (idx: number) => {
    const next = logic.filter((_, i) => i !== idx);
    setLogic(next); onUpdate({ logic: next });
  };

  // Opinion scale config helpers
  const scaleMin = options[0] ?? "1";
  const scaleMax = options[1] ?? "10";
  const scaleLow = options[2] ?? "";
  const scaleHigh = options[3] ?? "";

  const updateScaleOptions = (min: string, max: string, low: string, high: string) => {
    const next = [min, max, low, high];
    setOptions(next); onUpdate({ options: next });
  };

  const typeInfo = ALL_TYPES.find(t => t.type === question.type);
  const TypeIcon = typeInfo?.icon ?? Type;

  return (
    <div className="p-5 space-y-5 max-w-2xl">
      {/* Header */}
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1.5 px-2.5 py-1 bg-primary/10 text-primary rounded-full text-xs font-medium">
          <TypeIcon className="w-3 h-3" />
          {typeInfo?.label}
        </div>
        <button
          onClick={onDelete}
          className="ml-auto p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
          data-testid="button-delete-question"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {/* Title */}
      <div>
        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider block mb-1.5">Question</label>
        <input
          type="text"
          value={localTitle}
          onChange={(e) => setLocalTitle(e.target.value)}
          onBlur={handleBlurTitle}
          className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          data-testid="input-question-title"
        />
      </div>

      {/* Description */}
      <div>
        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider block mb-1.5">Description</label>
        <input
          type="text"
          value={localDesc}
          onChange={(e) => setLocalDesc(e.target.value)}
          onBlur={handleBlurDesc}
          placeholder="Optional hint text..."
          className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          data-testid="input-question-description"
        />
      </div>

      {/* Required */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => onUpdate({ required: !question.required })}
          className={cn("relative w-9 h-5 rounded-full transition-colors", question.required ? "bg-primary" : "bg-muted")}
          data-testid="toggle-required"
        >
          <div className={cn("absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform", question.required ? "translate-x-4" : "translate-x-0.5")} />
        </button>
        <span className="text-sm text-foreground">Required</span>
      </div>

      {/* Options for choice questions */}
      {hasOptions && (
        <div>
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider block mb-2">
            {question.type === "ranking" ? "Items to rank" : "Options"}
          </label>
          <div className="space-y-1.5 mb-2">
            {options.map((opt, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <span className="w-5 h-5 flex items-center justify-center text-xs text-muted-foreground">{idx + 1}</span>
                <span className="flex-1 px-3 py-1.5 bg-muted rounded-md text-sm">{opt}</span>
                <button onClick={() => removeOption(idx)} className="p-1 rounded text-muted-foreground hover:text-destructive" data-testid={`button-remove-option-${idx}`}>
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={newOption}
              onChange={(e) => setNewOption(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addOption()}
              placeholder={question.type === "ranking" ? "Add item..." : "Add option..."}
              className="flex-1 px-3 py-1.5 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              data-testid="input-new-option"
            />
            <button onClick={addOption} className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-sm hover:bg-primary/90 transition-colors" data-testid="button-add-option">Add</button>
          </div>
        </div>
      )}

      {/* Opinion scale settings */}
      {isOpinionScale && (
        <div className="space-y-3">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider block">Scale Settings</label>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Min value</label>
              <input
                type="number"
                value={scaleMin}
                onChange={(e) => updateScaleOptions(e.target.value, scaleMax, scaleLow, scaleHigh)}
                className="w-full px-3 py-1.5 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                data-testid="input-scale-min"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Max value</label>
              <input
                type="number"
                value={scaleMax}
                onChange={(e) => updateScaleOptions(scaleMin, e.target.value, scaleLow, scaleHigh)}
                className="w-full px-3 py-1.5 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                data-testid="input-scale-max"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Low label</label>
              <input
                type="text"
                value={scaleLow}
                onChange={(e) => updateScaleOptions(scaleMin, scaleMax, e.target.value, scaleHigh)}
                placeholder="Not likely"
                className="w-full px-3 py-1.5 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                data-testid="input-scale-low-label"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">High label</label>
              <input
                type="text"
                value={scaleHigh}
                onChange={(e) => updateScaleOptions(scaleMin, scaleMax, scaleLow, e.target.value)}
                placeholder="Very likely"
                className="w-full px-3 py-1.5 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                data-testid="input-scale-high-label"
              />
            </div>
          </div>
          {/* Preview */}
          <div className="p-3 bg-muted/50 rounded-lg">
            <p className="text-xs text-muted-foreground mb-2">Preview</p>
            <div className="flex gap-1.5 flex-wrap">
              {Array.from({ length: parseInt(scaleMax) - parseInt(scaleMin) + 1 }, (_, i) => parseInt(scaleMin) + i).map(n => (
                <div key={n} className="w-9 h-9 rounded-lg border-2 border-border text-xs font-semibold flex items-center justify-center text-foreground">{n}</div>
              ))}
            </div>
            {(scaleLow || scaleHigh) && (
              <div className="flex justify-between mt-1.5">
                <span className="text-xs text-muted-foreground">{scaleLow}</span>
                <span className="text-xs text-muted-foreground">{scaleHigh}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Conditional logic */}
      <div>
        <button
          onClick={() => setShowLogic(!showLogic)}
          className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
          data-testid="button-toggle-logic"
        >
          {showLogic ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
          Conditional Logic {logic.length > 0 && `(${logic.length})`}
        </button>

        {showLogic && (
          <div className="mt-3 space-y-3">
            {logic.map((rule, idx) => (
              <div key={idx} className="p-3 bg-muted/50 rounded-lg space-y-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs text-muted-foreground">If answer</span>
                  <select
                    value={rule.condition}
                    onChange={(e) => updateLogicRule(idx, { condition: e.target.value })}
                    className="px-2 py-1 rounded-md border border-input bg-background text-xs focus:outline-none"
                    data-testid={`select-condition-${idx}`}
                  >
                    {CONDITIONS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                  </select>
                  {!["is_empty", "is_not_empty"].includes(rule.condition) && (
                    <input
                      type="text"
                      value={rule.value ?? ""}
                      onChange={(e) => updateLogicRule(idx, { value: e.target.value })}
                      placeholder="value"
                      className="flex-1 min-w-16 px-2 py-1 rounded-md border border-input bg-background text-xs focus:outline-none"
                      data-testid={`input-condition-value-${idx}`}
                    />
                  )}
                  <button onClick={() => removeLogicRule(idx)} className="text-muted-foreground hover:text-destructive" data-testid={`button-remove-rule-${idx}`}>
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Jump to</span>
                  <select
                    value={rule.jumpToEnd ? "__end__" : rule.jumpToQuestionId ?? ""}
                    onChange={(e) => {
                      if (e.target.value === "__end__") updateLogicRule(idx, { jumpToEnd: true, jumpToQuestionId: null });
                      else updateLogicRule(idx, { jumpToEnd: false, jumpToQuestionId: e.target.value || null });
                    }}
                    className="flex-1 px-2 py-1 rounded-md border border-input bg-background text-xs focus:outline-none"
                    data-testid={`select-jump-${idx}`}
                  >
                    <option value="">Next question</option>
                    {questions.filter(q => q.id !== question.id).map(q => (
                      <option key={q.id} value={q.id}>Q{q.order + 1}: {q.title.slice(0, 30)}</option>
                    ))}
                    <option value="__end__">End of form</option>
                  </select>
                </div>
              </div>
            ))}
            <button onClick={addLogicRule} className="text-xs text-primary hover:underline font-medium" data-testid="button-add-logic-rule">
              + Add rule
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function FormBuilder() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: form } = useGetForm(id, { query: { queryKey: getGetFormQueryKey(id) } });
  const { data: questionsData, isLoading } = useListQuestions(id, { query: { queryKey: getListQuestionsQueryKey(id) } });

  const questions = (questionsData || []) as Question[];
  const sortedQuestions = [...questions].sort((a, b) => a.order - b.order);

  const createQuestion = useCreateQuestion();
  const updateQuestion = useUpdateQuestion();
  const deleteQuestion = useDeleteQuestion();
  const reorderQuestions = useReorderQuestions();

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);

  const selectedQuestion = sortedQuestions.find(q => q.id === selectedId) ?? null;

  const getDefaultOptions = (type: QuestionType): string[] | undefined => {
    if (["multiple_choice", "checkbox", "dropdown"].includes(type)) return ["Option 1", "Option 2", "Option 3"];
    if (type === "ranking") return ["Item 1", "Item 2", "Item 3"];
    if (type === "opinion_scale") return ["1", "10", "Not likely", "Very likely"];
    return undefined;
  };

  const handleAddQuestion = (type: QuestionType) => {
    const typeInfo = ALL_TYPES.find(t => t.type === type);
    createQuestion.mutate(
      {
        id,
        data: {
          type: type as any,
          title: `New ${typeInfo?.label ?? "Question"}`,
          required: false,
          options: getDefaultOptions(type),
        },
      },
      {
        onSuccess: (q) => {
          queryClient.invalidateQueries({ queryKey: getListQuestionsQueryKey(id) });
          setSelectedId(q.id);
        },
      }
    );
  };

  const handleUpdate = (questionId: string, data: Partial<Question>) => {
    updateQuestion.mutate(
      { formId: id, questionId, data: data as any },
      { onSuccess: () => queryClient.invalidateQueries({ queryKey: getListQuestionsQueryKey(id) }) }
    );
  };

  const handleDelete = (questionId: string) => {
    if (!confirm("Delete this question?")) return;
    deleteQuestion.mutate(
      { formId: id, questionId },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListQuestionsQueryKey(id) });
          if (selectedId === questionId) setSelectedId(null);
        },
      }
    );
  };

  const handleDragStart = (e: React.DragEvent, qId: string) => {
    setDraggingId(qId);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    if (!draggingId || draggingId === targetId) { setDraggingId(null); setDragOverId(null); return; }
    const newOrder = [...sortedQuestions];
    const fromIdx = newOrder.findIndex(q => q.id === draggingId);
    const toIdx = newOrder.findIndex(q => q.id === targetId);
    const [moved] = newOrder.splice(fromIdx, 1);
    newOrder.splice(toIdx, 0, moved);
    reorderQuestions.mutate(
      { id, data: { questionIds: newOrder.map(q => q.id) } },
      { onSuccess: () => queryClient.invalidateQueries({ queryKey: getListQuestionsQueryKey(id) }) }
    );
    setDraggingId(null); setDragOverId(null);
  };

  return (
    <FormLayout formId={id} formTitle={form?.title}>
      <div className="flex h-full overflow-hidden">
        {/* ── Left Panel ─────────────────────────────────────── */}
        <div className="w-72 flex-shrink-0 border-r border-border flex flex-col bg-sidebar overflow-hidden">
          {/* Question list */}
          <div className="flex-1 overflow-auto p-3 space-y-1">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-2 mb-2">
              Questions {sortedQuestions.length > 0 && `(${sortedQuestions.length})`}
            </p>

            {isLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map(i => <div key={i} className="h-14 bg-muted/50 rounded-lg animate-pulse" />)}
              </div>
            ) : sortedQuestions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-xs px-4">
                Pick a question type below to get started
              </div>
            ) : (
              sortedQuestions.map((q, idx) => {
                const TypeIcon = ALL_TYPES.find(t => t.type === q.type)?.icon ?? Type;
                return (
                  <div
                    key={q.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, q.id)}
                    onDragOver={(e) => { e.preventDefault(); setDragOverId(q.id); }}
                    onDrop={(e) => handleDrop(e, q.id)}
                    onDragEnd={() => { setDraggingId(null); setDragOverId(null); }}
                    onClick={() => setSelectedId(q.id)}
                    className={cn(
                      "flex items-center gap-2 px-2 py-2.5 rounded-lg cursor-pointer transition-all group border-2",
                      selectedId === q.id ? "bg-accent text-accent-foreground border-primary/30" : "hover:bg-muted/50 border-transparent",
                      draggingId === q.id ? "opacity-40" : "",
                      dragOverId === q.id && draggingId !== q.id ? "border-primary bg-primary/5" : ""
                    )}
                    data-testid={`question-item-${q.id}`}
                  >
                    <GripVertical className="w-3.5 h-3.5 text-muted-foreground shrink-0 opacity-0 group-hover:opacity-100 cursor-grab" />
                    <span className="w-5 text-center text-xs font-semibold text-muted-foreground shrink-0">{idx + 1}</span>
                    <TypeIcon className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                    <span className="text-sm font-medium truncate flex-1">{q.title}</span>
                    {q.required && <span className="text-primary text-xs shrink-0">*</span>}
                  </div>
                );
              })
            )}
          </div>

          {/* ── Categorized question type picker ─────────────── */}
          <div className="border-t border-border overflow-auto max-h-64 p-3 space-y-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Add Question</p>
            {QUESTION_CATEGORIES.map(cat => (
              <div key={cat.label}>
                <p className="text-[10px] font-semibold text-muted-foreground/70 uppercase tracking-wider mb-1 px-1">{cat.label}</p>
                <div className="grid grid-cols-2 gap-0.5">
                  {cat.types.map(({ type, label, icon: Icon }) => (
                    <button
                      key={type}
                      onClick={() => handleAddQuestion(type)}
                      disabled={createQuestion.isPending}
                      className="flex items-center gap-1.5 px-2 py-1.5 rounded-md hover:bg-accent text-xs text-muted-foreground hover:text-accent-foreground transition-colors text-left disabled:opacity-50"
                      data-testid={`add-question-${type}`}
                    >
                      <Icon className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">{label}</span>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Right Panel: Editor ─────────────────────────────── */}
        <div className="flex-1 overflow-auto">
          {selectedQuestion ? (
            <QuestionEditor
              key={selectedQuestion.id}
              question={selectedQuestion}
              questions={sortedQuestions}
              onUpdate={(data) => handleUpdate(selectedQuestion.id, data)}
              onDelete={() => handleDelete(selectedQuestion.id)}
            />
          ) : (
            <div className="h-full flex items-center justify-center text-center p-8">
              <div>
                <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center mx-auto mb-4">
                  <Plus className="w-6 h-6 text-muted-foreground" />
                </div>
                <p className="text-sm font-medium text-foreground mb-1">No question selected</p>
                <p className="text-xs text-muted-foreground">Select a question on the left or add one.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </FormLayout>
  );
}
