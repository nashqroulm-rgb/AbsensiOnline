# Analisis Aplikasi: AbsensiOnline

**Sistem Absensi GPS Pekerja Lapangan** — React + Vite + Tailwind CSS 4

Dibuat: 8 Juni 2026

---

## 1. Ringkasan

Aplikasi absensi online dengan dua role: **Admin** (dashboard web) dan **Pekerja** (PWA mobile).  
Menggunakan mock data lokal sepenuhnya — semua state di-`localStorage`, belum ada backend sungguhan.

### Tech Stack

| Layer | Teknologi |
|-------|-----------|
| Framework | React 19.2.6 |
| Bundler | Vite 7.3.2 |
| CSS | Tailwind CSS 4.1.17 |
| Routing | React Router 7.16 |
| State | useReducer + Context (localStorage persist) |
| Icons | Lucide React 1.17 |
| Charts | Recharts 3.8.1 |
| Map | Leaflet 1.9.4 (dependencies ada, tapi dipakai Canvas custom) |
| PWA | vite-plugin-pwa 1.2 |
| Single File | vite-plugin-singlefile 2.3 |
| TypeScript | 5.9.3 (strict mode) |

---

## 2. Struktur Proyek

```
AbsensiOnline/
├── public/                        # Assets publik (icon PWA, manifest)
│   ├── icon-192.png
│   ├── icon-512.png
│   └── manifest.json
├── src/
│   ├── main.tsx                   # Entry point (BrowserRouter + App)
│   ├── App.tsx                    # Routing (login / admin/* / app/*)
│   ├── index.css                  # Tailwind import + custom CSS vars
│   ├── types/index.ts             # Semua tipe TypeScript (132 baris)
│   ├── config/env.ts              # Env config (VITE_API_BASE_URL)
│   ├── utils/cn.ts                # clsx + tailwind-merge utility
│   ├── context/
│   │   └── AuthContext.tsx        # Auth wrapper (user, login, logout)
│   ├── hooks/
│   │   └── useAuth.ts            # Login logic + rate limit
│   ├── data/
│   │   └── mockData.ts            # Semua mock data & helpers (145 baris)
│   ├── store/
│   │   └── appStore.tsx           # Global store (useReducer + persist + legacy migrasi)
│   ├── services/                  # Service layer (wrap store, TODO API)
│   │   ├── attendance.service.ts  # Check-in, check-out, riwayat
│   │   ├── workers.service.ts     # CRUD worker
│   │   ├── shifts.service.ts      # CRUD shift
│   │   ├── zones.service.ts       # CRUD zona
│   │   └── reports.service.ts     # Laporan & statistik
│   └── components/
│       ├── Login.tsx              # Halaman login (2 role)
│       ├── ProtectedRoute.tsx     # Route guard by role
│       ├── ui/                    # Komponen UI reusable
│       │   ├── Badge.tsx          # Status badge (7 variant)
│       │   ├── Modal.tsx          # Modal dialog (4 ukuran)
│       │   └── Toggle.tsx         # Toggle switch
│       ├── admin/                 # Admin panel (8 halaman)
│       │   ├── AdminLayout.tsx    # Layout sidebar + header
│       │   ├── Dashboard.tsx      # Statistik, chart, activity feed
│       │   ├── WorkersPage.tsx    # CRUD pekerja + search/filter/pagination
│       │   ├── ShiftsPage.tsx     # CRUD shift + hari kerja selector
│       │   ├── ZonesPage.tsx      # CRUD zona + peta canvas interaktif
│       │   ├── AttendancePage.tsx # Rekap absensi + override status
│       │   ├── ReportsPage.tsx    # Laporan bulanan + chart antar-zona
│       │   └── SettingsPage.tsx   # Placeholder (backend not available)
│       └── pwa/                   # PWA worker (3 tab + map)
│           ├── PWALayout.tsx      # Layout bottom nav (Beranda/Riwayat/Profil)
│           ├── HomeTab.tsx        # Check-in/out + GPS + lampiran (597 baris)
│           ├── HistoryTab.tsx     # Riwayat absensi 30 hari + filter
│           ├── ProfileTab.tsx     # Profil + info penugasan + logout
│           └── GeofenceMap.tsx    # Canvas geofence visual (tanpa Leaflet)
├── .graphify/                     # Graphify pipeline scripts (gitignored)
├── graphify-out/                  # Output graphify (graph, report, wiki)
├── dist/                          # Build output (vite-plugin-singlefile)
├── dev-dist/                      # Dev PWA output
├── vite.config.ts                 # Vite config (+ PWA + singlefile plugin)
├── tsconfig.json                  # TypeScript strict config
├── index.html                     # SPA entry (lang: id)
├── package.json                   # Scripts & dependencies
├── AGENTS.md                      # Agent instructions
├── ANALISIS_APLIKASI.md           # Dokumen analisis ini
├── skills-lock.json               # Skills lock
└── .env.example                   # Env variable template
```

