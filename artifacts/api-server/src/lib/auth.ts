import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "@workspace/db";
import * as schema from "@workspace/db/schema";
import { sendResetPasswordEmail } from "./email";
import { dash } from "@better-auth/infra";

function splitOrigins(value: string | undefined): string[] {
  return (value ?? "")
    .split(",")
    .map((origin) => origin.trim().replace(/\/$/, ""))
    .filter(Boolean);
}

const trustedOrigins = [
  ...splitOrigins(process.env.CORS_ORIGIN),
  ...splitOrigins(process.env.FRONTEND_URL),
  "http://localhost:8081",
  "http://127.0.0.1:8081",
];

const secret = process.env.BETTER_AUTH_SECRET ?? (
  process.env.NODE_ENV === "production"
    ? undefined
    : "dev-secret-change-me-before-production"
);

if (!secret) {
  throw new Error("BETTER_AUTH_SECRET must be set in production.");
}

const googleClientId = process.env.GOOGLE_CLIENT_ID;
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;
const githubClientId = process.env.GITHUB_CLIENT_ID;
const githubClientSecret = process.env.GITHUB_CLIENT_SECRET;
const betterAuthApiKey = process.env.BETTER_AUTH_API_KEY?.trim();

const socialProviders = {
  ...(googleClientId && googleClientSecret ? {
    google: {
      clientId: googleClientId,
      clientSecret: googleClientSecret,
      accessType: "offline" as const,
      prompt: "select_account consent" as const,
      updateAccountOnSignIn: true,
    },
  } : {}),
  ...(githubClientId && githubClientSecret ? {
    github: {
      clientId: githubClientId,
      clientSecret: githubClientSecret,
      updateAccountOnSignIn: true,
    },
  } : {}),
};

const authPlugins = betterAuthApiKey
  ? [dash({ apiKey: betterAuthApiKey })]
  : [];

export const auth = betterAuth({
  secret,
  baseURL: process.env.BETTER_AUTH_URL,
  trustedOrigins,
  plugins: authPlugins,
  database: drizzleAdapter(db, {
    provider: "pg",
    schema,
  }),
  emailAndPassword: {
    enabled: true,
    revokeSessionsOnPasswordReset: true,
    sendResetPassword: async ({ user, url }) => {
      await sendResetPasswordEmail({
        email: user.email,
        resetUrl: url,
      });
    },
  },
  socialProviders,
  account: {
    updateAccountOnSignIn: true,
    accountLinking: {
      enabled: true,
      trustedProviders: ["google", "github", "email-password"],
      allowDifferentEmails: false,
    },
  },
  advanced: {
    useSecureCookies: process.env.NODE_ENV === "production",
  },
});

export type AuthSession = typeof auth.$Infer.Session;
