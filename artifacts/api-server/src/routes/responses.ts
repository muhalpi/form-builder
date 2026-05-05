import { Router, type IRouter } from "express";
import { eq, count, sql, and } from "drizzle-orm";
import { db, responsesTable, answersTable, questionsTable, formsTable } from "@workspace/db";
import {
  ListResponsesParams,
  ListResponsesQueryParams,
  SubmitResponseParams,
  SubmitResponseBody,
  GetResponseParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

// GET /forms/:id/responses
router.get("/forms/:id/responses", async (req, res): Promise<void> => {
  const params = ListResponsesParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const query = ListResponsesQueryParams.safeParse(req.query);
  const page = query.success ? (query.data.page ?? 1) : 1;
  const limit = query.success ? (query.data.limit ?? 20) : 20;
  const offset = (page - 1) * limit;

  const [totalRow] = await db
    .select({ count: count() })
    .from(responsesTable)
    .where(eq(responsesTable.formId, params.data.id));

  const total = totalRow.count;

  const responses = await db
    .select()
    .from(responsesTable)
    .where(eq(responsesTable.formId, params.data.id))
    .orderBy(sql`${responsesTable.submittedAt} desc`)
    .limit(limit)
    .offset(offset);

  const data = await Promise.all(
    responses.map(async (r) => {
      const answers = await db
        .select()
        .from(answersTable)
        .where(eq(answersTable.responseId, r.id));
      return { ...r, answers };
    })
  );

  res.json({
    data,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  });
});

// POST /forms/:id/responses
router.post("/forms/:id/responses", async (req, res): Promise<void> => {
  const params = SubmitResponseParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = SubmitResponseBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [form] = await db.select().from(formsTable).where(eq(formsTable.id, params.data.id));
  if (!form) {
    res.status(404).json({ error: "Form not found" });
    return;
  }

  const [response] = await db.insert(responsesTable).values({
    formId: params.data.id,
    completed: parsed.data.completed ?? true,
  }).returning();

  if (parsed.data.answers && parsed.data.answers.length > 0) {
    const questions = await db
      .select()
      .from(questionsTable)
      .where(eq(questionsTable.formId, params.data.id));

    const questionMap = new Map(questions.map((q) => [q.id, q]));

    await db.insert(answersTable).values(
      parsed.data.answers.map((a) => ({
        responseId: response.id,
        questionId: a.questionId,
        questionTitle: questionMap.get(a.questionId)?.title ?? "",
        value: a.value ?? null,
      }))
    );
  }

  res.status(201).json(response);
});

// GET /forms/:formId/responses/:responseId
router.get("/forms/:formId/responses/:responseId", async (req, res): Promise<void> => {
  const params = GetResponseParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [response] = await db
    .select()
    .from(responsesTable)
    .where(
      and(
        eq(responsesTable.id, params.data.responseId),
        eq(responsesTable.formId, params.data.formId)
      )
    );

  if (!response) {
    res.status(404).json({ error: "Response not found" });
    return;
  }

  const answers = await db
    .select()
    .from(answersTable)
    .where(eq(answersTable.responseId, response.id));

  res.json({ ...response, answers });
});

export default router;
