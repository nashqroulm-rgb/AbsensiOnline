# TASKS.md — Daftar Task Atomic MVP

Setiap task: ID, judul, file yang diubah/ditambah, dependency, kriteria selesai.
Urutan berdasarkan dependency graph.

---

## Phase 0: Infrastructure & Config

### T01 — Install @supabase/supabase-js
- **File:** `package.json`
- **Dependency:** -
- **Aksi:** `npm install @supabase/supabase-js`
- **Kriteria:** `node_modules/@supabase/supabase-js` ada, `npm run build` tidak error

### T02 — Buat Supabase client config
- **File:** `src/config/supabase.ts` (BARU)
- **Dependency:** T01
- **Aksi:** Buat file baru dengan `createClient(VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY)`
- **Kriteria:** Export `supabase` client, bisa di-import tanpa error

### T03 — Update .env.example
- **File:** `.env.example`
- **Dependency:** T01
- **Aksi:** Hapus `VITE_API_BASE_URL`, tambah `VITE_SUPABASE_URL` dan `VITE_SUPABASE_ANON_KEY`
- **Kriteria:** `.env.example` berisi 3 vars (URL, KEY, APP_NAME)

### T04 — Update TypeScript types (ID → UUID)
- **File:** `src/types/index.ts`
- **Dependency:** -
- **Aksi:** Tambah `export type UUID = string;` sebagai type alias. Tidak mengubah field `id: string` secara literal — hanya documentasi. (ID tetap `string` di TS, UUID di database)
- **Kriteria:** `npm run build` tidak error, type tetap compatible

---

## Phase 1: Auth Migration

### T05 — Update useAuth hook (mock → Supabase)
- **File:** `src/hooks/useAuth.ts`
- **Dependency:** T02
- **Aksi:**
  - Import `supabase` dari `config/supabase`
  - Login: query `users` table WHERE `no_hp` = username AND `role` = role AND `status` = 'aktif'
  - Jika PIN = '1234', login via `supabase.auth.signInWithPassword({ email: '${no_hp}@absensi.local', password: pin })`
  - Token: gunakan `supabase.auth.getSession()` — bukan mock token
  - Logout: `supabase.auth.signOut()`
  - Hapus rate limit in-memory (Supabase Auth punya built-in rate limiting)
- **Kriteria:** Login dengan no_hp + PIN '1234' berhasil, token valid, logout bersih

### T06 — Update AuthContext (session dari Supabase)
- **File:** `src/context/AuthContext.tsx`
- **Dependency:** T05
- **Aksi:**
  - Subscribe ke `supabase.auth.onAuthStateChange`
  - Sync session state dengan auth state
  - Hapus localStorage manual keys (`absensi_token`, `absensi_user`)
- **Kriteria:** Setelah login, `isAuthenticated` = true, `user` terisi dari Supabase users table

### T07 — Remove demo credentials dari Login UI
- **File:** `src/components/Login.tsx`
- **Dependency:** T05
- **Aksi:**
  - Hapus tombol "Demo Akses" (section `Demo Credentials`)
  - Hapus fungsi `fillDemo()`
  - Hapus PIN hint "PIN: 1234" dari UI
- **Kriteria:** Login UI tidak menampilkan demo credentials atau PIN hint

---

## Phase 2: Service Layer → Supabase

### T08 — Rewrite zones.service.ts
- **File:** `src/services/zones.service.ts`
- **Dependency:** T02
- **Aksi:**
  - Import `supabase` dari `config/supabase`
  - `getZones()`: `supabase.from('zones').select('*')`
  - `getZoneById(id)`: `supabase.from('zones').select('*').eq('id', id).single()`
  - `createZone(zone)`: `supabase.from('zones').insert(zone).select().single()`
  - `updateZone(id, data)`: `supabase.from('zones').update(data).eq('id', id).select().single()`
  - `deleteZone(id)`: `supabase.from('zones').delete().eq('id', id)`
  - Return type: `ServiceResult<T>` (bukan throw error)
