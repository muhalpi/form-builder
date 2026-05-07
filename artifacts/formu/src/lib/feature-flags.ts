function envFlag(name: string): boolean {
  return String(import.meta.env[name] ?? "").toLowerCase() === "true";
}

export const enableSocialAuth = envFlag("VITE_ENABLE_SOCIAL_AUTH");
export const enablePasswordReset = envFlag("VITE_ENABLE_PASSWORD_RESET");
export const enableGoogleSheetsIntegration = envFlag("VITE_ENABLE_GOOGLE_SHEETS_INTEGRATION");

