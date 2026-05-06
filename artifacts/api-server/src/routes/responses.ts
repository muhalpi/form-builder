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

// GET /forms/:id/responses/export  (CSV download — must be before /:responseId)
router.get("/forms/:id/responses/export", async (req, res): Promise<void> => {
  const formId = req.params.id;
  if (!formId) {
    res.status(400).json({ error: "Form ID required" });
    return;
  }

  const [form] = await db.select().from(formsTable).where(eq(formsTable.id, formId));
  if (!form) {
    res.status(404).json({ error: "Form not found" });
    return;
  }

  const questions = await db
    .select()
    .from(questionsTable)
    .where(eq(questionsTable.formId, formId))
    .orderBy(questionsTable.order);

  const responses = await db
    .select()
    .from(responsesTable)
    .where(eq(responsesTable.formId, formId))
    .orderBy(sql`${responsesTable.submittedAt} desc`);

  const allAnswers = responses.length > 0
    ? await db
        .select()
        .from(answersTable)
        .where(
          sql`${answersTable.responseId} = ANY(ARRAY[${sql.join(responses.map(r => sql`${r.id}::uuid`), sql`, `)}])`
        )
    : [];

  const answersByResponse = new Map<string, Map<string, string>>();
  for (const r of responses) answersByResponse.set(r.id, new Map());
  for (const a of allAnswers) {
    answersByResponse.get(a.responseId)?.set(a.questionId, a.value ?? "");
  }

  const escapeCell = (v: string) => `"${v.replace(/"/g, '""')}"`;

  const headers = [
    "Submission Date",
    "Status",
    ...questions.map(q => q.title),
  ];

  const rows = responses.map(r => {
    const answerMap = answersByResponse.get(r.id) ?? new Map<string, string>();
    return [
      new Date(r.submittedAt).toISOString(),
      r.completed ? "Completed" : "Partial",
      ...questions.map(q => answerMap.get(q.id) ?? ""),
    ].map(escapeCell).join(",");
  });

  const csv = [headers.map(escapeCell).join(","), ...rows].join("\r\n");
  const filename = `${form.title.replace(/[^a-z0-9]/gi, "_")}_responses.csv`;

  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  res.send("\uFEFF" + csv); // BOM for Excel UTF-8 compatibility
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