- **Kriteria:** Semua method return `ServiceResult<T>`, tidak ada throw error

### T09 — Rewrite shifts.service.ts
- **File:** `src/services/shifts.service.ts`
- **Dependency:** T02
- **Aksi:** Sama seperti T08, tapi untuk shifts table
- **Kriteria:** Semua method return `ServiceResult<T>`

### T10 — Rewrite workers.service.ts
- **File:** `src/services/workers.service.ts`
- **Dependency:** T02
- **Aksi:** Sama seperti T08, tapi untuk users table
- **Kriteria:** Semua method return `ServiceResult<T>`, `getWorkers()` exclude `role = 'super_admin'`

### T11 — Rewrite attendance.service.ts
- **File:** `src/services/attendance.service.ts`
- **Dependency:** T02, T08, T09
- **Aksi:**
  - `getAttendances()`: select all, order by `checkin_at` desc
  - `submitCheckIn(payload)`: insert ke attendances, call `derive_attendance_status` via RPC atau client-side
  - `submitCheckOut(id, payload)`: update checkout_at + durasi_menit
  - `getTodayAttendance(userId)`: filter by user_id + today date
  - `getHistory(userId)`: filter by user_id, order by date desc
  - Hapus dependency ke `mockData.ts` (generateHistory, getShiftById)
- **Kriteria:** Tidak ada import dari mockData, semua return `ServiceResult<T>`

### T12 — Rewrite reports.service.ts
- **File:** `src/services/reports.service.ts`
- **Dependency:** T02, T11
- **Aksi:**
  - `getMonthlyReport()`: RPC `get_monthly_report` atau aggregate query
  - `getWeeklyData()`: aggregate attendances per day of week
  - `getActivityFeed()`: join attendances + users, order by created_at desc, limit 20
  - `getReportSummary()`: sum/avg dari monthly
  - Hapus dependency ke `mockData.ts`
- **Kriteria:** Tidak ada import dari mockData, return data real dari Supabase

---

## Phase 3: Offline Queue & Error Handling

### T13 — Buat offline queue utility
- **File:** `src/utils/offlineQueue.ts` (BARU)
- **Dependency:** -
- **Aksi:**
  - Implementasi `getPendingQueue()`, `addToQueue()`, `markSynced()`, `flushQueue()`
  - Simpan ke localStorage key `absensi_offline_queue`
- **Kriteria:** Queue bisa add, mark synced, flush. Unit test manual: add item → refresh → masih ada

### T14 — Buat ErrorBoundary component
- **File:** `src/components/ErrorBoundary.tsx` (BARU)
- **Dependency:** -
- **Aksi:**
  - Class component dengan `getDerivedStateFromError` + `componentDidCatch`
  - Fallback UI: pesan error + tombol "Coba lagi" (reload)
- **Kriteria:** Component bisa catch render error, tampilkan fallback UI

### T15 — Register ErrorBoundary di App.tsx
- **File:** `src/App.tsx`
- **Dependency:** T14
- **Aksi:**
  - Wrap entire `<Routes>` dengan `<ErrorBoundary>`
- **Kriteria:** App restart saat error, ErrorBoundary menampilkan fallback

### T16 — Buat useSupabaseQuery hook
- **File:** `src/hooks/useSupabaseQuery.ts` (BARU)
- **Dependency:** -
- **Aksi:**
  - Generic hook: `useSupabaseQuery<T>(fetcher, deps)`
  - Return `{ data, loading, error }`
  - Handle loading state, error state, cleanup
- **Kriteria:** Hook bisa dipakai di component, return loading/data/error

---

## Phase 4: Admin Components Update

### T17 — Update Dashboard (dynamic data)
- **File:** `src/components/admin/Dashboard.tsx`
- **Dependency:** T11, T12, T16
- **Aksi:**
  - Ganti `donutData` hardcoded → hitung dari `attendances[]` hari ini
  - Ganti `activeShifts` count → hitung dari `attendances[]` per shift
  - Ganti `absen + 1` → `totalWorkers - hadir - terlambat`
  - Ganti `weeklyData` dari reports.service → Supabase query
  - Ganti `activityFeed` dari reports.service → Supabase query
  - Subscribe ke Realtime untuk auto-update
