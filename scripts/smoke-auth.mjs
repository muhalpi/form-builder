const authBaseUrl = (process.env.BETTER_AUTH_URL ?? "http://localhost:5000").replace(/\/+$/, "");
const apiBaseUrl = `${authBaseUrl}/api`;

const email = `codex-smoke-${Date.now()}@example.com`;
const password = "SmokeTest123!";

const cookies = new Map();

function readSetCookies(response) {
  const getSetCookie = response.headers.getSetCookie?.bind(response.headers);
  const values = getSetCookie ? getSetCookie() : [response.headers.get("set-cookie")].filter(Boolean);

  for (const value of values) {
    const [pair] = value.split(";");
    const index = pair.indexOf("=");
    if (index > 0) {
      cookies.set(pair.slice(0, index), pair.slice(index + 1));
    }
  }
}

function cookieHeader() {
  return [...cookies.entries()].map(([key, value]) => `${key}=${value}`).join("; ");
}

async function request(path, options = {}) {
  const headers = new Headers(options.headers);
  if (options.body && !headers.has("content-type")) {
    headers.set("content-type", "application/json");
  }
  if (cookies.size > 0 && !headers.has("cookie")) {
    headers.set("cookie", cookieHeader());
  }

  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...options,
    headers,
  });
  readSetCookies(response);

  const text = await response.text();
  let data = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }

  return { response, data };
}

function assertStatus(label, actual, expected) {
  if (actual !== expected) {
    throw new Error(`${label}: expected HTTP ${expected}, got HTTP ${actual}`);
  }
  console.log(`${label}: HTTP ${actual}`);
}

const unauthDashboard = await request("/dashboard/summary");
assertStatus("unauthenticated dashboard", unauthDashboard.response.status, 401);

const signUp = await request("/auth/sign-up/email", {
  method: "POST",
  body: JSON.stringify({
    name: "Codex Smoke",
    email,
    password,
  }),
});
assertStatus("sign up", signUp.response.status, 200);

const session = await request("/auth/get-session");
assertStatus("get session", session.response.status, 200);

if (!session.data?.user?.email || session.data.user.email !== email) {
  throw new Error("get session did not return the smoke test user");
}

const authedDashboard = await request("/dashboard/summary");
assertStatus("authenticated dashboard", authedDashboard.response.status, 200);

console.log(`smoke user: ${email}`);
