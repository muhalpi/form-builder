# Formly — Agent Development Guide

Dokumen ini adalah panduan untuk AI agent yang melanjutkan pengembangan Formly.
Baca seluruh dokumen ini sebelum menulis kode apapun.

---

## 1. Gambaran Proyek

**Formly** adalah platform form builder seperti Typeform. Pengguna bisa membuat form dengan berbagai jenis pertanyaan, conditional logic, mempublikasikannya, dan melihat analitik respons.

**Status saat ini:** UI-only (belum ada autentikasi aktif). Halaman login & signup sudah dibuat sebagai UI saja, belum terhubung ke backend auth.

---

## 2. Struktur Monorepo (pnpm workspace)

```
/
├── artifacts/
│   ├── formly/          ← Frontend React + Vite (port dari env PORT)
│   └── api-server/      ← Express.js API (port 8080)
├── lib/
│   ├── db/              ← Drizzle ORM schema + migrations (PostgreSQL)
│   ├── api-zod/         ← Zod validation schemas (shared)
│   └── api-client-react/← Auto-generated React Query hooks (via Orval)
└── pnpm-workspace.yaml
```

**Perintah penting:**
```bash
# Jalankan frontend
pnpm --filter @workspace/formly run dev

# Jalankan API server
pnpm --filter @workspace/api-server run dev

# Push schema DB
pnpm --filter @workspace/db run push

# Regenerate API hooks dari OpenAPI spec
pnpm --filter @workspace/api-client-react run generate
```

---

## 3. Tech Stack

| Layer | Teknologi |
|---|---|
| Frontend | React 19, Vite, TypeScript, Tailwind CSS v4, Wouter (routing) |
| State / Data | TanStack Query v5, auto-generated hooks dari Orval |
| Backend | Express.js v5, TypeScript |
| Database | PostgreSQL, Drizzle ORM, drizzle-kit |
| Validasi | Zod v4 |
| UI Components | Radix UI primitives, Lucide icons |
| Charts | Recharts |
| Auth (planned) | BetterAuth |
| Deploy target | Vercel (frontend), Railway/Render (API), Neon (DB) |

---

## 4. Design System — WAJIB DIIKUTI

### Warna & Token
Semua warna menggunakan CSS custom properties via Tailwind. **Jangan hardcode warna hex.**

```
Warna utama:   bg-primary, text-primary, text-primary-foreground
Background:    bg-background, bg-card, bg-muted, bg-sidebar
Teks:          text-foreground, text-muted-foreground
Border:        border-border, border-card-border, border-input
Destructive:   text-destructive, bg-destructive/10
```

### Radius & Spacing
- Card/panel: `rounded-xl` (16px)
- Button/input: `rounded-lg` (8px)
- Badge/pill: `rounded-full`
- Spacing utama: `px-5 py-4` untuk card, `px-3 py-2` untuk button

### Typography (font: Inter)
```
Heading halaman:  text-2xl font-bold
Heading section:  text-lg font-semibold
Label uppercase:  text-xs font-semibold text-muted-foreground uppercase tracking-wider
Body:             text-sm text-foreground
Caption:          text-xs text-muted-foreground
```

### Pola Komponen Umum

**Card standard:**
```tsx
<div className="bg-card border border-card-border rounded-xl p-5">
```

**Input field:**
```tsx
<input className="w-full px-3.5 py-2.5 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
```

**Button primary:**
```tsx
<button className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-60">
```

**Button ghost/outline:**
```tsx
<button className="px-4 py-2 border border-border rounded-lg text-sm font-medium hover:bg-muted transition-colors">
```

**Empty state:**
```tsx
<div className="text-center py-16 border border-dashed border-border rounded-xl">
  <Icon className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
  <p className="text-muted-foreground text-sm">Pesan kosong</p>
</div>
```

**Skeleton loading:**
```tsx
<div className="h-16 bg-muted rounded-xl animate-pulse" />
```

### Icon
Gunakan **Lucide React** saja. Ukuran: `w-4 h-4` (standar), `w-3.5 h-3.5` (kecil), `w-5 h-5` (medium).

---

## 5. Internasionalisasi (i18n)

Sistem i18n custom ada di `artifacts/formly/src/lib/i18n.ts`.

```ts
// Tambah key baru di KEDUA bahasa (en & id)
export const translations = {
  en: { myNewKey: "My text" },
  id: { myNewKey: "Teks saya" },
}

// Cara pakai di komponen:
const { lang } = useLang();   // dari @/contexts/LangContext
t(lang, "myNewKey")           // dari @/lib/i18n
```

