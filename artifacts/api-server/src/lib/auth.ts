import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "@workspace/db";
import * as schema from "@workspace/db/schema";

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

export const auth = betterAuth({
  secret,
  baseURL: process.env.BETTER_AUTH_URL,
  trustedOrigins,
  database: drizzleAdapter(db, {
    provider: "pg",
    schema,
  }),
  emailAndPassword: {
    enabled: true,
  },
  advanced: {
    useSecureCookies: process.env.NODE_ENV === "production",
  },
});

export type AuthSession = typeof auth.$Infer.Session;