---

## 3. Arsitektur Data

### 3.1 Entity (TypeScript types — `src/types/index.ts`)

```
Zone        — id, nama, deskripsi, lat/lng, radius_meter, status
Shift       — id, nama, jam_mulai/selesai, toleransi_menit, ikon, hari_kerja[]
User        — id, nama, no_hp, jabatan, role, zona_id, shift_id, status, tipe, gender, foto
Attendance  — id, user_id, checkin_at, checkout_at, durasi, status, koordinat in/out
Attachment  — id, attendance_id, tipe (foto/dokumen), url, status_verifikasi
```

### 3.2 Flow State

```
localStorage (persist)
    ↕
appStore.tsx (useReducer + Context)
    ↕
Admin Pages ──→ useAppStore() / useAppStoreActions()
PWA Pages  ──→ useAppStore() + attendance.service
Auth        ──→ useAuthState() (useState hook, bukan store)
```

**Pola unik:** Ada dual-layer service + store:
- **Services** (`*service.ts`) membaca state via `readAppState()` dan menulis via `dispatchAppAction()` (external dispatch)
- **Komponen** langsung akses store via `useAppStore()` untuk baca, dan `useAppStoreActions()` untuk tulis
- Ada **migrasi legacy**: `migrateLegacyAttendances()` memindahkan data format lama ke format baru

### 3.3 Auth Flow

```
Login (no_hp + PIN '1234')
  → useAuthState.login()
    → cari user di workers[] by no_hp + role + status aktif
    → generate mock token (crypto.randomUUID())
    → simpan ke localStorage (token + user)
    → redirect ke /admin/dashboard atau /app/home
```

- **Rate limit**: 5x gagal → lock 15 menit
- **Logout**: hapus localStorage + redirect login
- **ProtectedRoute**: guard by `isAuthenticated` + `adminOnly` flag

---

## 4. Fitur per Role

### 4.1 Admin Panel (`/admin/*`)

| Halaman | File | Fitur Utama |
|---------|------|-------------|
| Dashboard | `Dashboard.tsx` | Stat card (total/hadir/terlambat/tidak hadir), donut chart, bar chart mingguan, activity feed (auto-refresh 60s), tabel check-in terbaru |
| Pekerja | `WorkersPage.tsx` | CRUD, search/filter (zona, status), pagination, inline detail expand, export button (UI only) |
| Shift | `ShiftsPage.tsx` | CRUD, jam kerja calculator, ikon picker, hari kerja selector (pill toggle), tabel |
| Zona | `ZonesPage.tsx` | CRUD, peta canvas interaktif (zoom/pan simulated), klik zona untuk detail, color-coded |
| Kehadiran | `AttendancePage.tsx` | Filter (zona, shift, status, date), search, pagination, detail expand, override status modal |
| Laporan | `ReportsPage.tsx` | Filter bulan/tahun/zona, summary stat, bar chart per-zona (%), tabel rekap bulanan dengan progress bar kehadiran + badge kinerja |
| Pengaturan | `SettingsPage.tsx` | Placeholder "backend belum tersedia" |

### 4.2 PWA Worker (`/app/*`)

