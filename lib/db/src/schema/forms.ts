import { pgTable, text, boolean, integer, timestamp, uuid, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { userTable } from "./auth";

export const formsTable = pgTable("forms", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id").notNull().references(() => userTable.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description"),
  themeColor: text("theme_color").notNull().default("#6366f1"),
  isPublished: boolean("is_published").notNull().default(false),
  randomizeQuestions: boolean("randomize_questions").notNull().default(false),
  showScore: boolean("show_score").notNull().default(false),
  endScreenTitle: text("end_screen_title"),
  endScreenDescription: text("end_screen_description"),
  endScreenButtonText: text("end_screen_button_text"),
  endScreenButtonUrl: text("end_screen_button_url"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertFormSchema = createInsertSchema(formsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertForm = z.infer<typeof insertFormSchema>;
export type Form = typeof formsTable.$inferSelect;