**Wajib:** Setiap string UI yang terlihat user harus ada terjemahannya di kedua bahasa. Jangan hardcode string teks dalam JSX.

---

## 6. Pola API & Data Fetching

### Hook yang sudah ada (auto-generated)
```ts
import { useListForms, useCreateForm, useDeleteForm, ... } from "@workspace/api-client-react"
```

Lihat semua hook yang tersedia di `lib/api-client-react/src/`.

### Kalau butuh endpoint baru yang belum ada hooknya
Gunakan `useMutation` dari TanStack Query langsung:
```ts
const myMutation = useMutation({
  mutationFn: async (id: string) => {
    const apiBase = import.meta.env.VITE_API_URL ?? "http://localhost:8080";
    const res = await fetch(`${apiBase}/api/...`, { method: "POST" });
    if (!res.ok) throw new Error("...");
    return res.json();
  },
  onSuccess: () => queryClient.invalidateQueries({ queryKey: ... }),
});
```

### Invalidasi cache setelah mutasi
Selalu invalidate query key yang relevan setelah create/update/delete.

---

## 7. Routing (Wouter)

```ts
// App.tsx — daftar route yang ada
"/"                          → Dashboard
"/login"                     → Login (UI only)
"/signup"                    → Signup (UI only)
"/forms/:id/build"           → FormBuilder
"/forms/:id/responses"       → FormResponses
"/forms/:id/stats"           → FormStats
"/forms/:id/settings"        → FormSettings
"/forms/:id/preview"         → FormPreview
"/f/:id"                     → PublicForm (form untuk responden)
```

---

## 8. Schema Database

File: `lib/db/src/schema/`

| Tabel | Kolom penting |
|---|---|
| `forms` | id, title, description, themeColor, isPublished, createdAt, updatedAt |
| `questions` | id, formId, type, title, description, required, order, options (jsonb), logic (jsonb) |
| `responses` | id, formId, completed, submittedAt |
| `answers` | id, responseId, questionId, questionTitle, value |
| `sheet_integrations` | id, formId, spreadsheetId, spreadsheetName, sheetName, enabled, lastSyncedAt |

**Yang belum ada dan perlu ditambahkan untuk auth:**
- `users` — id, name, email, passwordHash, createdAt
- `sessions` — id, userId, token, expiresAt
- Kolom `userId` di tabel `forms`

---

## 9. Integrasi Auth — Langkah Selanjutnya

Auth belum diimplementasi. Halaman login & signup sudah ada sebagai UI saja.

**Untuk mengintegrasikan BetterAuth:**

1. Install: `pnpm add better-auth` di `artifacts/api-server`
2. Tambah schema `users` dan `sessions` di `lib/db/src/schema/`
3. Jalankan `pnpm --filter @workspace/db run push`
4. Setup BetterAuth di `artifacts/api-server/src/lib/auth.ts`
5. Tambah route auth di Express: `app.use("/api/auth", authRouter)`
6. Tambah `userId` ke tabel `forms` + update semua query forms untuk filter by user
7. Di frontend: hubungkan form login/signup ke BetterAuth client
8. Buat `AuthContext` untuk menyimpan session user
9. Protect route `/` dan `/forms/*` — redirect ke `/login` jika belum auth
10. Route `/f/:id` (PublicForm) tetap publik, tidak perlu auth

---

## 10. Environment Variables

| Variable | Lokasi | Keterangan |
|---|---|---|
| `DATABASE_URL` | API server | PostgreSQL connection string |
| `PORT` | API server | Port server (default 8080) |
| `VITE_API_URL` | Frontend | URL API server (default http://localhost:8080) |
| `BETTER_AUTH_SECRET` | API server | Secret key untuk BetterAuth (tambahkan nanti) |
| `BETTER_AUTH_URL` | API server | Base URL aplikasi (tambahkan nanti) |

---

## 11. Aturan Pengembangan

1. **Jangan ubah design tokens** di `index.css` tanpa alasan kuat
2. **Selalu tambah terjemahan** di kedua bahasa (en + id) untuk setiap string baru
3. **Gunakan Lucide icons** — jangan tambah library icon lain
4. **Ikuti pola komponen** yang sudah ada sebelum membuat abstraksi baru
5. **Invalidate query cache** setiap kali melakukan mutasi data
6. **Tambah `data-testid`** pada elemen interaktif penting (button, input, card)
7. **Jangan hardcode URL** — gunakan `import.meta.env.VITE_API_URL`
8. **File komponen besar** (>300 baris) sebaiknya dipecah menjadi sub-komponen