| Tab | File | Fitur Utama |
|-----|------|-------------|
| Beranda | `HomeTab.tsx` | GPS detection (haversine), geofence validation, check-in (blokir jika out-of-range), check-out, timer durasi, upload lampiran (foto/dokumen), offline banner, pending sync indicator (597 baris — komponen terbesar) |
| Riwayat | `HistoryTab.tsx` | Riwayat 30 hari, filter status (semua/hadir/terlambat/izin/absen), summary pill, group by month, load more |
| Profil | `ProfileTab.tsx` | Avatar, info penugasan (zona, shift), statistik bulan ini (hardcoded), info akun, toggle notifikasi (UI only), logout dengan konfirmasi |

### 4.3 Halaman Umum

| Halaman | File | Fitur |
|---------|------|-------|
| Login | `Login.tsx` | 2 role tab (Pekerja/Admin), input no_hp + PIN, show/hide PIN, demo quick-fill, error handling |
| Splash | `App.tsx` | Redirect `/` → `/login` |

---

## 5. Detail Teknis Kunci

### 5.1 Geofence & GPS (PWA)

- **Haversine formula** — hitung jarak user ke pusat zona (dalam meter)
- **GPS blokir check-in** jika:
  - Izin GPS ditolak (error code 1)
  - Timeout (error code 3)
  - Di luar radius zona
- **EnableHighAccuracy: true**, timeout 10 detik
- **Canvas rendering** untuk geofence map (bukan Leaflet meski dependency ada) — komponen `GeofenceMap.tsx`
- **Peta admin** juga Canvas (`ZonesPage.tsx`), dengan scale projection manual

### 5.2 Offline Support

- `navigator.onLine` listener
- **Pending sync** indicator jika check-in/out saat offline
- Banner "Upload tersedia saat online" untuk lampiran
- **localStorage persist** untuk semua data absensi

### 5.3 State Management Pattern

```typescript
// Store: useReducer + Context + localStorage persist
// Pattern: dispatch → reducer → persist → re-render

// Dual akses:
// 1. Langsung via useAppStore() / useAppStoreActions()
// 2. Via service → readAppState() + dispatchAppAction() (external dispatch)
```

### 5.4 Keamanan (Mock)

- PIN statis: `1234` untuk semua user demo
- Token: `mock_${crypto.randomUUID()}`
- Tidak ada enkripsi atau hashing password
- Rate limit: 5 gagal → lock 15 menit (in-memory, hilang jika refresh)

### 5.5 UI Patterns

- **Tailwind CSS 4** dengan CSS custom properties
- **Scrollbar kustom** — 4px, thin
- **Mobile-safe** — `safe-area-inset-bottom`, `overscroll-behavior: none`
- `@` alias mapping ke `src/`
- Semua font system stack (-apple-system, BlinkMacSystemFont, Segoe UI)
- Warna konsisten via CSS vars: `--green`, `--amber`, `--red`, `--blue`

---

## 6. Service Layer (Semua TODO)

Semua service memiliki `// TODO:` untuk diganti dengan API call:

| Service | Method | Endpoint (TODO) |
|---------|--------|-----------------|
| `attendance.service.ts` | `getAttendances()` | GET /api/attendance |
| | `submitCheckIn()` | POST /api/attendance/check-in |
| | `submitCheckOut()` | POST /api/attendance/check-out |
| | `getHistory()` | GET /api/attendance/history?userId= |
| `workers.service.ts` | `getWorkers()` | GET /api/workers |
| | `createWorker()` | POST /api/workers |
| `shifts.service.ts` | `getShifts()` | GET /api/shifts |
| | `createShift()` | POST /api/shifts |
| `zones.service.ts` | `getZones()` | GET /api/zones |
| | `createZone()` | POST /api/zones |
| `reports.service.ts` | `getMonthlyReport()` | GET /api/reports/monthly |
| | `getWeeklyData()` | GET /api/reports/weekly |
| | `getActivityFeed()` | GET /api/reports/activity |
| | `getReportSummary()` | GET /api/reports/summary |

---

## 7. Potensi Improvements

