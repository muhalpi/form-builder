import { Router, type IRouter } from "express";
import { and, count, db, eq, inArray, responsesTable, answersTable, questionsTable, formsTable, sql } from "@workspace/db";
import { createHash, randomUUID } from "node:crypto";
import {
  ListResponsesParams,
  ListResponsesQueryParams,
  SubmitResponseParams,
  SubmitResponseBody,
  GetResponseParams,
} from "@workspace/api-zod";
import { requireAuth } from "../middlewares/auth";

const router: IRouter = Router();
const RESPONDENT_COOKIE_PREFIX = "formu_respondent_";
const RESPONDENT_HEADER_NAME = "x-respondent-token";
const RESPONDENT_COOKIE_MAX_AGE_MS = 1000 * 60 * 60 * 24 * 365;
const RESPONDENT_DUPLICATE_ERROR = "Response already submitted for this form";
const RESPONDENT_UNIQUE_CONSTRAINT = "responses_form_respondent_hash_unique";

function getRespondentCookieName(formId: string): string {
  return `${RESPONDENT_COOKIE_PREFIX}${formId}`;
}

function getRespondentCookieOptions() {
  const isProduction = process.env.NODE_ENV === "production";
  const sameSite: "none" | "lax" = isProduction ? "none" : "lax";
  return {
    httpOnly: true,
    sameSite,
    secure: isProduction,
    path: "/",
    maxAge: RESPONDENT_COOKIE_MAX_AGE_MS,
  };
}

function normalizeRespondentToken(rawToken: unknown): string | null {
  if (Array.isArray(rawToken)) {
    return normalizeRespondentToken(rawToken[0]);
  }
  if (typeof rawToken !== "string") {
    return null;
  }

  const token = rawToken.split(",")[0]?.trim() ?? "";
  if (token.length < 8 || token.length > 200) {
    return null;
  }

  return token;
}

function resolveRespondentToken(
  rawCookie: unknown,
  rawHeader: unknown,
): { token: string; shouldSetCookie: boolean } {
  const cookieToken = normalizeRespondentToken(rawCookie);
  if (cookieToken) {
    return { token: cookieToken, shouldSetCookie: false };
  }

  const headerToken = normalizeRespondentToken(rawHeader);
  if (headerToken) {
    return { token: headerToken, shouldSetCookie: true };
  }

  return { token: randomUUID(), shouldSetCookie: true };
}

function hashRespondentToken(formId: string, token: string): string {
  return createHash("sha256").update(`${formId}:${token}`).digest("hex");
}

function isUniqueConstraintViolation(error: unknown, constraintName: string): boolean {
  if (!error || typeof error !== "object") return false;
  const code = (error as { code?: string }).code;
  const constraint = (error as { constraint?: string }).constraint;
  return code === "23505" && constraint === constraintName;
}

async function getOwnedFormId(id: string, userId: string) {
  const [form] = await db
    .select({ id: formsTable.id })
    .from(formsTable)
    .where(and(eq(formsTable.id, id), eq(formsTable.userId, userId)));

  return form;
}

