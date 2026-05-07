# Formu - Agent Development Guide

Dokumen ini adalah panduan untuk AI agent yang melanjutkan pengembangan Formu.

## 1. Gambaran Proyek

Formu adalah platform form builder seperti Typeform. Pengguna dapat:
- Membuat form multi-jenis pertanyaan
- Menambahkan conditional logic
- Mempublikasikan form
- Melihat analytics respons
- Sinkronisasi ke Google Sheets

Status saat ini:
- Auth aktif end-to-end (BetterAuth)
- Alur route: `Homepage -> Login/Signup -> Dashboard`
- Forgot/reset password aktif
- Social sign-in Google/GitHub aktif (butuh env OAuth)
- Ownership data per user sudah diterapkan

## 2. Struktur Monorepo

```
/
├── artifacts/
│   ├── formu/              # Frontend React + Vite
│   ├── api-server/         # Backend Express
│   └── mockup-sandbox/     # Sandbox komponen UI
├── lib/
│   ├── db/                 # Drizzle schema + DB scripts
│   ├── api-spec/           # OpenAPI source
│   ├── api-zod/            # Zod schema generated
│   └── api-client-react/   # React Query hooks generated
└── scripts/
```

Perintah penting:
```bash
pnpm --filter @workspace/formu run dev
pnpm --filter @workspace/api-server run dev
pnpm --filter @workspace/db run push
pnpm --filter @workspace/api-spec run codegen
pnpm run typecheck
pnpm run test:e2e
```

## 3. Tech Stack

- Frontend: React 19, Vite, TypeScript, Tailwind CSS, Wouter, TanStack Query
- Backend: Express 5, BetterAuth
- Database: PostgreSQL, Drizzle ORM
- API contracts: OpenAPI + Orval + Zod
- Charting: Recharts
- E2E test: Playwright

## 4. Routing

Public:
- `/` -> Homepage
- `/login`
- `/signup`
- `/forgot-password`
- `/reset-password`
- `/f/:id` -> Public form

Protected:
- `/dashboard`
- `/forms/:id/build`
- `/forms/:id/responses`
- `/forms/:id/stats`
- `/forms/:id/settings`
- `/forms/:id/preview`

## 5. Auth & Ownership

Sudah aktif:
- BetterAuth server route: `/api/auth/*`
- Session guard frontend via `authClient.useSession()`
- Middleware `requireAuth` di API private route
- Forms/responses/stats/sheets difilter by `forms.userId`

DB auth tables:
- `user`
- `session`
- `account`
- `verification`

## 6. Google Sheets Integration

Implementasi saat ini:
- Simpan konfigurasi spreadsheet per form
- Status koneksi OAuth Google per user
- Sync respons baru ke Google Sheets menggunakan token dari BetterAuth `getAccessToken`
- Retry untuk transient error (429/5xx)

Catatan:
- User harus connect Google dulu (scope sheets/drive)
- Sync akan gagal jika Google account belum terhubung atau scope belum diberikan

## 7. Hardening DB

Schema:
- `forms.userId` harus `NOT NULL`

Untuk data lama yang masih `NULL`, jalankan:
```bash
pnpm --filter @workspace/db run migrate:forms-user-id
```

Script ini:
1. Membuat legacy user jika belum ada
2. Backfill form yang `user_id IS NULL`
3. Memaksa constraint `NOT NULL`

## 8. Env Variables

Backend (`artifacts/api-server`):
- `DATABASE_URL`
- `PORT`
- `NODE_ENV`
- `LOG_LEVEL`
- `BETTER_AUTH_SECRET`
- `BETTER_AUTH_URL`
- `FRONTEND_URL`
- `CORS_ORIGIN`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GITHUB_CLIENT_ID`
- `GITHUB_CLIENT_SECRET`
- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_USER`
- `SMTP_PASS`
- `SMTP_FROM`

Frontend (`artifacts/formu`):
- `VITE_API_URL`

## 9. Pengembangan UI & i18n

Wajib:
- Teks user-facing masuk ke `artifacts/formu/src/lib/i18n.ts` untuk EN + ID
- Gunakan design tokens yang sudah ada, hindari hardcode warna untuk komponen standar
- Tambahkan `data-testid` untuk elemen interaktif baru

## 10. Testing

E2E minimal tersedia di `tests/e2e`:
- Auth flow (signup/signout/signin)
- Ownership isolation
- Public response submission

Jalankan:
```bash
pnpm run test:e2e
```

Pastikan API + frontend sudah running dan env test sudah terpasang sebelum menjalankan E2E.