### Prioritas Tinggi (Blocking Production)
1. **Backend API integration** — semua service return mock, perlu ganti ke API beneran
2. **Password hashing** — PIN `1234` hardcoded, tidak aman
3. **Sync engine** — offline check-in/out harus sync ke server saat online (pending sync hanya indikator, belum ada queue)
4. **Leaflet integration** — dependency leaflet sudah ada tapi tidak dipakai; Canvas geofence tidak akurat
5. **React key fix** — `WorkersPage.tsx` dan `AttendancePage.tsx` punya fragment tanpa key (console warning)
6. **Service layer completion** — `updateWorker/deleteWorker`, `updateShift/deleteShift`, `updateZone/deleteZone` semua throw error
7. **Input validation** — zone koordinat, worker no_hp duplicate, shift time logic

### Medium (Quality)
8. **Unit tests** — belum ada test sama sekali
9. **Error boundary** — React error boundary belum ada
10. **Code splitting** — tidak ada `React.lazy()`, semua route dimuat sekaligus
11. **Component splitting** — `HomeTab.tsx` 597 baris harus dipecah (GPSStatus, CheckInOut, AttachmentSection)
12. **Hardcoded data** — Dashboard shift counts, Profile stats, Reports zone data harus dari data aktual
13. **Memory leak** — `URL.createObjectURL()` tidak di-revoke

### Low (Nice to Have)
14. **Pull-to-refresh** — belum ada untuk PWA
15. **PWA update prompt** — autoUpdate dari vite-plugin-pwa, user tidak dikasih tahu
16. **Dark mode** — belum ada
17. **Animasi transisi page** — belum ada route transition
18. **Export** — tombol export ada UI tapi tidak ada logic
19. **Accessibility** — ARIA labels, focus trap, keyboard navigation
20. **Undo/hapus konfirmasi** — admin bisa hapus data tanpa konfirmasi

---

## 8. Bug & Code Quality Issues

### React Key Warning

- **`WorkersPage.tsx:277`** — Fragment `<>` tanpa `key` saat map paginated workers. React akan warning di console.
- **`AttendancePage.tsx:138`** — Sama, fragment tanpa key saat map attendances.
- **Fix:** Bungkus dengan `<React.Fragment key={item.id}>` atau pindahkan key ke parent.

### Data Hardcoded (Tidak Dinamis)

| Lokasi | Issue |
|--------|-------|
| `Dashboard.tsx:106-110` | Shift counts (`count: 4, 2, 1`) hardcoded, seharusnya hitung dari `attendances[]` |
| `Dashboard.tsx:104` | `absen` dihitung `+ 1` secara manual — magic number |
| `ProfileTab.tsx:27-31` | Statistik bulanan (`20 hadir, 2 terlambat, 1 izin`) hardcoded, bukan dari data |
| `ReportsPage.tsx:9-14` | `zoneBarData` hardcoded, seharusnya aggregate dari `attendances[]` per zona |
| `AdminLayout.tsx:22` | `notifCount` state hardcoded `3`, tidak pernah di-update |

### Service Layer Incomplete

- `workers.service.ts:19-21` — `updateWorker()` dan `deleteWorker()` **throw error**, belum diimplementasi
- `shifts.service.ts:19-21` — `updateShift()` dan `deleteShift()` **throw error**
- `zones.service.ts:19-21` — `updateZone()` dan `deleteZone()` **throw error**
- Semua CRUD di komponen admin langsung pakai `useAppStoreActions()` bukan service — service layer sebagian besar unused

### Data Integrity

- **Zona koordinat** — tidak ada validasi input; latitude/longitude bisa NaN atau 0
- **Shift times** — tidak dicek apakah `jam_selesai > jam_mulai` (overnight shift handled, tapi UI tidak jelas)
- **Worker duplicate** — tidak ada pengecekan no_hp duplicate saat create
- **Attendance status derivation** — `deriveStatus()` di `appStore.tsx:54` bisa salah untuk overnight shift (23:00→07:00)

### Unused Code

- `leaflet` dependency — terinstall tapi tidak dipakai (GeofenceMap pakai Canvas)
- `env.ts` — `apiBaseUrl` di-declare tapi belum dipakai di service manapun
- `Badge.tsx` export `getStatusBadgeVariant` — duplicated import pattern di banyak komponen

---

## 9. Security Issues (Critical for Production)

### Authentication

