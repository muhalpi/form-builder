import { expect, test } from "@playwright/test";
import { createFormFromDashboard, signUp, uniqueIdentity } from "./helpers";

test("form title can be edited inline from builder header", async ({ page }) => {
  const owner = uniqueIdentity("title-inline");
  await signUp(page, owner);
  const formId = await createFormFromDashboard(page);

  const newTitle = `Customer Intake ${Date.now()}`;
  await page.getByTestId("button-edit-form-title").click();
  await page.getByTestId("input-form-title-inline").fill(newTitle);
  await page.getByTestId("input-form-title-inline").press("Enter");

  await expect(page.getByTestId("button-edit-form-title")).toHaveText(newTitle);
  await page.getByTestId("tab-settings").click();
  await expect(page.getByTestId("input-title")).toHaveValue(newTitle);
  await expect(page).toHaveURL(new RegExp(`/forms/${formId}/settings$`));
});

test("public response submission updates owner responses", async ({ browser }) => {
  const owner = uniqueIdentity("responder-owner");

  const ownerContext = await browser.newContext();
  const ownerPage = await ownerContext.newPage();
  await signUp(ownerPage, owner);
  const formId = await createFormFromDashboard(ownerPage);

  await ownerPage.getByTestId("button-open-add-question-dialog").click();
  await ownerPage.getByTestId("add-question-short_text").click();
  await ownerPage.getByTestId("tab-settings").click();
  await ownerPage.getByTestId("button-publish-toggle").click();
  await expect(ownerPage.getByText("Published")).toBeVisible();

  const publicContext = await browser.newContext();
  const publicPage = await publicContext.newPage();
  await publicPage.goto(`/f/${formId}`);
  await publicPage.getByTestId("button-start").click();
  await publicPage.getByTestId("input-answer").fill("Automated response");
  await publicPage.getByTestId("input-answer").press("Enter");
  await expect(publicPage.getByText("Thank you!")).toBeVisible();

  await ownerPage.goto(`/forms/${formId}/responses`);
  await expect(ownerPage.getByText("No responses yet.")).toHaveCount(0);

  await ownerContext.close();
  await publicContext.close();
});

test("long text keeps Enter for newline and uses Ctrl+Enter to continue", async ({ browser }) => {
  const owner = uniqueIdentity("long-text-enter");

  const ownerContext = await browser.newContext();
  const ownerPage = await ownerContext.newPage();
  await signUp(ownerPage, owner);
  const formId = await createFormFromDashboard(ownerPage);

  await ownerPage.getByTestId("button-open-add-question-dialog").click();
  await ownerPage.getByTestId("add-question-long_text").click();
  await ownerPage.getByTestId("tab-settings").click();
  await ownerPage.getByTestId("button-publish-toggle").click();
  await expect(ownerPage.getByText("Published")).toBeVisible();

  const publicContext = await browser.newContext();
  const publicPage = await publicContext.newPage();
  await publicPage.goto(`/f/${formId}`);
  await publicPage.getByTestId("button-start").click();

  const answer = publicPage.getByTestId("textarea-answer");
  await answer.fill("Baris pertama");
  await answer.press("Enter");
  await answer.type("Baris kedua");
  await expect(answer).toHaveValue("Baris pertama\nBaris kedua");
  await expect(publicPage.getByText("Thank you!")).toHaveCount(0);

  await answer.press("Control+Enter");
  await expect(publicPage.getByText("Thank you!")).toBeVisible();

  await ownerContext.close();
  await publicContext.close();
});
