import { Router, type IRouter } from "express";
import { fromNodeHeaders } from "better-auth/node";
import { and, answersTable, db, eq, formsTable, inArray, questionsTable, responsesTable, sheetIntegrationsTable, sql } from "@workspace/db";
import {
  GetSheetIntegrationParams,
  SaveSheetIntegrationParams,
  SaveSheetIntegrationBody,
  DeleteSheetIntegrationParams,
  SyncToSheetsParams,
} from "@workspace/api-zod";
import { requireAuth } from "../middlewares/auth";
import { auth } from "../lib/auth";
import { appendRowsToSheet } from "../lib/google-sheets";
import { logger } from "../lib/logger";

const router: IRouter = Router();

async function getOwnedFormId(id: string, userId: string) {
  const [form] = await db
    .select({ id: formsTable.id })
    .from(formsTable)
    .where(and(eq(formsTable.id, id), eq(formsTable.userId, userId)));

  return form;
}

async function getGoogleAccessToken(headers: Record<string, string | string[] | undefined>): Promise<string | null> {
  try {
    const tokenResult = await auth.api.getAccessToken({
      body: { providerId: "google" },
      headers: fromNodeHeaders(headers),
    });
    return tokenResult?.accessToken ?? null;
  } catch {
    return null;
  }
}

// GET /forms/:id/sheets/oauth/status
router.get("/forms/:id/sheets/oauth/status", requireAuth, async (req, res): Promise<void> => {
  const params = GetSheetIntegrationParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const form = await getOwnedFormId(params.data.id, req.auth!.user.id);
  if (!form) {
    res.status(404).json({ error: "Form not found" });
    return;
  }

  const accessToken = await getGoogleAccessToken(req.headers);
  res.json({ connected: Boolean(accessToken) });
});

// GET /forms/:id/sheets
router.get("/forms/:id/sheets", requireAuth, async (req, res): Promise<void> => {
  const params = GetSheetIntegrationParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const form = await getOwnedFormId(params.data.id, req.auth!.user.id);
  if (!form) {
    res.status(404).json({ error: "Form not found" });
    return;
  }

  const [integration] = await db
    .select()
    .from(sheetIntegrationsTable)
    .where(eq(sheetIntegrationsTable.formId, params.data.id));

  if (!integration) {
    res.status(404).json({ error: "No sheet integration found" });
    return;
  }

  res.json(integration);
});

// POST /forms/:id/sheets
router.post("/forms/:id/sheets", requireAuth, async (req, res): Promise<void> => {
  const params = SaveSheetIntegrationParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = SaveSheetIntegrationBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const form = await getOwnedFormId(params.data.id, req.auth!.user.id);
  if (!form) {
    res.status(404).json({ error: "Form not found" });
    return;
  }

  const [existing] = await db
    .select()
    .from(sheetIntegrationsTable)
    .where(eq(sheetIntegrationsTable.formId, params.data.id));

  let integration;
  if (existing) {
    [integration] = await db
      .update(sheetIntegrationsTable)
      .set({
        spreadsheetId: parsed.data.spreadsheetId,
        spreadsheetName: parsed.data.spreadsheetName,
        sheetName: parsed.data.sheetName,
        enabled: parsed.data.enabled ?? true,
      })
      .where(eq(sheetIntegrationsTable.id, existing.id))
      .returning();
  } else {
    [integration] = await db
      .insert(sheetIntegrationsTable)
      .values({
        formId: params.data.id,
        spreadsheetId: parsed.data.spreadsheetId,
        spreadsheetName: parsed.data.spreadsheetName,
        sheetName: parsed.data.sheetName,
        enabled: parsed.data.enabled ?? true,
      })
      .returning();
  }

  res.json(integration);
});

// DELETE /forms/:id/sheets
router.delete("/forms/:id/sheets", requireAuth, async (req, res): Promise<void> => {
  const params = DeleteSheetIntegrationParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const form = await getOwnedFormId(params.data.id, req.auth!.user.id);
  if (!form) {
    res.status(404).json({ error: "Form not found" });
    return;
  }

  await db
    .delete(sheetIntegrationsTable)
    .where(eq(sheetIntegrationsTable.formId, params.data.id));

  res.sendStatus(204);
});

// POST /forms/:id/sheets/sync
router.post("/forms/:id/sheets/sync", requireAuth, async (req, res): Promise<void> => {
  const params = SyncToSheetsParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const form = await getOwnedFormId(params.data.id, req.auth!.user.id);
  if (!form) {
    res.status(404).json({ error: "Form not found" });
    return;
  }

  const [integration] = await db
    .select()
    .from(sheetIntegrationsTable)
    .where(eq(sheetIntegrationsTable.formId, params.data.id));

  if (!integration) {
    res.status(404).json({ error: "No sheet integration found. Please configure it first." });
    return;
  }

  if (!integration.enabled) {
    res.status(400).json({ error: "Sheet integration is disabled." });
    return;
  }

  const accessToken = await getGoogleAccessToken(req.headers);
  if (!accessToken) {
    res.status(400).json({
      error: "Google account is not connected. Connect Google first from settings.",
    });
    return;
  }

  const since = integration.lastSyncedAt ?? null;
  const responses = await db
    .select()
    .from(responsesTable)
    .where(
      since
        ? and(
          eq(responsesTable.formId, params.data.id),
          sql`${responsesTable.submittedAt} > ${since}`,
        )
        : eq(responsesTable.formId, params.data.id),
    )
    .orderBy(sql`${responsesTable.submittedAt} asc`);

  if (responses.length === 0) {
    res.json({
      rowsSynced: 0,
      message: "No new responses to sync.",
    });
    return;
  }

  const responseIds = responses.map((response) => response.id);
  const answers = await db
    .select()
    .from(answersTable)
    .where(inArray(answersTable.responseId, responseIds));

  const questions = await db
    .select()
    .from(questionsTable)
    .where(eq(questionsTable.formId, params.data.id))
    .orderBy(questionsTable.order);

  const answersByResponse = new Map<string, Map<string, string>>();
  for (const response of responses) {
    answersByResponse.set(response.id, new Map());
  }
  for (const answer of answers) {
    answersByResponse.get(answer.responseId)?.set(answer.questionId, answer.value ?? "");
  }

  const headers = [
    "Response ID",
    "Submitted At",
    "Completed",
    ...questions.map((question) => question.title),
  ];

  const rows = responses.map((response) => {
    const answerMap = answersByResponse.get(response.id) ?? new Map<string, string>();
    return [
      response.id,
      response.submittedAt.toISOString(),
      response.completed ? "true" : "false",
      ...questions.map((question) => answerMap.get(question.id) ?? ""),
    ];
  });

  try {
    const rowsSynced = await appendRowsToSheet({
      accessToken,
      spreadsheetId: integration.spreadsheetId,
      sheetName: integration.sheetName,
      headers,
      rows,
    });

    await db
      .update(sheetIntegrationsTable)
      .set({ lastSyncedAt: new Date() })
      .where(eq(sheetIntegrationsTable.id, integration.id));

    res.json({
      rowsSynced,
      message: `Synced ${rowsSynced} row(s) to "${integration.spreadsheetName}" (${integration.sheetName}).`,
    });
  } catch (error) {
    logger.error({ err: error }, "Google Sheets sync failed");
    res.status(502).json({
      error: "Failed to sync with Google Sheets. Please retry.",
    });
  }
});

export default router;
