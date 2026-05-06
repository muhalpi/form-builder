import { Router, type IRouter } from "express";
import { and, count, db, eq, formsTable, gte, questionsTable, responsesTable, answersTable, sql } from "@workspace/db";
import {
  GetFormStatsParams,
} from "@workspace/api-zod";
import { requireAuth } from "../middlewares/auth";

const router: IRouter = Router();

// GET /dashboard/summary
router.get("/dashboard/summary", requireAuth, async (req, res): Promise<void> => {
  const userId = req.auth!.user.id;

  const [totalFormsRow] = await db
    .select({ count: count() })
    .from(formsTable)
    .where(eq(formsTable.userId, userId));
  const [publishedFormsRow] = await db
    .select({ count: count() })
    .from(formsTable)
    .where(and(eq(formsTable.userId, userId), eq(formsTable.isPublished, true)));
  const [totalResponsesRow] = await db
    .select({ count: count() })
    .from(responsesTable)
    .innerJoin(formsTable, eq(formsTable.id, responsesTable.formId))
    .where(eq(formsTable.userId, userId));

  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
  const [weekResponsesRow] = await db
    .select({ count: count() })
    .from(responsesTable)
    .innerJoin(formsTable, eq(formsTable.id, responsesTable.formId))
    .where(and(eq(formsTable.userId, userId), gte(responsesTable.submittedAt, oneWeekAgo)));

  const recentForms = await db
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
    .where(eq(formsTable.userId, userId))
    .groupBy(formsTable.id)
    .orderBy(sql`${formsTable.updatedAt} desc`)
    .limit(5);

  res.json({
    totalForms: totalFormsRow.count,
    publishedForms: publishedFormsRow.count,
    totalResponses: totalResponsesRow.count,
    responsesThisWeek: weekResponsesRow.count,
    recentForms,
  });
});

// GET /forms/:id/stats
router.get("/forms/:id/stats", requireAuth, async (req, res): Promise<void> => {
  const params = GetFormStatsParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const formId = params.data.id;
  const [form] = await db
    .select({ id: formsTable.id })
    .from(formsTable)
    .where(and(eq(formsTable.id, formId), eq(formsTable.userId, req.auth!.user.id)));

  if (!form) {
    res.status(404).json({ error: "Form not found" });
    return;
  }

  const [totalRow] = await db
    .select({ count: count() })
    .from(responsesTable)
    .where(eq(responsesTable.formId, formId));

  const [completedRow] = await db
    .select({ count: count() })
    .from(responsesTable)
    .where(and(eq(responsesTable.formId, formId), eq(responsesTable.completed, true)));

  const total = totalRow.count;
  const completed = completedRow.count;

  // Responses per day for the last 30 days
  const perDayRows = await db.execute(
    sql`SELECT DATE(submitted_at)::text as date, COUNT(*)::int as count
        FROM responses
        WHERE form_id = ${formId}
          AND submitted_at >= NOW() - INTERVAL '30 days'
        GROUP BY DATE(submitted_at)
        ORDER BY date`
  );

  const responsesPerDay = (perDayRows.rows as { date: string; count: number }[]).map((r) => ({
    date: r.date,
    count: r.count,
  }));

  // Question stats
  const questions = await db
    .select()
    .from(questionsTable)
    .where(eq(questionsTable.formId, formId))
    .orderBy(questionsTable.order);

  const questionStats = await Promise.all(
    questions.map(async (q) => {
      const [answerCountRow] = await db
        .select({ count: count() })
        .from(answersTable)
        .where(eq(answersTable.questionId, q.id));

      const topAnswerRows = await db.execute(
        sql`SELECT value, COUNT(*)::int as count
            FROM answers
            WHERE question_id = ${q.id} AND value IS NOT NULL AND value != ''
            GROUP BY value
            ORDER BY count DESC
            LIMIT 5`
      );

      return {
        questionId: q.id,
        questionTitle: q.title,
        type: q.type,
        answerCount: answerCountRow.count,
        topAnswers: (topAnswerRows.rows as { value: string; count: number }[]).map((r) => ({
          value: r.value,
          count: r.count,
        })),
      };
    })
  );

  res.json({
    formId,
    totalResponses: total,
    completedResponses: completed,
    completionRate: total > 0 ? Math.round((completed / total) * 100) / 100 : 0,
    responsesPerDay,
    questionStats,
  });
});

export default router;
