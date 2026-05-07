import { expect, test } from "@playwright/test";
import { createFormFromDashboard, signUp, uniqueIdentity } from "./helpers";

test("ownership isolation: user cannot see another user's forms", async ({ browser }) => {
  const owner = uniqueIdentity("owner");
  const outsider = uniqueIdentity("outsider");
  const uniqueTitle = `owner-form-${Date.now()}`;

  const ownerContext = await browser.newContext();
  const ownerPage = await ownerContext.newPage();
  await signUp(ownerPage, owner);
  await createFormFromDashboard(ownerPage);

  await ownerPage.getByTestId("tab-settings").click();
  await ownerPage.getByTestId("input-title").fill(uniqueTitle);
  await ownerPage.getByTestId("button-save-general").click();
  await ownerPage.getByTestId("link-back").click();
  await expect(ownerPage).toHaveURL(/\/dashboard$/);
  await expect(ownerPage.getByText(uniqueTitle)).toBeVisible();

  const outsiderContext = await browser.newContext();
  const outsiderPage = await outsiderContext.newPage();
  await signUp(outsiderPage, outsider);
  await expect(outsiderPage.getByText(uniqueTitle)).toHaveCount(0);

  await ownerContext.close();
  await outsiderContext.close();
});