- **PIN plaintext** — `password === '1234'` di `useAuth.ts:63`. Tidak ada hashing.
- **Token di localStorage** — rentan XSS. `localStorage.getItem('absensi_token')` bisa diakses script malicious.
- **No token expiry** — token berlaku selamanya sampai logout manual.
- **Mock token** — `mock_${crypto.randomUUID()}` tidak valid untuk JWT atau session management.

### Input Validation

- **Login form** — tidak ada sanitasi input `noHp` atau `pin` sebelum dipakai
- **Worker form** — `nama` dan `no_hp` hanya dicek `trim()` length, tidak ada regex/whitelist
- **Zone form** — `parseFloat()` dan `parseInt()` tanpa fallback untuk NaN

### Data Exposure

- **Semua data** (users, attendances, shifts, zones) tersimpan di `localStorage` dan bisa diakses via browser dev tools
- **No encryption** pada data sensitive
- **Mock data** bisa di-edit langsung di console untuk bypass auth

### Missing Security Headers

- No CSP (Content Security Policy) headers
- No X-Frame-Options
- No rate limiting di server side (hanya client-side in-memory)

---

## 10. Accessibility (a11y) Issues

### Missing

- **No ARIA labels** — tombol icon-only (Bell, Edit2, Trash2) tidak punya `aria-label`
- **No keyboard navigation** — modal tidak trap focus, Escape key tidak handle (kecuali backdrop click)
- **No skip-to-content link** — admin layout harus tab melalui seluruh sidebar
- **No role attributes** — table, navigation, main tidak pakai ARIA landmarks
- **No live regions** — action messages (success/error) tidak announce ke screen reader
- **Color contrast** — beberapa kombinasi warna (gray-400 text on white) mungkin tidak meet WCAG AA

### Partial

- Modal punya `onClose` tapi tidak handle Escape key secara explicit
- Toggle punya `cursor-pointer` tapi tidak punya `role="switch"` atau `aria-checked`
- Badge tidak informatif untuk screen reader (hanya visual indicator)

---

## 11. Performance Concerns

### Bundle

- **No code splitting** — semua routes dimuat sekaligus di `App.tsx`. Tidak ada `React.lazy()`.
- **Recharts** — library besar (~200KB) dimuat meski hanya dipakai di Dashboard dan Reports
- **Leaflet** — dependency ~150KB tidak dipakai tapi terinstall
- **vite-plugin-singlefile** — inline semua ke 1 HTML file, bagus untuk distribusi tapi buruk untuk caching

### Runtime

- **GeofenceMap canvas** — re-render seluruh canvas di setiap prop change (bukan diff-based)
- **Dashboard auto-refresh** — `setInterval(60000)` tanpa cleanup yang proper (useEffect dependency kosong)
- **useMemo missing** — `HomeTab.tsx` tidak pakai useMemo untuk derived data (distance, inRange, shiftActive)
- **Large component** — `HomeTab.tsx` 597 baris, idealnya di-split ke sub-komponen (GPSStatus, CheckInOut, AttachmentSection)

### Memory

- `URL.createObjectURL(file)` di `HomeTab.tsx:272` — tidak di-revoke, memory leak untuk file besar
- Legacy migration (`migrateLegacyAttendances()`) berjalan di setiap app start

---

## 12. UX Gaps

### PWA Worker

- **Tidak ada konfirmasi checkout** — langsung eksekusi, bisa accidental tap
- **Tidak ada loading skeleton** — data load tanpa visual placeholder
- **Tidak ada empty state illustration** — "Belum ada lampiran hari ini" hanya teks
- **Tidak ada pull-to-refresh** — harus hard refresh untuk update data
- **History filter default** — "Load more" button kurang intuitive; lebih baik infinite scroll atau "Lihat Semua"

### Admin

- **Tidak ada undo** — hapus worker/shift/zone langsung permanen
- **Tidak ada konfirmasi hapus** — langsung hapus tanpa dialog
- **Export buttons** — UI ada tapi tidak ada logic, user akan kecewa
- **Settings placeholder** — halaman kosong tanpa penjelasan kapan akan tersedia

### Login

- **Tidak ada "Lupa PIN" flow** — user yang lupa PIN terkunci tanpa jalan keluar
- **Tidak ada loading state awal** — splash screen tidak ada, langsung render login
- **Demo credentials** — bagus untuk testing tapi bisa confusion di produksi jika tidak di-remove

