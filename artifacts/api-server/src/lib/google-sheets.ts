import { google, sheets_v4 } from "googleapis";

type AppendRowsInput = {
  accessToken: string;
  spreadsheetId: string;
  sheetName: string;
  headers: string[];
  rows: string[][];
};

type RetryableError = Error & {
  code?: number | string;
  status?: number;
  response?: {
    status?: number;
  };
};

function toStatus(error: unknown): number | null {
  const candidate = error as RetryableError;
  if (typeof candidate.status === "number") return candidate.status;
  if (typeof candidate.response?.status === "number") return candidate.response.status;
  if (typeof candidate.code === "number") return candidate.code;
  return null;
}

function isRetryable(error: unknown): boolean {
  const status = toStatus(error);
  return status === 429 || (status !== null && status >= 500);
}

async function withRetry<T>(
  fn: () => Promise<T>,
  maxAttempts = 3,
): Promise<T> {
  let attempt = 0;
  // Backoff in milliseconds.
  const delays = [250, 800, 1600];

  while (true) {
    attempt += 1;
    try {
      return await fn();
    } catch (error) {
      if (attempt >= maxAttempts || !isRetryable(error)) {
        throw error;
      }
      const delay = delays[Math.min(attempt - 1, delays.length - 1)];
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
}

function createSheetsClient(accessToken: string): sheets_v4.Sheets {
  const oauth2Client = new google.auth.OAuth2();
  oauth2Client.setCredentials({ access_token: accessToken });
  return google.sheets({ version: "v4", auth: oauth2Client });
}

async function ensureHeaderRow(
  client: sheets_v4.Sheets,
  spreadsheetId: string,
  sheetName: string,
  headers: string[],
): Promise<void> {
  const rowRange = `${sheetName}!1:1`;
  const headerResponse = await withRetry(() => client.spreadsheets.values.get({
    spreadsheetId,
    range: rowRange,
  }));

  const existing = headerResponse.data.values?.[0] ?? [];
  const hasHeader = existing.length > 0 && existing.some((value) => String(value).trim() !== "");
  if (hasHeader) return;

  await withRetry(() => client.spreadsheets.values.update({
    spreadsheetId,
    range: `${sheetName}!A1`,
    valueInputOption: "RAW",
    requestBody: {
      values: [headers],
    },
  }));
}

export async function appendRowsToSheet({
  accessToken,
  spreadsheetId,
  sheetName,
  headers,
  rows,
}: AppendRowsInput): Promise<number> {
  if (rows.length === 0) return 0;

  const sheets = createSheetsClient(accessToken);
  await ensureHeaderRow(sheets, spreadsheetId, sheetName, headers);

  const appendRange = `${sheetName}!A:ZZ`;
  const appendResponse = await withRetry(() => sheets.spreadsheets.values.append({
    spreadsheetId,
    range: appendRange,
    valueInputOption: "RAW",
    insertDataOption: "INSERT_ROWS",
    requestBody: {
      values: rows,
    },
  }));

  return appendResponse.data.updates?.updatedRows ?? rows.length;
}

