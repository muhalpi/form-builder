import { useParams } from "wouter";
import { useState } from "react";
import {
  Type, AlignLeft, List, CheckSquare, ChevronDown as DropdownIcon,
  Star, Calendar, Mail, Phone, Hash, ToggleLeft, BarChart2, ArrowUpDown,
  Plus, GripVertical, Trash2, ChevronDown, ChevronRight, X, Ellipsis, Copy
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
import { useLang } from "@/contexts/LangContext";
import { t } from "@/lib/i18n";
import type { Lang } from "@/lib/i18n";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

type QuestionType =
  | "short_text" | "long_text"
  | "multiple_choice" | "checkbox" | "dropdown" | "ranking"
  | "rating" | "opinion_scale"
  | "date" | "email" | "phone" | "number" | "yes_no";

interface QuestionTypeDef {
  type: QuestionType;
  labelKey: keyof ReturnType<typeof buildI18nData>["types"];
  descKey: keyof ReturnType<typeof buildI18nData>["types"];
  icon: any;
}

function buildI18nData(lang: Lang) {
  return {
    categories: [
      {
        labelKey: "catText" as const,
        types: [
          { type: "long_text" as QuestionType, labelKey: "typeLongText" as const, descKey: "descMultiLine" as const, icon: AlignLeft },
          { type: "short_text" as QuestionType, labelKey: "typeShortText" as const, descKey: "descSingleLine" as const, icon: Type },
        ],
      },
      {
        labelKey: "catChoice" as const,
        types: [
          { type: "multiple_choice" as QuestionType, labelKey: "typeMultipleChoice" as const, descKey: "descPickOne" as const, icon: List },
          { type: "checkbox" as QuestionType, labelKey: "typeCheckbox" as const, descKey: "descPickMany" as const, icon: CheckSquare },
          { type: "dropdown" as QuestionType, labelKey: "typeDropdown" as const, descKey: "descSelectFromList" as const, icon: DropdownIcon },
          { type: "yes_no" as QuestionType, labelKey: "typeYesNo" as const, descKey: "descBinaryChoice" as const, icon: ToggleLeft },
        ],
      },
      {
        labelKey: "catScaleRanking" as const,
        types: [
          { type: "opinion_scale" as QuestionType, labelKey: "typeOpinionScale" as const, descKey: "descNumericScale" as const, icon: BarChart2 },
          { type: "rating" as QuestionType, labelKey: "typeRating" as const, descKey: "descStars" as const, icon: Star },
          { type: "ranking" as QuestionType, labelKey: "typeRanking" as const, descKey: "descDragToRank" as const, icon: ArrowUpDown },
        ],
      },
      {
        labelKey: "catContactInfo" as const,
        types: [
          { type: "email" as QuestionType, labelKey: "typeEmail" as const, descKey: "descEmailAddress" as const, icon: Mail },
          { type: "phone" as QuestionType, labelKey: "typePhone" as const, descKey: "descPhoneNumber" as const, icon: Phone },
        ],
      },
      {
        labelKey: "catOther" as const,
        types: [
          { type: "number" as QuestionType, labelKey: "typeNumber" as const, descKey: "descNumericInput" as const, icon: Hash },
          { type: "date" as QuestionType, labelKey: "typeDate" as const, descKey: "descDatePicker" as const, icon: Calendar },
        ],
      },
    ],
    types: {
      catText: "", catChoice: "", catScaleRanking: "", catContactInfo: "", catOther: "",
      typeLongText: "", typeShortText: "", typeMultipleChoice: "", typeCheckbox: "",
      typeDropdown: "", typeYesNo: "", typeOpinionScale: "", typeRating: "", typeRanking: "",
      typeEmail: "", typePhone: "", typeNumber: "", typeDate: "",
      descMultiLine: "", descSingleLine: "", descPickOne: "", descPickMany: "",
      descSelectFromList: "", descBinaryChoice: "", descNumericScale: "", descStars: "",
      descDragToRank: "", descEmailAddress: "", descPhoneNumber: "", descNumericInput: "", descDatePicker: "",
    },
  };
}

const TYPE_LABEL_KEYS: Record<string, keyof ReturnType<typeof buildI18nData>["types"]> = {
  long_text: "typeLongText", short_text: "typeShortText",
  multiple_choice: "typeMultipleChoice", checkbox: "typeCheckbox",
  dropdown: "typeDropdown", yes_no: "typeYesNo",
  opinion_scale: "typeOpinionScale", rating: "typeRating", ranking: "typeRanking",
  email: "typeEmail", phone: "typePhone", number: "typeNumber", date: "typeDate",
};

const TYPE_ICON_MAP: Record<string, any> = {
  long_text: AlignLeft, short_text: Type, multiple_choice: List,
  checkbox: CheckSquare, dropdown: DropdownIcon, yes_no: ToggleLeft,
  opinion_scale: BarChart2, rating: Star, ranking: ArrowUpDown,
  email: Mail, phone: Phone, number: Hash, date: Calendar,
};

function buildAutoQuestionTitles(questionType: string): string[] {
  const typeLabelKey = TYPE_LABEL_KEYS[questionType];
  if (!typeLabelKey) return [];

  const enTypeLabel = t("en", typeLabelKey as any);
  const idTypeLabel = t("id", typeLabelKey as any);
  const enPrefix = t("en", "newQuestionPrefix");
  const idPrefix = t("id", "newQuestionPrefix");

  return [
    `${enPrefix} ${enTypeLabel}`,
    `${enPrefix} ${idTypeLabel}`,
    `${idPrefix} ${enTypeLabel}`,
    `${idPrefix} ${idTypeLabel}`,
    `New ${enTypeLabel}`,
    `New ${idTypeLabel}`,
    `Baru ${enTypeLabel}`,
    `Baru ${idTypeLabel}`,
  ];
}

function getDisplayQuestionTitle(question: { title: string; type: string }, lang: Lang): string {
  const autoTitles = buildAutoQuestionTitles(question.type).map((x) => x.trim());
  const currentTitle = question.title.trim();
  if (!autoTitles.includes(currentTitle)) return question.title;

  const typeLabelKey = TYPE_LABEL_KEYS[question.type];
  if (!typeLabelKey) return question.title;
  return `${t(lang, "newQuestionPrefix")} ${t(lang, typeLabelKey as any)}`;
}

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

function QuestionEditor({
  question,
  questions,
  onUpdate,
  onDelete,
  lang,
}: {
  question: Question;
  questions: Question[];
  onUpdate: (data: Partial<Question>) => void;
  onDelete: () => void;
  lang: Lang;
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

  const scaleMin = options[0] ?? "1";
  const scaleMax = options[1] ?? "10";
  const scaleLow = options[2] ?? "";
  const scaleHigh = options[3] ?? "";

  const updateScaleOptions = (min: string, max: string, low: string, high: string) => {
    const next = [min, max, low, high];
    setOptions(next); onUpdate({ options: next });
  };

  const TypeIcon = TYPE_ICON_MAP[question.type] ?? Type;
  const typeLabelKey = TYPE_LABEL_KEYS[question.type];
  const typeLabel = typeLabelKey ? t(lang, typeLabelKey as any) : question.type;

  const CONDITIONS = [
    { value: "equals", label: t(lang, "condEquals") },
    { value: "not_equals", label: t(lang, "condNotEquals") },
    { value: "contains", label: t(lang, "condContains") },
    { value: "is_empty", label: t(lang, "condIsEmpty") },
    { value: "is_not_empty", label: t(lang, "condIsNotEmpty") },
    { value: "greater_than", label: t(lang, "condGreaterThan") },
    { value: "less_than", label: t(lang, "condLessThan") },
  ];

  return (
    <div className="p-5 space-y-5 max-w-2xl">
      {/* Header */}
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1.5 px-2.5 py-1 bg-primary/10 text-primary rounded-full text-xs font-medium">
          <TypeIcon className="w-3 h-3" />
          {typeLabel}
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
        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider block mb-1.5">
          {t(lang, "questionFieldLabel")}
        </label>
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
        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider block mb-1.5">
          {t(lang, "descriptionFieldLabel")}
        </label>
        <input
          type="text"
          value={localDesc}
          onChange={(e) => setLocalDesc(e.target.value)}
          onBlur={handleBlurDesc}
          placeholder={t(lang, "optionalHint")}
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
        <span className="text-sm text-foreground">{t(lang, "requiredLabel")}</span>
      </div>

      {/* Options for choice questions */}
      {hasOptions && (
        <div>
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider block mb-2">
            {question.type === "ranking" ? t(lang, "itemsToRank") : t(lang, "optionsLabel")}
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
              placeholder={question.type === "ranking" ? t(lang, "addItemPlaceholder") : t(lang, "addOptionPlaceholder")}
              className="flex-1 px-3 py-1.5 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              data-testid="input-new-option"
            />
            <button onClick={addOption} className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-sm hover:bg-primary/90 transition-colors" data-testid="button-add-option">
              {t(lang, "addBtn")}
            </button>
          </div>
        </div>
      )}

      {/* Opinion scale settings */}
      {isOpinionScale && (
        <div className="space-y-3">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider block">
            {t(lang, "scaleSettings")}
          </label>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground block mb-1">{t(lang, "minValue")}</label>
              <input
                type="number"
                value={scaleMin}
                onChange={(e) => updateScaleOptions(e.target.value, scaleMax, scaleLow, scaleHigh)}
                className="w-full px-3 py-1.5 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                data-testid="input-scale-min"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">{t(lang, "maxValue")}</label>
              <input
                type="number"
                value={scaleMax}
                onChange={(e) => updateScaleOptions(scaleMin, e.target.value, scaleLow, scaleHigh)}
                className="w-full px-3 py-1.5 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                data-testid="input-scale-max"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">{t(lang, "lowLabelField")}</label>
              <input
                type="text"
                value={scaleLow}
                onChange={(e) => updateScaleOptions(scaleMin, scaleMax, e.target.value, scaleHigh)}
                placeholder={t(lang, "notLikely")}
                className="w-full px-3 py-1.5 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                data-testid="input-scale-low-label"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">{t(lang, "highLabelField")}</label>
              <input
                type="text"
                value={scaleHigh}
                onChange={(e) => updateScaleOptions(scaleMin, scaleMax, scaleLow, e.target.value)}
                placeholder={t(lang, "veryLikely")}
                className="w-full px-3 py-1.5 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                data-testid="input-scale-high-label"
              />
            </div>
          </div>
          <div className="p-3 bg-muted/50 rounded-lg">
            <p className="text-xs text-muted-foreground mb-2">{t(lang, "scalePreview")}</p>
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
          {t(lang, "conditionalLogic")} {logic.length > 0 && `(${logic.length})`}
        </button>

        {showLogic && (
          <div className="mt-3 space-y-3">
            {logic.map((rule, idx) => (
              <div key={idx} className="p-3 bg-muted/50 rounded-lg space-y-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs text-muted-foreground">{t(lang, "ifAnswer")}</span>
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
                      placeholder={t(lang, "valuePlaceholder")}
                      className="flex-1 min-w-16 px-2 py-1 rounded-md border border-input bg-background text-xs focus:outline-none"
                      data-testid={`input-condition-value-${idx}`}
                    />
                  )}
                  <button onClick={() => removeLogicRule(idx)} className="text-muted-foreground hover:text-destructive" data-testid={`button-remove-rule-${idx}`}>
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">{t(lang, "jumpTo")}</span>
                  <select
                    value={rule.jumpToEnd ? "__end__" : rule.jumpToQuestionId ?? ""}
                    onChange={(e) => {
                      if (e.target.value === "__end__") updateLogicRule(idx, { jumpToEnd: true, jumpToQuestionId: null });
                      else updateLogicRule(idx, { jumpToEnd: false, jumpToQuestionId: e.target.value || null });
                    }}
                    className="flex-1 px-2 py-1 rounded-md border border-input bg-background text-xs focus:outline-none"
                    data-testid={`select-jump-${idx}`}
                  >
                    <option value="">{t(lang, "nextQuestion")}</option>
                    {questions.filter(q => q.id !== question.id).map(q => (
                      <option key={q.id} value={q.id}>Q{q.order + 1}: {q.title.slice(0, 30)}</option>
                    ))}
                    <option value="__end__">{t(lang, "endOfForm")}</option>
                  </select>
                </div>
              </div>
            ))}
            <button onClick={addLogicRule} className="text-xs text-primary hover:underline font-medium" data-testid="button-add-logic-rule">
              {t(lang, "addRule")}
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
  const { lang } = useLang();

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
  const [isAddQuestionDialogOpen, setIsAddQuestionDialogOpen] = useState(false);
  const [duplicatingQuestionId, setDuplicatingQuestionId] = useState<string | null>(null);

  const selectedQuestion = sortedQuestions.find(q => q.id === selectedId) ?? null;

  const getDefaultOptions = (type: QuestionType): string[] | undefined => {
    if (["multiple_choice", "checkbox", "dropdown"].includes(type)) return ["Option 1", "Option 2", "Option 3"];
    if (type === "ranking") return ["Item 1", "Item 2", "Item 3"];
    if (type === "opinion_scale") return ["1", "10", t(lang, "notLikely"), t(lang, "veryLikely")];
    return undefined;
  };

  const handleAddQuestion = (type: QuestionType) => {
    const labelKey = TYPE_LABEL_KEYS[type];
    const typeLabel = labelKey ? t(lang, labelKey as any) : type;
    createQuestion.mutate(
      {
        id,
        data: {
          type: type as any,
          title: `${t(lang, "newQuestionPrefix")} ${typeLabel}`,
          required: false,
          options: getDefaultOptions(type),
        },
      },
      {
        onSuccess: (q) => {
          queryClient.invalidateQueries({ queryKey: getListQuestionsQueryKey(id) });
          setSelectedId(q.id);
          setIsAddQuestionDialogOpen(false);
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
    if (!confirm(t(lang, "deleteQuestionConfirm"))) return;
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

  const handleDuplicateQuestion = (question: Question) => {
    const duplicateData: any = {
      type: question.type as any,
      title: `${question.title} (${t(lang, "duplicateAction")})`,
      required: question.required,
      options: question.options ? [...question.options] : undefined,
      logic: question.logic ? question.logic.map((rule) => ({ ...rule })) : undefined,
    };

    if (question.description) {
      duplicateData.description = question.description;
    }

    setDuplicatingQuestionId(question.id);
    createQuestion.mutate(
      { id, data: duplicateData },
      {
        onSuccess: (created) => {
          queryClient.invalidateQueries({ queryKey: getListQuestionsQueryKey(id) });
          setSelectedId(created.id);
        },
        onSettled: () => {
          setDuplicatingQuestionId(null);
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

  const QUESTION_CATEGORIES = [
    {
      label: t(lang, "catText"),
      types: [
        { type: "long_text" as QuestionType, label: t(lang, "typeLongText"), icon: AlignLeft },
        { type: "short_text" as QuestionType, label: t(lang, "typeShortText"), icon: Type },
      ],
    },
    {
      label: t(lang, "catChoice"),
      types: [
        { type: "multiple_choice" as QuestionType, label: t(lang, "typeMultipleChoice"), icon: List },
        { type: "checkbox" as QuestionType, label: t(lang, "typeCheckbox"), icon: CheckSquare },
        { type: "dropdown" as QuestionType, label: t(lang, "typeDropdown"), icon: DropdownIcon },
        { type: "yes_no" as QuestionType, label: t(lang, "typeYesNo"), icon: ToggleLeft },
      ],
    },
    {
      label: t(lang, "catScaleRanking"),
      types: [
        { type: "opinion_scale" as QuestionType, label: t(lang, "typeOpinionScale"), icon: BarChart2 },
        { type: "rating" as QuestionType, label: t(lang, "typeRating"), icon: Star },
        { type: "ranking" as QuestionType, label: t(lang, "typeRanking"), icon: ArrowUpDown },
      ],
    },
    {
      label: t(lang, "catContactInfo"),
      types: [
        { type: "email" as QuestionType, label: t(lang, "typeEmail"), icon: Mail },
        { type: "phone" as QuestionType, label: t(lang, "typePhone"), icon: Phone },
      ],
    },
    {
      label: t(lang, "catOther"),
      types: [
        { type: "number" as QuestionType, label: t(lang, "typeNumber"), icon: Hash },
        { type: "date" as QuestionType, label: t(lang, "typeDate"), icon: Calendar },
      ],
    },
  ];

  return (
    <FormLayout
      formId={id}
      formTitle={form?.title}
      formResponseCount={form?.responseCount}
      formIsPublished={form?.isPublished}
    >
      <div className="flex h-full overflow-hidden">
        {/* ── Left Panel ─────────────────────────────────────── */}
        <div className="w-72 flex-shrink-0 border-r border-border flex flex-col bg-sidebar overflow-hidden">
          {/* Question list */}
          <div className="flex-1 overflow-auto p-3 space-y-1">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-2 mb-2">
              {t(lang, "questionsLabel")} {sortedQuestions.length > 0 && `(${sortedQuestions.length})`}
            </p>

            {isLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map(i => <div key={i} className="h-14 bg-muted/50 rounded-lg animate-pulse" />)}
              </div>
            ) : sortedQuestions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-xs px-4">
                {t(lang, "pickTypeHint")}
              </div>
            ) : (
              sortedQuestions.map((q, idx) => {
                const TypeIcon = TYPE_ICON_MAP[q.type] ?? Type;
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
                    <span className="text-xs leading-4 font-medium truncate flex-1">{getDisplayQuestionTitle(q, lang)}</span>
                    {q.required && <span className="text-primary text-[11px] shrink-0">*</span>}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button
                          onPointerDown={(e) => e.stopPropagation()}
                          onClick={(e) => e.stopPropagation()}
                          className={cn(
                            "w-6 h-6 rounded-md inline-flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors",
                            selectedId === q.id ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                          )}
                          data-testid={`button-question-menu-${q.id}`}
                        >
                          <Ellipsis className="w-3.5 h-3.5" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent
                        align="end"
                        className="w-44 rounded-2xl p-1.5"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <DropdownMenuItem
                          onClick={() => handleDuplicateQuestion(q)}
                          disabled={createQuestion.isPending && duplicatingQuestionId === q.id}
                          className="h-10 rounded-xl text-sm"
                          data-testid={`menu-question-duplicate-${q.id}`}
                        >
                          <Copy className="w-4 h-4" />
                          {t(lang, "duplicateAction")}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleDelete(q.id)}
                          className="h-10 rounded-xl text-sm text-destructive focus:text-destructive"
                          data-testid={`menu-question-delete-${q.id}`}
                        >
                          <Trash2 className="w-4 h-4" />
                          {t(lang, "deleteAction")}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                );
              })
            )}
          </div>

          {/* ── Categorized question type picker ─────────────── */}
          <div className="border-t border-border p-3">
            <button
              onClick={() => setIsAddQuestionDialogOpen(true)}
              disabled={createQuestion.isPending}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-60"
              data-testid="button-open-add-question-dialog"
            >
              <Plus className="w-4 h-4" />
              {t(lang, "addQuestion")}
            </button>
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
              lang={lang}
            />
          ) : (
            <div className="h-full flex items-center justify-center text-center p-8">
              <div>
                <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center mx-auto mb-4">
                  <Plus className="w-6 h-6 text-muted-foreground" />
                </div>
                <p className="text-sm font-medium text-foreground mb-1">{t(lang, "noQuestionSelected")}</p>
                <p className="text-xs text-muted-foreground">{t(lang, "selectQuestionHint")}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      <Dialog open={isAddQuestionDialogOpen} onOpenChange={setIsAddQuestionDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t(lang, "addQuestion")}</DialogTitle>
            <DialogDescription>{t(lang, "pickTypeHint")}</DialogDescription>
          </DialogHeader>

          <div className="max-h-[60vh] overflow-auto pr-1 space-y-4">
            {QUESTION_CATEGORIES.map((cat) => (
              <div key={cat.label}>
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                  {cat.label}
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {cat.types.map(({ type, label, icon: Icon }) => (
                    <button
                      key={type}
                      onClick={() => handleAddQuestion(type)}
                      disabled={createQuestion.isPending}
                      className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border bg-card hover:bg-muted text-sm text-left transition-colors disabled:opacity-50"
                      data-testid={`add-question-${type}`}
                    >
                      <Icon className="w-4 h-4 shrink-0 text-muted-foreground" />
                      <span className="truncate">{label}</span>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </FormLayout>
  );
}
