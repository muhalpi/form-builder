import { chromium } from "@playwright/test";

const frontendBase = (process.env.FRONTEND_URL ?? "http://localhost:8081").replace(/\/+$/, "");
const rawApiBase = (process.env.VITE_API_URL ?? "http://localhost:5000").replace(/\/+$/, "");
const apiBase = rawApiBase.endsWith("/api") ? rawApiBase : `${rawApiBase}/api`;
const email = `ui-e2e-${Date.now()}@example.com`;
const password = "UiFlow123!";

async function launchBrowser() {
  const channels = ["msedge", "chrome"];
  for (const channel of channels) {
    try {
      return await chromium.launch({ channel, headless: true });
    } catch {}
  }
  throw new Error("No supported local Chromium channel found. Install Edge or Chrome.");
}

function logStep(message) {
  process.stdout.write(`${message}\n`);
}

const browser = await launchBrowser();
const context = await browser.newContext();
const page = await context.newPage();

try {
  await page.goto(frontendBase, { waitUntil: "load", timeout: 20000 });
  logStep("Opened frontend");

  const signOutButton = page.getByRole("button", { name: "Sign out" });
  if ((await signOutButton.count()) > 0) {
    await signOutButton.click();
    await page.waitForURL("**/login", { waitUntil: "load", timeout: 10000 });
    logStep("Signed out existing session");
  }

  await page.getByRole("link", { name: "Sign up" }).click();
  await page.waitForURL("**/signup", { waitUntil: "load", timeout: 10000 });
  await page.getByPlaceholder("Budi Santoso").fill("UI Flow");
  await page.getByPlaceholder("you@example.com").fill(email);
  await page.getByPlaceholder("Min. 8 characters").fill(password);
  await page.getByRole("button", { name: "Create account" }).click();
  await page.waitForURL("**/", { waitUntil: "load", timeout: 15000 });
  await page.getByRole("heading", { name: "Dashboard" }).waitFor({ timeout: 10000 });
  logStep("Signup and dashboard login successful");

  const navigateToBuilder = async () => {
    const buildRegex = /\/forms\/[^/]+\/build/;
    if (buildRegex.test(page.url())) return true;

    const candidates = [
      page.getByRole("button", { name: "New Form" }),
      page.getByRole("button", { name: "Create Form" }),
    ];

    for (const locator of candidates) {
      const count = await locator.count();
      if (count < 1) continue;
      await locator.first().click();
      try {
        await page.waitForURL(buildRegex, { waitUntil: "load", timeout: 30000 });
        return true;
      } catch {}
    }

    return buildRegex.test(page.url());
  };

  const movedToBuilder = await navigateToBuilder();
  if (!movedToBuilder) {
    throw new Error(`Failed to navigate to form builder. Current URL: ${page.url()}`);
  }
  const buildUrl = page.url();
  const formIdMatch = buildUrl.match(/\/forms\/([^/]+)\/build/);
  if (!formIdMatch) throw new Error(`Cannot parse form id from URL: ${buildUrl}`);
  const formId = formIdMatch[1];
  logStep(`Created form ${formId}`);

  const addQuestionRes = await page.evaluate(
    async ({ apiBaseUrl, id }) => {
      const response = await fetch(`${apiBaseUrl}/forms/${id}/questions`, {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          type: "short_text",
          title: "Your name",
          required: true,
        }),
      });
      return { status: response.status, body: await response.text() };
    },
    { apiBaseUrl: apiBase, id: formId },
  );
  if (addQuestionRes.status !== 201) {
    throw new Error(`Add question failed: ${addQuestionRes.status} ${addQuestionRes.body}`);
  }
  logStep("Added question to form");

  const publishRes = await page.evaluate(
    async ({ apiBaseUrl, id }) => {
      const response = await fetch(`${apiBaseUrl}/forms/${id}/publish`, {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ published: true }),
      });
      return { status: response.status, body: await response.text() };
    },
    { apiBaseUrl: apiBase, id: formId },
  );
  if (publishRes.status !== 200) {
    throw new Error(`Publish failed: ${publishRes.status} ${publishRes.body}`);
  }
  logStep("Published form");

  const publicPage = await context.newPage();
  await publicPage.goto(`${frontendBase}/f/${formId}`, { waitUntil: "load", timeout: 20000 });

  const startByTestId = publicPage.getByTestId("button-start");
  const startButton = publicPage.getByRole("button", { name: "Start" });
  const mulaiButton = publicPage.getByRole("button", { name: "Mulai" });
  const startText = publicPage.getByText("Start");
  const mulaiText = publicPage.getByText("Mulai");

  let startTarget = null;
  try {
    await startByTestId.first().waitFor({ state: "visible", timeout: 6000 });
    startTarget = startByTestId.first();
  } catch {
    if ((await startButton.count()) > 0) startTarget = startButton.first();
    else if ((await mulaiButton.count()) > 0) startTarget = mulaiButton.first();
    else if ((await startText.count()) > 0) startTarget = startText.first();
    else if ((await mulaiText.count()) > 0) startTarget = mulaiText.first();
  }

  if (startTarget) {
    await publicPage.waitForTimeout(1200);
    for (let attempt = 0; attempt < 4; attempt++) {
      await startTarget.click();
      await publicPage.waitForTimeout(700);
      if ((await publicPage.locator("input, textarea").count()) > 0) break;
    }
  }
  const textInputs = publicPage.locator("input, textarea");
  try {
    await textInputs.first().waitFor({ state: "visible", timeout: 15000 });
  } catch {
    const pageText = await publicPage.locator("body").innerText();
    throw new Error(`No text input visible on public form. Body text: ${pageText.slice(0, 600)}`);
  }
  await textInputs.first().fill("Smoke response");

  const submitByTestId = publicPage.getByTestId("button-next");
  const submitButton = publicPage.getByRole("button", { name: "Submit" });
  const kirimButton = publicPage.getByRole("button", { name: "Kirim" });
  if (
    (await submitByTestId.count()) > 0 ||
    (await submitButton.count()) > 0 ||
    (await kirimButton.count()) > 0
  ) {
    const button =
      (await submitByTestId.count()) > 0 ? submitByTestId.first()
      : (await submitButton.count()) > 0 ? submitButton.first()
      : kirimButton.first();
    await button.click();
  } else {
    const continueButton = publicPage.getByRole("button", { name: "Continue" });
    const lanjutButton = publicPage.getByRole("button", { name: "Lanjut" });
    if ((await continueButton.count()) > 0 || (await lanjutButton.count()) > 0) {
      const button = (await continueButton.count()) > 0 ? continueButton.first() : lanjutButton.first();
      await button.click();
      const finalSubmit = (await submitButton.count()) > 0 ? submitButton.first() : kirimButton.first();
      await finalSubmit.waitFor({ state: "visible", timeout: 10000 });
      await finalSubmit.click();
    } else {
      throw new Error("Cannot find Submit or Continue button on public form");
    }
  }
  let submissionVerified = false;
  for (let attempt = 0; attempt < 8; attempt++) {
    const verifySubmission = await page.evaluate(
      async ({ apiBaseUrl, id }) => {
        const response = await fetch(`${apiBaseUrl}/forms/${id}/responses?page=1&limit=20`, {
          credentials: "include",
        });
        const body = await response.json().catch(() => null);
        return { status: response.status, total: body?.total ?? 0 };
      },
      { apiBaseUrl: apiBase, id: formId },
    );

    if (verifySubmission.status === 200 && verifySubmission.total > 0) {
      submissionVerified = true;
      break;
    }

    await publicPage.waitForTimeout(800);
  }

  if (!submissionVerified) {
    const pageText = await publicPage.locator("body").innerText();
    throw new Error(`Submission could not be verified from API. Public page text: ${pageText.slice(0, 600)}`);
  }
  logStep("Public form submitted successfully");

  await page.goto(`${frontendBase}/forms/${formId}/responses`, {
    waitUntil: "load",
    timeout: 15000,
  });
  await page.getByRole("heading", { name: "Responses" }).waitFor({ timeout: 10000 });

  const responseList = await page.evaluate(
    async ({ apiBaseUrl, id }) => {
      const response = await fetch(`${apiBaseUrl}/forms/${id}/responses?page=1&limit=20`, {
        credentials: "include",
      });
      const body = await response.json().catch(() => null);
      return { status: response.status, body };
    },
    { apiBaseUrl: apiBase, id: formId },
  );
  if (responseList.status !== 200 || !responseList.body || responseList.body.total < 1) {
    throw new Error(`Responses verification failed: ${JSON.stringify(responseList)}`);
  }
  logStep("Responses page/API confirms at least one submission");

  process.stdout.write(
    JSON.stringify(
      {
        ok: true,
        formId,
        user: email,
        frontendBase,
        apiBase,
        responsesTotal: responseList.body.total,
      },
      null,
      2,
    ) + "\n",
  );
} finally {
  await context.close();
  await browser.close();
}
