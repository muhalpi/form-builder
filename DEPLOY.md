# Deploy Guide - Formu

Panduan ini untuk deploy `frontend + api-server` dengan mode aman:
- OAuth social: `OFF`
- Password reset email: `OFF`
- Google Sheets sync: `OFF`

## 1. Prasyarat

- Neon Postgres sudah aktif dan punya `DATABASE_URL`
- Repo sudah lulus:
  - `pnpm run typecheck`
  - `pnpm run test:e2e`

## 2. Urutan Deploy (wajib)

1. Deploy API server dulu
2. Jalankan migrasi hardening DB
3. Deploy frontend
4. Smoke test end-to-end

## 3. Deploy API Server (Render)

### Build/Start

- Root directory: `artifacts/api-server`
- Build command:
```bash
pnpm install --frozen-lockfile
pnpm --filter @workspace/api-server run build
```
- Start command:
```bash
pnpm --filter @workspace/api-server run start
```

### Env wajib (API)

```bash
PORT=5000
NODE_ENV=production
LOG_LEVEL=info
DATABASE_URL=postgresql://...
BETTER_AUTH_SECRET=<random-strong-secret>
BETTER_AUTH_URL=https://<api-domain-kamu>
FRONTEND_URL=https://<frontend-domain-kamu>
CORS_ORIGIN=https://<frontend-domain-kamu>
```

### Env opsional (saat ini biarkan kosong)

```bash
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
SMTP_HOST=
SMTP_PORT=
SMTP_USER=
SMTP_PASS=
SMTP_FROM=
```

## 4. Jalankan Migrasi DB

Setelah API deploy sukses, jalankan dari local/runner yang bisa akses DB:

```bash
pnpm --filter @workspace/db run migrate:forms-user-id
```

Expected output aman:
- `Updated 0 form row(s) ...` atau lebih dari 0
- `enforced NOT NULL`

## 5. Deploy Frontend (Vercel)

### Build

- Root directory: `artifacts/formu`
- Build command:
```bash
pnpm install --frozen-lockfile
pnpm --filter @workspace/formu run build
```

### Env wajib (Frontend)

```bash
VITE_API_URL=https://<api-domain-kamu>
BASE_PATH=/
VITE_ENABLE_SOCIAL_AUTH=false
VITE_ENABLE_PASSWORD_RESET=false
VITE_ENABLE_GOOGLE_SHEETS_INTEGRATION=false
```

## 6. Smoke Test Setelah Deploy

1. Buka homepage `/`
2. Signup user baru
3. Login user
4. Buat form baru
5. Publish form
6. Buka link publik `/f/:id`
7. Submit response
8. Cek response masuk di halaman responses

## 7. Troubleshooting Cepat

### Login berhasil tapi balik ke `/login`
- Samakan domain di:
  - `BETTER_AUTH_URL`
  - `FRONTEND_URL`
  - `CORS_ORIGIN`
  - `VITE_API_URL`
- Pastikan pakai `https` di production.

### CORS error
- Pastikan `CORS_ORIGIN` exact match dengan origin frontend, tanpa trailing slash.

### Migrasi bilang `DATABASE_URL is required`
- Jalankan command dari root repo dan pastikan `.env` ada.
- Atau export env di shell CI sebelum run migrasi.

## 8. Aktivasi Fitur Nanti (Saat Domain/OAuth/SMTP Siap)

Aktifkan bertahap:
1. Social OAuth:
   - isi `GOOGLE_*` / `GITHUB_*`
   - set `VITE_ENABLE_SOCIAL_AUTH=true`
2. Password reset email:
   - isi `SMTP_*`
   - set `VITE_ENABLE_PASSWORD_RESET=true`
3. Google Sheets:
   - set `VITE_ENABLE_GOOGLE_SHEETS_INTEGRATION=true`

Lakukan per fitur, lalu smoke test lagi.

