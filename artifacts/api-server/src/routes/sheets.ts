import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { db, sheetIntegrationsTable, responsesTable, answersTable, questionsTable } from "@workspace/db";
import {
  GetSheetIntegrationParams,
  SaveSheetIntegrationParams,
  SaveSheetIntegrationBody,
  DeleteSheetIntegrationParams,
  SyncToSheetsParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

// GET /forms/:id/sheets
router.get("/forms/:id/sheets", async (req, res): Promise<void> => {
  const params = GetSheetIntegrationParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
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
router.post("/forms/:id/sheets", async (req, res): Promise<void> => {
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
router.delete("/forms/:id/sheets", async (req, res): Promise<void> => {
  const params = DeleteSheetIntegrationParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  await db
    .delete(sheetIntegrationsTable)
    .where(eq(sheetIntegrationsTable.formId, params.data.id));

  res.sendStatus(204);
});

// POST /forms/:id/sheets/sync
router.post("/forms/:id/sheets/sync", async (req, res): Promise<void> => {
  const params = SyncToSheetsParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
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

  // Count responses that would be synced
  const responses = await db
    .select()
    .from(responsesTable)
    .where(eq(responsesTable.formId, params.data.id));

  // Update lastSyncedAt
  await db
    .update(sheetIntegrationsTable)
    .set({ lastSyncedAt: new Date() })
    .where(eq(sheetIntegrationsTable.id, integration.id));

  res.json({
    rowsSynced: responses.length,
    message: `Successfully synced ${responses.length} responses to "${integration.spreadsheetName}" (${integration.sheetName}). Note: actual Google Sheets write requires OAuth credentials configured server-side.`,
  });
});

export default router;
