import { Router, type IRouter } from "express";
import { eq, count, sql } from "drizzle-orm";
import { db, formsTable, questionsTable, responsesTable } from "@workspace/db";
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

const router: IRouter = Router();

// GET /forms
router.get("/forms", async (_req, res): Promise<void> => {
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
    .groupBy(formsTable.id)
    .orderBy(sql`${formsTable.updatedAt} desc`);

  res.json(forms);
});

// POST /forms
router.post("/forms", async (req, res): Promise<void> => {
  const parsed = CreateFormBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [form] = await db.insert(formsTable).values({
    title: parsed.data.title,
    description: parsed.data.description,
    themeColor: parsed.data.themeColor ?? "#6366f1",
  }).returning();

  const result = { ...form, questionCount: 0, responseCount: 0 };
  res.status(201).json(result);
});

// GET /forms/:id
router.get("/forms/:id", async (req, res): Promise<void> => {
  const params = GetFormParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

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
    .where(eq(formsTable.id, params.data.id))
    .groupBy(formsTable.id);

  if (!formRow) {
    res.status(404).json({ error: "Form not found" });
    return;
  }

  const questions = await db
    .select()
    .from(questionsTable)
    .where(eq(questionsTable.formId, params.data.id))
    .orderBy(questionsTable.order);

  const mappedQuestions = questions.map((q) => ({
    ...q,
    options: q.options ?? null,
    logic: (q.logic as any[]) ?? null,
  }));

  res.json({ ...formRow, questions: mappedQuestions });
});

// PUT /forms/:id
router.put("/forms/:id", async (req, res): Promise<void> => {
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
    .where(eq(formsTable.id, params.data.id))
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
router.delete("/forms/:id", async (req, res): Promise<void> => {
  const params = DeleteFormParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [deleted] = await db.delete(formsTable).where(eq(formsTable.id, params.data.id)).returning();
  if (!deleted) {
    res.status(404).json({ error: "Form not found" });
    return;
  }

  res.sendStatus(204);
});

// POST /forms/:id/publish
router.post("/forms/:id/publish", async (req, res): Promise<void> => {
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
    .where(eq(formsTable.id, params.data.id))
    .returning();

  if (!updated) {
    res.status(404).json({ error: "Form not found" });
    return;
  }

  const [qCount] = await db.select({ count: count() }).from(questionsTable).where(eq(questionsTable.formId, updated.id));
  const [rCount] = await db.select({ count: count() }).from(responsesTable).where(eq(responsesTable.formId, updated.id));

  res.json({ ...updated, questionCount: qCount.count, responseCount: rCount.count });
});

// GET /forms/:id/questions
router.get("/forms/:id/questions", async (req, res): Promise<void> => {
  const params = ListQuestionsParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const questions = await db
    .select()
    .from(questionsTable)
    .where(eq(questionsTable.formId, params.data.id))
    .orderBy(questionsTable.order);

  const mapped = questions.map((q) => ({
    ...q,
    options: q.options ?? null,
    logic: (q.logic as any[]) ?? null,
  }));

  res.json(mapped);
});

// POST /forms/:id/questions
router.post("/forms/:id/questions", async (req, res): Promise<void> => {
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

  res.status(201).json({
    ...question,
    options: question.options ?? null,
    logic: (question.logic as any[]) ?? null,
  });
});

// POST /forms/:id/questions/reorder
router.post("/forms/:id/questions/reorder", async (req, res): Promise<void> => {
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

  for (let i = 0; i < parsed.data.questionIds.length; i++) {
    await db
      .update(questionsTable)
      .set({ order: i })
      .where(eq(questionsTable.id, parsed.data.questionIds[i]));
  }

  const questions = await db
    .select()
    .from(questionsTable)
    .where(eq(questionsTable.formId, params.data.id))
    .orderBy(questionsTable.order);

  res.json(questions.map((q) => ({ ...q, options: q.options ?? null, logic: (q.logic as any[]) ?? null })));
});

// PUT /forms/:formId/questions/:questionId
router.put("/forms/:formId/questions/:questionId", async (req, res): Promise<void> => {
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
    .where(eq(questionsTable.id, params.data.questionId))
    .returning();

  if (!updated) {
    res.status(404).json({ error: "Question not found" });
    return;
  }

  res.json({ ...updated, options: updated.options ?? null, logic: (updated.logic as any[]) ?? null });
});

// DELETE /forms/:formId/questions/:questionId
router.delete("/forms/:formId/questions/:questionId", async (req, res): Promise<void> => {
  const params = DeleteQuestionParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [deleted] = await db
    .delete(questionsTable)
    .where(eq(questionsTable.id, params.data.questionId))
    .returning();

  if (!deleted) {
    res.status(404).json({ error: "Question not found" });
    return;
  }

  res.sendStatus(204);
});

export default router;
