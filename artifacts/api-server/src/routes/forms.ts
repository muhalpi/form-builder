import { Router, type IRouter } from "express";
import { and, count, db, eq, formsTable, questionsTable, responsesTable, sql } from "@workspace/db";
import {
  CreateFormBody,
  UpdateFormBody,
  GetFormParams,
  UpdateFormParams,
  DeleteFormParams,
  PublishFormParams,
  PublishFormBody,
  ListQuestionsParams,
  CreateQuestionParams,
  CreateQuestionBody,
  ReorderQuestionsParams,
  ReorderQuestionsBody,
  UpdateQuestionParams,
  UpdateQuestionBody,
  DeleteQuestionParams,
} from "@workspace/api-zod";
import { requireAuth } from "../middlewares/auth";

const router: IRouter = Router();

function mapQuestion(q: typeof questionsTable.$inferSelect) {
  return {
    ...q,
    options: q.options ?? null,
    logic: (q.logic as any[]) ?? null,
  };
}

async function getFormWithCounts(id: string, userId?: string) {
  const [formRow] = await db
    .select({
      id: formsTable.id,
      title: formsTable.title,
      description: formsTable.description,
      themeColor: formsTable.themeColor,
      isPublished: formsTable.isPublished,
      createdAt: formsTable.createdAt,
      updatedAt: formsTable.updatedAt,
      questionCount: sql<number>`cast(count(distinct ${questionsTable.id}) as int)`,
      responseCount: sql<number>`cast(count(distinct ${responsesTable.id}) as int)`,
    })
    .from(formsTable)
    .leftJoin(questionsTable, eq(questionsTable.formId, formsTable.id))
    .leftJoin(responsesTable, eq(responsesTable.formId, formsTable.id))
    .where(userId ? and(eq(formsTable.id, id), eq(formsTable.userId, userId)) : eq(formsTable.id, id))
    .groupBy(formsTable.id);

  return formRow;
}

async function getOwnedFormId(id: string, userId: string) {
  const [form] = await db
    .select({ id: formsTable.id })
    .from(formsTable)
    .where(and(eq(formsTable.id, id), eq(formsTable.userId, userId)));

  return form;
}

// GET /forms
router.get("/forms", requireAuth, async (req, res): Promise<void> => {
  const userId = req.auth!.user.id;
  const forms = await db
    .select({
      id: formsTable.id,
      title: formsTable.title,
      description: formsTable.description,
      themeColor: formsTable.themeColor,
      isPublished: formsTable.isPublished,
      createdAt: formsTable.createdAt,
      updatedAt: formsTable.updatedAt,
      questionCount: sql<number>`cast(count(distinct ${questionsTable.id}) as int)`,
      responseCount: sql<number>`cast(count(distinct ${responsesTable.id}) as int)`,
    })
    .from(formsTable)
    .leftJoin(questionsTable, eq(questionsTable.formId, formsTable.id))
    .leftJoin(responsesTable, eq(responsesTable.formId, formsTable.id))
    .where(eq(formsTable.userId, userId))
    .groupBy(formsTable.id)
    .orderBy(sql`${formsTable.updatedAt} desc`);

  res.json(forms);
});

// POST /forms
router.post("/forms", requireAuth, async (req, res): Promise<void> => {
  const parsed = CreateFormBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [form] = await db.insert(formsTable).values({
    userId: req.auth!.user.id,
    title: parsed.data.title,
    description: parsed.data.description,
    themeColor: parsed.data.themeColor ?? "#6366f1",
  }).returning();

  const result = { ...form, questionCount: 0, responseCount: 0 };
  res.status(201).json(result);
});

// GET /forms/:id
router.get("/forms/:id", requireAuth, async (req, res): Promise<void> => {
  const params = GetFormParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const formRow = await getFormWithCounts(params.data.id, req.auth!.user.id);

  if (!formRow) {
    res.status(404).json({ error: "Form not found" });
    return;
  }

  const questions = await db
    .select()
    .from(questionsTable)
    .where(eq(questionsTable.formId, params.data.id))
    .orderBy(questionsTable.order);

  const mappedQuestions = questions.map(mapQuestion);

  res.json({ ...formRow, questions: mappedQuestions });
});

// GET /public/forms/:id
router.get("/public/forms/:id", async (req, res): Promise<void> => {
  const params = GetFormParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const formRow = await getFormWithCounts(params.data.id);

  if (!formRow || !formRow.isPublished) {
    res.status(404).json({ error: "Form not found" });
    return;
  }

  const questions = await db
    .select()
    .from(questionsTable)
    .where(eq(questionsTable.formId, params.data.id))
    .orderBy(questionsTable.order);

  res.json({ ...formRow, questions: questions.map(mapQuestion) });
});