// GET /forms/:id/responses
router.get("/forms/:id/responses", requireAuth, async (req, res): Promise<void> => {
  const params = ListResponsesParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const query = ListResponsesQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }

  const page = query.data.page ?? 1;
  const limit = query.data.limit ?? 20;
  const formId = params.data.id;

  if (!Number.isInteger(page) || page < 1 || !Number.isInteger(limit) || limit < 1 || limit > 100) {
    res.status(400).json({ error: "page must be >= 1 and limit must be between 1 and 100" });
    return;
  }

  const form = await getOwnedFormId(formId, req.auth!.user.id);
  if (!form) {
    res.status(404).json({ error: "Form not found" });
    return;
  }

  const offset = (page - 1) * limit;

  const [totalRow] = await db
    .select({ count: count() })
    .from(responsesTable)
    .where(eq(responsesTable.formId, formId));

  const total = totalRow.count;

  const responses = await db
    .select()
    .from(responsesTable)
    .where(eq(responsesTable.formId, formId))
    .orderBy(sql`${responsesTable.submittedAt} desc`)
    .limit(limit)
    .offset(offset);

  const responseIds = responses.map((r) => r.id);
  const answers = responseIds.length > 0
    ? await db.select().from(answersTable).where(inArray(answersTable.responseId, responseIds))
    : [];

  const answersByResponse = new Map<string, typeof answers>();
  for (const response of responses) {
    answersByResponse.set(response.id, []);
  }
  for (const answer of answers) {
    answersByResponse.get(answer.responseId)?.push(answer);
  }

  const data = responses.map((response) => ({
    ...response,
    answers: answersByResponse.get(response.id) ?? [],
  }));

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

  if (!form.isPublished) {
    res.status(403).json({ error: "Form is not published" });
    return;
  }

  const respondentCookieName = getRespondentCookieName(params.data.id);
  const respondentToken = resolveRespondentToken(
    req.cookies?.[respondentCookieName],
    req.headers[RESPONDENT_HEADER_NAME],
  );
  const respondentHash = hashRespondentToken(params.data.id, respondentToken.token);

  const [existingResponse] = await db
    .select({ id: responsesTable.id })
    .from(responsesTable)
    .where(
      and(
        eq(responsesTable.formId, params.data.id),
        eq(responsesTable.respondentHash, respondentHash),
      ),
    );

  if (existingResponse) {
    if (respondentToken.shouldSetCookie) {
      res.cookie(respondentCookieName, respondentToken.token, getRespondentCookieOptions());
    }

    res.status(409).json({ error: RESPONDENT_DUPLICATE_ERROR });
    return;
  }

  const questions = await db
    .select()
    .from(questionsTable)
    .where(eq(questionsTable.formId, params.data.id));

  const questionMap = new Map(questions.map((q) => [q.id, q]));
  const invalidAnswer = parsed.data.answers.find((answer) => !questionMap.has(answer.questionId));

  if (invalidAnswer) {
    res.status(400).json({ error: "Answers must reference questions from this form" });
    return;
  }

  let response: typeof responsesTable.$inferSelect;
  try {
    [response] = await db.insert(responsesTable).values({
      formId: params.data.id,
      respondentHash,
      completed: parsed.data.completed ?? true,
    }).returning();
  } catch (error) {
    if (isUniqueConstraintViolation(error, RESPONDENT_UNIQUE_CONSTRAINT)) {
      res.status(409).json({ error: RESPONDENT_DUPLICATE_ERROR });
      return;
    }

    throw error;
  }

  if (parsed.data.answers && parsed.data.answers.length > 0) {
    await db.insert(answersTable).values(
      parsed.data.answers.map((a) => ({
        responseId: response.id,
        questionId: a.questionId,
        questionTitle: questionMap.get(a.questionId)?.title ?? "",
        value: a.value ?? null,
      }))
    );
  }

  if (respondentToken.shouldSetCookie) {
    res.cookie(respondentCookieName, respondentToken.token, getRespondentCookieOptions());
  }

  res.status(201).json(response);
});

// GET /forms/:id/responses/export  (CSV download — must be before /:responseId)
router.get("/forms/:id/responses/export", requireAuth, async (req, res): Promise<void> => {
  const params = ListResponsesParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const formId = params.data.id;

  const [form] = await db
    .select()
    .from(formsTable)
    .where(and(eq(formsTable.id, formId), eq(formsTable.userId, req.auth!.user.id)));
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
    ? await db.select().from(answersTable).where(inArray(answersTable.responseId, responses.map((r) => r.id)))
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
router.get("/forms/:formId/responses/:responseId", requireAuth, async (req, res): Promise<void> => {
  const params = GetResponseParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const form = await getOwnedFormId(params.data.formId, req.auth!.user.id);
  if (!form) {
    res.status(404).json({ error: "Form not found" });
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