- **Kriteria:** Dashboard menampilkan data real, bukan hardcoded

### T18 — Update WorkersPage (service calls + validation)
- **File:** `src/components/admin/WorkersPage.tsx`
- **Dependency:** T10
- **Aksi:**
  - Ganti `useAppStoreActions()` → `workers.service` methods
  - Tambah input validation: `no_hp` unique check, `nama` required
  - Fix React key warning (fragment tanpa key)
- **Kriteria:** CRUD workers via service, tidak ada console warning

### T19 — Update ShiftsPage (service calls + validation)
- **File:** `src/components/admin/ShiftsPage.tsx`
- **Dependency:** T09
- **Aksi:**
  - Ganti `useAppStoreActions()` → `shifts.service` methods
  - Tambah input validation: `jam_mulai` < `jam_selesai` (atau overnight), `toleransi_menit` ≥ 0
- **Kriteria:** CRUD shifts via service, validation jalan

### T20 — Update ZonesPage (service calls + validation)
- **File:** `src/components/admin/ZonesPage.tsx`
- **Dependency:** T08
- **Aksi:**
  - Ganti `useAppStoreActions()` → `zones.service` methods
  - Tambah input validation: `latitude` -90..90, `longitude` -180..180, `radius_meter` > 0
- **Kriteria:** CRUD zones via service, validation jalan

### T21 — Update AttendancePage (service calls)
- **File:** `src/components/admin/AttendancePage.tsx`
- **Dependency:** T11
- **Aksi:**
  - Ganti store read → `attendance.service.getAttendances()`
  - Override status via service
  - Fix React key warning
- **Kriteria:** Data attendances dari Supabase, tidak ada console warning

### T22 — Update ReportsPage (dynamic data)
- **File:** `src/components/admin/ReportsPage.tsx`
- **Dependency:** T12
- **Aksi:**
  - Ganti `zoneBarData` hardcoded → aggregate dari `reports.service`
  - Filter bulan/tahun → query Supabase dengan date range
- **Kriteria:** Reports menampilkan data real per zona

### T23 — Add delete confirmation ke admin components
- **File:** `src/components/admin/WorkersPage.tsx`, `ShiftsPage.tsx`, `ZonesPage.tsx`
- **Dependency:** T18, T19, T20
- **Aksi:**
  - Sebelum delete, tampilkan Modal konfirmasi "Yakin hapus [nama]?"
  - Tombol "Batal" + "Hapus" (merah)
- **Kriteria:** Hapus data memerlukan konfirmasi

---

## Phase 5: PWA Components Update

### T24 — Update HomeTab (Supabase + offline queue)
- **File:** `src/components/pwa/HomeTab.tsx`
- **Dependency:** T11, T13
- **Aksi:**
  - `submitCheckIn()` → via attendance.service → Supabase
  - `submitCheckOut()` → via attendance.service → Supabase
  - Jika offline: tambah ke offline queue
  - `getTodayAttendance()` → via attendance.service
  - Attachments upload → Supabase Storage
  - Hapus `simulateUpload()` → real upload
- **Kriteria:** Check-in/out ke Supabase, offline queue jalan, upload real

### T25 — Update HistoryTab (Supabase queries)
- **File:** `src/components/pwa/HistoryTab.tsx`
- **Dependency:** T11
- **Aksi:**
  - Ganti `getHistory()` dari mock → Supabase
  - Tidak ada lagi `generateHistory()` merge
- **Kriteria:** History menampilkan data real dari Supabase

### T26 — Update ProfileTab (dynamic stats)
- **File:** `src/components/pwa/ProfileTab.tsx`
- **Dependency:** T11
- **Aksi:**
  - Ganti `statsBulanIni` hardcoded → query attendances bulan ini per user
  - Hitung hadir/terlambat/izin dari data real