// PUT /forms/:id
router.put("/forms/:id", requireAuth, async (req, res): Promise<void> => {
  const params = UpdateFormParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateFormBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const updateData: Record<string, unknown> = {};
  if (parsed.data.title !== undefined) updateData.title = parsed.data.title;
  if (parsed.data.description !== undefined) updateData.description = parsed.data.description;
  if (parsed.data.themeColor !== undefined) updateData.themeColor = parsed.data.themeColor;
  if (parsed.data.isPublished !== undefined) updateData.isPublished = parsed.data.isPublished;

  const [updated] = await db
    .update(formsTable)
    .set(updateData)
    .where(and(eq(formsTable.id, params.data.id), eq(formsTable.userId, req.auth!.user.id)))
    .returning();

  if (!updated) {
    res.status(404).json({ error: "Form not found" });
    return;
  }

  const [qCount] = await db.select({ count: count() }).from(questionsTable).where(eq(questionsTable.formId, updated.id));
  const [rCount] = await db.select({ count: count() }).from(responsesTable).where(eq(responsesTable.formId, updated.id));

  res.json({ ...updated, questionCount: qCount.count, responseCount: rCount.count });
});

// DELETE /forms/:id
router.delete("/forms/:id", requireAuth, async (req, res): Promise<void> => {
  const params = DeleteFormParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [deleted] = await db
    .delete(formsTable)
    .where(and(eq(formsTable.id, params.data.id), eq(formsTable.userId, req.auth!.user.id)))
    .returning();
  if (!deleted) {
    res.status(404).json({ error: "Form not found" });
    return;
  }

  res.sendStatus(204);
});

// POST /forms/:id/publish
router.post("/forms/:id/publish", requireAuth, async (req, res): Promise<void> => {
  const params = PublishFormParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = PublishFormBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [updated] = await db
    .update(formsTable)
    .set({ isPublished: parsed.data.published })
    .where(and(eq(formsTable.id, params.data.id), eq(formsTable.userId, req.auth!.user.id)))
    .returning();

  if (!updated) {
    res.status(404).json({ error: "Form not found" });
    return;
  }

  const [qCount] = await db.select({ count: count() }).from(questionsTable).where(eq(questionsTable.formId, updated.id));
  const [rCount] = await db.select({ count: count() }).from(responsesTable).where(eq(responsesTable.formId, updated.id));

  res.json({ ...updated, questionCount: qCount.count, responseCount: rCount.count });
});

// POST /forms/:id/duplicate
router.post("/forms/:id/duplicate", requireAuth, async (req, res): Promise<void> => {
  const params = GetFormParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [original] = await db
    .select()
    .from(formsTable)
    .where(and(eq(formsTable.id, params.data.id), eq(formsTable.userId, req.auth!.user.id)));
  if (!original) {
    res.status(404).json({ error: "Form not found" });
    return;
  }

  const [copy] = await db.insert(formsTable).values({
    userId: req.auth!.user.id,
    title: `${original.title} (Copy)`,
    description: original.description,
    themeColor: original.themeColor,
    isPublished: false,
  }).returning();

  const originalQuestions = await db
    .select()
    .from(questionsTable)
    .where(eq(questionsTable.formId, params.data.id))
    .orderBy(questionsTable.order);

  if (originalQuestions.length > 0) {
    await db.insert(questionsTable).values(
      originalQuestions.map((q) => ({
        formId: copy.id,
        type: q.type,
        title: q.title,
        description: q.description,
        required: q.required,
        order: q.order,
        options: q.options,
        logic: q.logic,
      }))
    );
  }

  res.status(201).json({ ...copy, questionCount: originalQuestions.length, responseCount: 0 });
});

// GET /forms/:id/questions
router.get("/forms/:id/questions", requireAuth, async (req, res): Promise<void> => {
  const params = ListQuestionsParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const form = await getOwnedFormId(params.data.id, req.auth!.user.id);
  if (!form) {
    res.status(404).json({ error: "Form not found" });
    return;
  }

  const questions = await db
    .select()
    .from(questionsTable)
    .where(eq(questionsTable.formId, params.data.id))
    .orderBy(questionsTable.order);

  res.json(questions.map(mapQuestion));
});

