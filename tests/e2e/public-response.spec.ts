import { expect, test } from "@playwright/test";
import { createFormFromDashboard, signUp, uniqueIdentity } from "./helpers";

test("public response submission updates owner responses", async ({ browser }) => {
  const owner = uniqueIdentity("responder-owner");

  const ownerContext = await browser.newContext();
  const ownerPage = await ownerContext.newPage();
  await signUp(ownerPage, owner);
  const formId = await createFormFromDashboard(ownerPage);

  await ownerPage.getByTestId("add-question-short_text").click();
  await ownerPage.getByTestId("tab-settings").click();
  await ownerPage.getByTestId("button-publish-toggle").click();
  await expect(ownerPage.getByText("Published")).toBeVisible();

  const publicContext = await browser.newContext();
  const publicPage = await publicContext.newPage();
  await publicPage.goto(`/f/${formId}`);
  await publicPage.getByTestId("button-start").click();
  await publicPage.getByTestId("input-answer").fill("Automated response");
  await publicPage.getByTestId("button-next").click();
  await expect(publicPage.getByText("Thank you!")).toBeVisible();

  await ownerPage.goto(`/forms/${formId}/responses`);
  await expect(ownerPage.getByText("No responses yet.")).toHaveCount(0);

  await ownerContext.close();
  await publicContext.close();
});

