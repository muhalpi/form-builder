import { pgTable, text, boolean, integer, timestamp, uuid } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { formsTable } from "./forms";

export const questionGroupsTable = pgTable("question_groups", {
  id: uuid("id").primaryKey().defaultRandom(),
  formId: uuid("form_id").notNull().references(() => formsTable.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  order: integer("order").notNull().default(0),
  randomize: boolean("randomize").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertQuestionGroupSchema = createInsertSchema(questionGroupsTable).omit({ id: true, createdAt: true });
export type InsertQuestionGroup = z.infer<typeof insertQuestionGroupSchema>;
export type QuestionGroup = typeof questionGroupsTable.$inferSelect;
