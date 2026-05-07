import { expect, type Page } from "@playwright/test";

export function uniqueIdentity(prefix: string) {
  const suffix = `${Date.now()}-${Math.floor(Math.random() * 10_000)}`;
  return {
    name: `${prefix}-${suffix}`,
    email: `${prefix}-${suffix}@example.com`,
    password: "Password123!",
  };
}

export async function signUp(page: Page, identity: { name: string; email: string; password: string }) {
  await page.goto("/signup");
  await page.getByTestId("input-signup-name").fill(identity.name);
  await page.getByTestId("input-signup-email").fill(identity.email);
  await page.getByTestId("input-signup-password").fill(identity.password);
  await page.getByTestId("button-signup-submit").click();
  await expect(page).toHaveURL(/\/dashboard$/);
}

export async function signIn(page: Page, identity: { email: string; password: string }) {
  await page.goto("/login");
  await page.getByTestId("input-login-email").fill(identity.email);
  await page.getByTestId("input-login-password").fill(identity.password);
  await page.getByTestId("button-login-submit").click();
  await expect(page).toHaveURL(/\/dashboard$/);
}

export async function createFormFromDashboard(page: Page): Promise<string> {
  await page.goto("/dashboard");
  const headerCreateButton = page.getByTestId("button-create-form");
  if (await headerCreateButton.isVisible()) {
    await headerCreateButton.click();
  } else {
    await page.getByTestId("button-create-first-form").click();
  }

  await expect(page).toHaveURL(/\/forms\/[^/]+\/build$/);
  const match = page.url().match(/\/forms\/([^/]+)\/build$/);
  if (!match) {
    throw new Error(`Unable to parse form id from URL: ${page.url()}`);
  }
  return match[1];
}

