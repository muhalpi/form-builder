import { expect, test } from "@playwright/test";
import { signIn, signUp, uniqueIdentity } from "./helpers";

test("auth flow: signup -> signout -> signin", async ({ page }) => {
  const identity = uniqueIdentity("auth");

  await signUp(page, identity);
  await page.getByTestId("button-profile-menu").click();
  await page.getByTestId("button-sign-out").click();
  await expect(page).toHaveURL(/\/login$/);

  await signIn(page, identity);
  await page.getByTestId("button-profile-menu").click();
  await page.getByTestId("button-sign-out").click();
  await expect(page).toHaveURL(/\/login$/);
});