// POST /forms/:id/questions
router.post("/forms/:id/questions", requireAuth, async (req, res): Promise<void> => {
  const params = CreateQuestionParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = CreateQuestionBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [form] = await db
    .select({ id: formsTable.id })
    .from(formsTable)
    .where(and(eq(formsTable.id, params.data.id), eq(formsTable.userId, req.auth!.user.id)));

  if (!form) {
    res.status(404).json({ error: "Form not found" });
    return;
  }

  const [maxOrderRow] = await db
    .select({ maxOrder: sql<number>`coalesce(max(${questionsTable.order}), -1)` })
    .from(questionsTable)
    .where(eq(questionsTable.formId, params.data.id));

  const nextOrder = (maxOrderRow?.maxOrder ?? -1) + 1;

  const [question] = await db.insert(questionsTable).values({
    formId: params.data.id,
    type: parsed.data.type,
    title: parsed.data.title,
    description: parsed.data.description ?? null,
    required: parsed.data.required ?? false,
    order: nextOrder,
    options: parsed.data.options ?? null,
    logic: parsed.data.logic ?? null,
  }).returning();

  res.status(201).json(mapQuestion(question));
});

// POST /forms/:id/questions/reorder
router.post("/forms/:id/questions/reorder", requireAuth, async (req, res): Promise<void> => {
  const params = ReorderQuestionsParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = ReorderQuestionsBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const form = await getOwnedFormId(params.data.id, req.auth!.user.id);
  if (!form) {
    res.status(404).json({ error: "Form not found" });
    return;
  }

  const currentQuestions = await db
    .select({ id: questionsTable.id })
    .from(questionsTable)
    .where(eq(questionsTable.formId, params.data.id));

  const currentIds = new Set(currentQuestions.map((q) => q.id));
  const requestedIds = parsed.data.questionIds;
  const uniqueRequestedIds = new Set(requestedIds);

  if (
    requestedIds.length !== currentQuestions.length ||
    uniqueRequestedIds.size !== requestedIds.length ||
    requestedIds.some((id) => !currentIds.has(id))
  ) {
    res.status(400).json({ error: "questionIds must exactly match this form's questions" });
    return;
  }

  for (let i = 0; i < requestedIds.length; i++) {
    await db
      .update(questionsTable)
      .set({ order: i })
      .where(
        and(
          eq(questionsTable.formId, params.data.id),
          eq(questionsTable.id, requestedIds[i]),
        ),
      );
  }

  const questions = await db
    .select()
    .from(questionsTable)
    .where(eq(questionsTable.formId, params.data.id))
    .orderBy(questionsTable.order);

  res.json(questions.map(mapQuestion));
});

// PUT /forms/:formId/questions/:questionId
router.put("/forms/:formId/questions/:questionId", requireAuth, async (req, res): Promise<void> => {
  const params = UpdateQuestionParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateQuestionBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const form = await getOwnedFormId(params.data.formId, req.auth!.user.id);
  if (!form) {
    res.status(404).json({ error: "Form not found" });
    return;
  }

  const updateData: Record<string, unknown> = {};
  if (parsed.data.type !== undefined) updateData.type = parsed.data.type;
  if (parsed.data.title !== undefined) updateData.title = parsed.data.title;
  if (parsed.data.description !== undefined) updateData.description = parsed.data.description;
  if (parsed.data.required !== undefined) updateData.required = parsed.data.required;
  if (parsed.data.options !== undefined) updateData.options = parsed.data.options;
  if (parsed.data.logic !== undefined) updateData.logic = parsed.data.logic;

  const [updated] = await db
    .update(questionsTable)
    .set(updateData)
    .where(
      and(
        eq(questionsTable.formId, params.data.formId),
        eq(questionsTable.id, params.data.questionId),
      ),
    )
    .returning();

  if (!updated) {
    res.status(404).json({ error: "Question not found" });
    return;
  }

  res.json(mapQuestion(updated));
});

// DELETE /forms/:formId/questions/:questionId
router.delete("/forms/:formId/questions/:questionId", requireAuth, async (req, res): Promise<void> => {
  const params = DeleteQuestionParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const form = await getOwnedFormId(params.data.formId, req.auth!.user.id);
  if (!form) {
    res.status(404).json({ error: "Form not found" });
    return;
  }

  const [deleted] = await db
    .delete(questionsTable)
    .where(
      and(
        eq(questionsTable.formId, params.data.formId),
        eq(questionsTable.id, params.data.questionId),
      ),
    )
    .returning();

  if (!deleted) {
    res.status(404).json({ error: "Question not found" });
    return;
  }

  res.sendStatus(204);
});

export default router;