---

## 13. Architecture Issues

### Dual Access Pattern (Store + Service)

```
Komponen → useAppStore() → state langsung
Komponen → useAppStoreActions() → dispatch langsung
Service  → readAppState() → dispatchAppAction() (external dispatch)
```

- **Problem:** Dua jalur write ke store yang sama bisa race condition
- **Problem:** `externalDispatch` di `appStore.tsx:195` adalah mutable reference — bisa stale closure jika component unmount
- **Recommendation:** Consolidate ke satu pattern saja (service ATAU direct store access)

### Auth vs Store Separation

- Auth state (`useAuthState`) di hook terpisah dari `appStore`
- User data ada di **dua tempat**: `localStorage.user` (auth) dan `appStore.workers[]` (data)
- `WorkersPage.tsx:160` — `state.workers` di-sync manual, bisa stale jika user di-update di auth
- Seharusnya satu source of truth

### No Error Handling

- Service methods return empty array on error (silent failure)
- `HomeTab.tsx` — GPS error ditampilkan tapi check-in button hanya disabled, tidak ada retry UX yang jelas
- No global error boundary — crash di satu komponen crash seluruh app
- No try-catch di kebanyakan async operations

### Legacy Migration

- `migrateLegacyAttendances()` berjalan di **setiap app start** (`loadAppState()`)
- Cek `localStorage.getItem('attendances')` setiap render — minor overhead
- Setelah migrasi, key lama dihapus — tapi tidak ada fallback jika migration corrupt data

---

## 14. Metrik Kode

| Metrik | Value |
|--------|-------|
| Total file komponen | 18 file |
| Total baris komponen admin | ~1,694 baris |
| Total baris komponen PWA | ~1,127 baris |
| Komponen terbesar | `HomeTab.tsx` (597 baris) |
| File service | 5 file (~250 baris) |
| Mock data | `mockData.ts` (145 baris) |
| Type definitions | `types/index.ts` (132 baris) |

---

## 15. Ringkasan Command

```bash
npm run dev      # Dev server
npm run build    # Build produksi (+ singlefile + PWA)
npm run preview  # Preview build
```

Login demo:
- **Pekerja**: `081234567890` / PIN `1234`
- **Admin**: `080000000001` / PIN `1234`

---

## 16. Production Context

### Target Deployment

- Backend: Supabase (PostgreSQL + Auth + Storage + Realtime)
- Frontend: Vercel (sama seperti kurirdev)
- "Production ready" = aplikasi siap dipakai oleh perusahaan/startup secara nyata

### Backend Architecture (Supabase)

Semua service layer (`*.service.ts`) yang saat ini mock akan diganti ke Supabase client:

- Auth → Supabase Auth (ganti mock PIN/token)
- Data (workers, shifts, zones, attendance) → Supabase PostgreSQL via supabase-js
- File upload (lampiran foto/dokumen) → Supabase Storage
- Realtime dashboard → Supabase Realtime subscriptions

### Production Scope (MVP)

Yang HARUS selesai sebelum go-live:

1. Supabase Auth (ganti hardcoded PIN 1234 + mock token)
2. Database schema + RLS policies untuk semua entity
3. Service layer → Supabase client (semua TODO endpoints)
4. Service layer completion (update/delete yang masih throw error)
5. Fix hardcoded data (Dashboard stats, Profile stats, Reports zone data)
6. Input validation (koordinat zona, duplicate no_hp, shift time)
7. Error boundary global
8. React key warnings fix
9. Konfirmasi hapus (admin)
10. Remove demo credentials dari Login UI

Yang BOLEH ditunda (post-MVP):

- Unit tests
- Dark mode
- Pull-to-refresh
- Animasi transisi
- Accessibility lengkap
- Export CSV/PDF
- PWA update prompt

### Notes

- Leaflet: evaluasi apakah perlu diganti dari Canvas, tapi bukan blocker MVP
- Offline sync queue: implementasi dasar (queue ke localStorage, flush saat online) cukup untuk MVP
- AGENTS.md sudah ada di repo — jangan overwrite.
