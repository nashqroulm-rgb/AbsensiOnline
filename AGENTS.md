# AbsensiOnline — agent guide

React + Vite + Tailwind attendance app: **admin dashboard** (`src/components/admin/`) and **worker PWA** (`src/components/pwa/`). Backend Supabase (migrasi di `supabase/migrations/`, edge functions di `supabase/functions/` — hanya `admin-user` & `cloudinary-delete`, keduanya ter-gate role admin).

## Status perbaikan

Status kebenaran satu-satunya: **`FIXPLAN.md`** (v1.1+). Checklist lama `REMEDIATION_TASKS.md` tidak valid — jangan dipercaya. Centang task hanya setelah verifikasi langsung, sertakan bukti.

## Arsitektur singkat

- Auth: `src/hooks/useAuth.ts` (Supabase; login = no_hp + PIN 6 digit via email sintetis `{no_hp}@absensi.local`; profil segar dari tabel `users`)
- Service layer: `src/services/*.service.ts` — pola `ServiceResult<T>` konsisten
- Tanggal/waktu: **wajib** lewat `src/utils/wib.ts` (Asia/Jakarta) — jangan pakai `toISOString().split('T')[0]`
- Aturan bisnis absensi ditegakkan server-side (trigger DB: status terlambat, guard insert, audit override)
- Offline check-in: `src/utils/offlineQueue.ts` (dipakai HomeTab)

## Graphify (codebase map)

Knowledge graph lives in `graphify-out/`. Use it before broad greps or reading many source files.

Graphify pipeline scripts (`run_*.py`) live in `.graphify/scripts/` (gitignored). If they reappear under `graphify-out/`, delete or ignore them.

1. **Start:** `graphify-out/wiki/index.md` or `graphify-out/GRAPH_REPORT.md`
2. **Scoped questions:** `graphify query "<question>"` (from repo root)
3. **After you change `.ts`/`.tsx`:** `graphify update .`

Full regen (LLM semantic pass): `/graphify .`

## Caveman (token efficiency)

Default: **lite** — tight prose, no filler. Stronger: `/caveman full|ultra`. Off: "normal mode".
Commits: use **caveman-commit** skill.

## Stack

`npm run dev` | `npm run build` (= `tsc --noEmit && vite build`) | `npm run preview`
