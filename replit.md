# Workspace

## Overview

pnpm workspace monorepo using TypeScript. This project is **Formly** — a Typeform-like online form builder platform.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild
- **Frontend**: React + Vite + Tailwind CSS + framer-motion + recharts

## Artifacts

| Artifact | Path | Description |
|---|---|---|
| `artifacts/formly` | `/` | React + Vite frontend (Formly UI) |
| `artifacts/api-server` | `/api` | Express 5 API server |
| `artifacts/mockup-sandbox` | `/__mockup` | Component preview sandbox (dev) |

## Libraries

| Package | Description |
|---|---|
| `lib/db` | Drizzle ORM schema + DB client |
| `lib/api-spec` | OpenAPI spec + codegen scripts |
| `lib/api-zod` | Generated Zod schemas from OpenAPI |
| `lib/api-client-react` | Generated React Query hooks from OpenAPI |

## Database Schema

- **forms** — id, title, description, themeColor, isPublished, createdAt, updatedAt
- **questions** — id, formId, type, title, description, required, order, options (text[]), logic (jsonb)
- **responses** — id, formId, completed, submittedAt
- **answers** — id, responseId, questionId, questionTitle, value
- **sheet_integrations** — id, formId, spreadsheetId, spreadsheetName, sheetName, enabled, lastSyncedAt

## API Routes

All routes are mounted under `/api`:

- `GET/POST /forms` — list, create forms
- `GET/PUT/DELETE /forms/:id` — get, update, delete form
- `POST /forms/:id/publish` — publish/unpublish
- `GET/POST /forms/:id/questions` — list, create questions
- `POST /forms/:id/questions/reorder` — drag-and-drop reorder
- `PUT/DELETE /forms/:formId/questions/:questionId` — edit, delete question
- `GET/POST /forms/:id/responses` — list, submit responses
- `GET /forms/:id/stats` — analytics data
- `GET /dashboard/summary` — dashboard stat cards
- `GET/POST/DELETE /forms/:id/sheets` — Google Sheets integration settings
- `POST /forms/:id/sheets/sync` — trigger sheet sync

## Question Types

short_text, long_text, multiple_choice, checkbox, dropdown, rating, date, email, phone, number, yes_no

## Features

- Drag-and-drop question builder (HTML5 drag API)
- One-question-at-a-time form filling (Typeform style)
- Conditional logic/branching per question
- Theme color per form (preset + custom hex)
- Dashboard analytics with Recharts charts
- Google Sheets integration UI (requires OAuth credentials server-side for actual writes)
- Publish/unpublish with shareable link (`/f/:id`)
- Mobile responsive form filler

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.
