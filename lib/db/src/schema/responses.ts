import { pgTable, text, boolean, timestamp, uuid, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { formsTable } from "./forms";

export const responsesTable = pgTable("responses", {
  id: uuid("id").primaryKey().defaultRandom(),
  formId: uuid("form_id").notNull().references(() => formsTable.id, { onDelete: "cascade" }),
  completed: boolean("completed").notNull().default(true),
  submittedAt: timestamp("submitted_at", { withTimezone: true }).notNull().defaultNow(),
});

export const answersTable = pgTable("answers", {
  id: uuid("id").primaryKey().defaultRandom(),
  responseId: uuid("response_id").notNull().references(() => responsesTable.id, { onDelete: "cascade" }),
  questionId: uuid("question_id").notNull(),
  questionTitle: text("question_title").notNull(),
  value: text("value"),
});

export const insertResponseSchema = createInsertSchema(responsesTable).omit({ id: true, submittedAt: true });
export type InsertResponse = z.infer<typeof insertResponseSchema>;
export type Response = typeof responsesTable.$inferSelect;

export const insertAnswerSchema = createInsertSchema(answersTable).omit({ id: true });
export type InsertAnswer = z.infer<typeof insertAnswerSchema>;
export type Answer = typeof answersTable.$inferSelect;
