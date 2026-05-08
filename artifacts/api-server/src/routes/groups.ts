import { Router, type IRouter } from "express";
import { and, db, eq, questionGroupsTable, questionsTable } from "@workspace/db";
import {
  ListGroupsParams,
  CreateGroupParams,
  CreateGroupBody,
  UpdateGroupParams,
  UpdateGroupBody,
  DeleteGroupParams,
} from "@workspace/api-zod";
import { requireAuth } from "../middlewares/auth";
import { formsTable } from "@workspace/db";

const router: IRouter = Router();

async function ownsForm(formId: string, userId: string) {
  const [form] = await db
    .select({ id: formsTable.id })
    .from(formsTable)
    .where(and(eq(formsTable.id, formId), eq(formsTable.userId, userId)));
  return !!form;
}

// GET /forms/:id/groups
router.get("/forms/:id/groups", requireAuth, async (req, res): Promise<void> => {
  const params = ListGroupsParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const authorized = await ownsForm(params.data.id, req.auth!.user.id);
  if (!authorized) {
    res.status(404).json({ error: "Form not found" });
    return;
  }

  const groups = await db
    .select()
    .from(questionGroupsTable)
    .where(eq(questionGroupsTable.formId, params.data.id))
    .orderBy(questionGroupsTable.order);

  res.json(groups);
});

// POST /forms/:id/groups
router.post("/forms/:id/groups", requireAuth, async (req, res): Promise<void> => {
  const params = CreateGroupParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = CreateGroupBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const authorized = await ownsForm(params.data.id, req.auth!.user.id);
  if (!authorized) {
    res.status(404).json({ error: "Form not found" });
    return;
  }

  const existingGroups = await db
    .select({ order: questionGroupsTable.order })
    .from(questionGroupsTable)
    .where(eq(questionGroupsTable.formId, params.data.id));

  const maxOrder = existingGroups.length > 0
    ? Math.max(...existingGroups.map(g => g.order))
    : -1;

  const [group] = await db.insert(questionGroupsTable).values({
    formId: params.data.id,
    name: parsed.data.name,
    order: parsed.data.order ?? maxOrder + 1,
    randomize: parsed.data.randomize ?? false,
  }).returning();

  res.status(201).json(group);
});

// PUT /forms/:formId/groups/:groupId
router.put("/forms/:formId/groups/:groupId", requireAuth, async (req, res): Promise<void> => {
  const params = UpdateGroupParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateGroupBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const authorized = await ownsForm(params.data.formId, req.auth!.user.id);
  if (!authorized) {
    res.status(404).json({ error: "Form not found" });
    return;
  }

  const updateData: Record<string, unknown> = {};
  if (parsed.data.name !== undefined) updateData.name = parsed.data.name;
  if (parsed.data.order !== undefined) updateData.order = parsed.data.order;
  if (parsed.data.randomize !== undefined) updateData.randomize = parsed.data.randomize;

  const [updated] = await db
    .update(questionGroupsTable)
    .set(updateData)
    .where(
      and(
        eq(questionGroupsTable.id, params.data.groupId),
        eq(questionGroupsTable.formId, params.data.formId)
      )
    )
    .returning();

  if (!updated) {
    res.status(404).json({ error: "Group not found" });
    return;
  }

  res.json(updated);
});

// DELETE /forms/:formId/groups/:groupId
router.delete("/forms/:formId/groups/:groupId", requireAuth, async (req, res): Promise<void> => {
  const params = DeleteGroupParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const authorized = await ownsForm(params.data.formId, req.auth!.user.id);
  if (!authorized) {
    res.status(404).json({ error: "Form not found" });
    return;
  }

  // Unassign questions that belong to this group
  await db
    .update(questionsTable)
    .set({ groupId: null })
    .where(
      and(
        eq(questionsTable.formId, params.data.formId),
        eq(questionsTable.groupId, params.data.groupId)
      )
    );

  const [deleted] = await db
    .delete(questionGroupsTable)
    .where(
      and(
        eq(questionGroupsTable.id, params.data.groupId),
        eq(questionGroupsTable.formId, params.data.formId)
      )
    )
    .returning();

  if (!deleted) {
    res.status(404).json({ error: "Group not found" });
    return;
  }

  res.sendStatus(204);
});

export default router;