- **Kriteria:** Profile stats menampilkan data real

---

## Phase 6: Hardcoded Data Cleanup

### T27 — Fix hardcoded data di AdminLayout
- **File:** `src/components/admin/AdminLayout.tsx`
- **Dependency:** T12
- **Aksi:**
  - Ganti `notifCount` hardcoded 3 → 0 atau query
- **Kriteria:** Notif count bukan hardcoded

### T28 — Update appStore.tsx (remove write actions, keep read cache)
- **File:** `src/store/appStore.tsx`
- **Dependency:** T17-T26
- **Aksi:**
  - Pertahankan `useAppStore()` untuk **read** dari localStorage cache
  - Hapus atau simplify `useAppStoreActions()` (write sekarang via service)
  - Hapus `dispatchAppAction()` external dispatch
  - Pertahankan `loadAppState()` + `persistState()` untuk cache
  - Pertahankan `buildAttendanceFromCheckIn()` helper
- **Kriteria:** Store hanya untuk read cache, write via service

### T29 — Hapus mockData.ts
- **File:** `src/data/mockData.ts`
- **Dependency:** T11, T12, T17, T25, T26
- **Aksi:**
  - Hapus file `mockData.ts`
  - Pastikan tidak ada import tersisa
- **Kriteria:** `npm run build` tidak error, tidak ada import mockData

---

## Phase 7: Validation & Cleanup

### T30 — Tambah input validation ke service/component
- **File:** `src/services/*.service.ts`, admin components
- **Dependency:** T08-T12
- **Aksi:**
  - Zona: validasi lat/lng/radius sebelum insert
  - Worker: validasi no_hp format, duplicate check
  - Shift: validasi jam format, toleransi ≥ 0
- **Kriteria:** Invalid input ditolak dengan error message jelas

### T31 — Fix memory leak (URL.createObjectURL)
- **File:** `src/components/pwa/HomeTab.tsx`
- **Dependency:** -
- **Aksi:**
  - `URL.createObjectURL()` → revoke saat component unmount atau file dihapus
  - Tambah cleanup di useEffect return
- **Kriteria:** Tidak ada objectURL yang bocor

### T32 — Hapus config/env.ts yang tidak terpakai
- **File:** `src/config/env.ts`
- **Dependency:** T02
- **Aksi:**
  - Hapus file atau update isi (hanya `appName`)
- **Kriteria:** `npm run build` tidak error

---

## Dependency Graph (visual)

```
T01 ─→ T02 ─→ T05 ─→ T06 ─→ T07
 │       │
 │       ├→ T08 ─→ T20 ─→ T23
 │       ├→ T09 ─→ T19 ─→ T23
 │       ├→ T10 ─→ T18 ─→ T23
 │       └→ T11 ─→ T12 ─→ T17
 │               │       ├→ T27
 │               │       └→ T28
 │               ├→ T24
 │               ├→ T25
 │               └→ T26
 │
 ├→ T03
 └→ T04

T13 (offline queue)
T14 → T15 (error boundary)
T16 (useSupabaseQuery)

T29 setelah T11, T12, T17, T25, T26
T30 setelah T08-T12
T31, T32 independent
```

---

## Execution Order (Rekomendasi)

```
Phase 0: T01, T02, T03, T04
Phase 1: T05, T06, T07
Phase 2: T08, T09, T10, T11, T12
Phase 3: T13, T14, T15, T16
Phase 4: T17, T18, T19, T20, T21, T22, T23
Phase 5: T24, T25, T26
Phase 6: T27, T28, T29
Phase 7: T30, T31, T32
```

---

## Total Tasks: 32

- Phase 0: 4 tasks (infra)
- Phase 1: 3 tasks (auth)
- Phase 2: 5 tasks (services)
- Phase 3: 4 tasks (offline + error)
- Phase 4: 7 tasks (admin)
- Phase 5: 3 tasks (pwa)
- Phase 6: 3 tasks (cleanup)
- Phase 7: 3 tasks (validation)
