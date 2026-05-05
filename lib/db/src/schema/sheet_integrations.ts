import { pgTable, text, boolean, timestamp, uuid } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { formsTable } from "./forms";

export const sheetIntegrationsTable = pgTable("sheet_integrations", {
  id: uuid("id").primaryKey().defaultRandom(),
  formId: uuid("form_id").notNull().references(() => formsTable.id, { onDelete: "cascade" }),
  spreadsheetId: text("spreadsheet_id").notNull(),
  spreadsheetName: text("spreadsheet_name").notNull(),
  sheetName: text("sheet_name").notNull(),
  enabled: boolean("enabled").notNull().default(true),
  lastSyncedAt: timestamp("last_synced_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertSheetIntegrationSchema = createInsertSchema(sheetIntegrationsTable).omit({ id: true, createdAt: true });
export type InsertSheetIntegration = z.infer<typeof insertSheetIntegrationSchema>;
export type SheetIntegration = typeof sheetIntegrationsTable.$inferSelect;
