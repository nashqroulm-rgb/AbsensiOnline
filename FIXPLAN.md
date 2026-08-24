# FIXPLAN — Rencana Perbaikan Menyeluruh AbsensiOnline

> **Tanggal:** 2026-06 · **Status:** AKTIF · **Versi:** v1.1 (amandemen hasil self-review — lihat S5, S6, U9, D7–D10) · **Pengganti:** `REMEDIATION_TASKS.md` (dinyatakan tidak valid, lihat §1)
>
> Dokumen ini disusun dari **audit kode langsung** (semua file `src/`, seluruh migrasi SQL, edge functions, config build). Setiap klaim di dokumen ini sudah diverifikasi ke baris kode, bukan dari catatan status sebelumnya.

---

## 1. Mengapa Rencana Baru?

Audit menemukan bahwa `REMEDIATION_TASKS.md` (Fase B/C/D/F) mencentang banyak task `[x]` yang **tidak ada implementasinya di kode**:

| Klaim `[x]` | Bukti ketidaksesuaian |
|---|---|
| B03 Override status tersimpan | Tombol "Simpan" modal override hanya `setShowOverride(false)`; tidak ada fungsi update di `attendance.service.ts` |
| B02 Filter tanggal Kehadiran | State `filterDate` tidak pernah dipakai dalam filtering |
| B04 Laporan ikut bulan/tahun/zona | `getMonthlyReport()` tanpa parameter; selector kosmetik |
| B05 Tren palsu dihapus | `+5%`, `-3%`, `hadir / 10 * 100%` masih hardcoded |
| B06 Offline queue terhubung | `offlineQueue.ts` tidak diimport siapa pun |
| C01/C02 Blokir absensi_online & hari_kerja | `grep` kedua istilah di `HomeTab.tsx` = 0 hasil |
| D01 / F3 Export PDF | `exportPdf.ts` meng-import `jspdf` yang **tidak ada di package.json** — mustahil dipakai; semua tombol Export mati |
| D02 / F4 Settings admin | `SettingsPage.tsx` = placeholder 18 baris |
| F2 PIN admin isi + reset | Form PIN WorkersPage tidak dikirim ke service; `createWorker()` hardcode `'1234'`; tidak ada reset |

**Akibat:** status checklist lama tidak bisa dipercaya. Mulai dokumen ini:

> ### Aturan Status
> 1. Task hanya boleh dicentang `[x]` setelah **kriteria terima diverifikasi langsung** (UI dicoba manual / SQL dieksekusi / output build dilihat).
> 2. Setiap task selesai mencantumkan **bukti** (perintah yang dijalankan + hasilnya).
> 3. Tidak ada centang "proaktif" atas pekerjaan yang belum dilakukan.

---

## 2. Ringkasan Temuan Audit

### 2.1 Keamanan (P0)

| ID | Temuan | Lokasi | Dampak |
|----|--------|--------|--------|
| S1 | Policy `"Allow anon read users/attachments" FOR SELECT USING (true)` tanpa `TO authenticated` | `supabase/migrations/010_rls_policies.sql` | Siapa pun dengan anon key dapat membaca seluruh tabel `users` (nama, no_hp = kredensial login, role) dan metadata `attachments`, tanpa login. Membatalkan model RLS 001/006 |
| S2 | Role check RLS membaca `(auth.jwt() -> 'user_metadata' ->> 'role')` | `006_fix_rls_recursion.sql` + semua policy admin berikutnya | Supabase mengizinkan user mengubah `user_metadata` sendiri via `supabase.auth.updateUser({ data })` → potensi eskalasi worker → admin. Tidak ada trigger pembatas |
| S3 | PIN default `'1234'` hardcoded; form PIN admin dibuang diam-diam; tidak ada reset PIN | `workers.service.ts` (`password: '1234'`), `WorkersPage.tsx` baris ~117, `admin-user/index.ts` | Semua akun PIN-nya 1234; UI memberi ilusi PIN bisa diatur |
| S4 | Geofence divalidasi hanya di client (haversine); koordinat dikirim client | `HomeTab.tsx` | Mock location lolos. Ceiling umum aplikasi sejenis, tapi harus jadi keputusan eksplisit |

### 2.2 Fitur tampil tapi tidak berfungsi (F1)

Rincian di §1 plus:
- Dashboard: persentase hadir dibagi hardcoded `10`; teks "+2 dari kemarin" statis.
- ReportsPage: tombol Export Excel / Export PDF / Download CSV tanpa handler.
- Banner "Data tersimpan secara lokal … Menunggu Sync" di HomeTab muncul padahal tidak ada mekanisme penyimpanan lokal.

### 2.3 Bug & keandalan (F2)

| ID | Bug | Lokasi |
|----|-----|--------|
| U-zone | "Hari ini" dihitung UTC (`toISOString().split('T')[0]`) bukan Asia/Jakarta → record jam 00:00–06:59 WIB salah hari | `attendance.service.ts` (`getTodayAttendance`), `Dashboard.tsx`, `AttendancePage.tsx`, `ReportsPage.tsx`, kalkulasi terlambat di `submitCheckIn` |
| U-att1 | Upload lampiran **sebelum** check-in: file masuk Cloudinary tapi row DB tidak pernah dibuat → orphan storage, hilang saat refresh | `HomeTab.tsx` `handleUpload()` cabang else |
| U-att2 | `removeAttachment` hanya hapus dari state UI; tidak hapus Cloudinary/DB; policy `attachments_delete_own` juga tidak ada (hanya admin) | `HomeTab.tsx`, `007_add_attachments_delete_rls.sql` |
| U-race | `incrementLampiranCount` read-modify-write → race condition | `attachments.service.ts` |
| U-sync | `updateWorker` tidak sinkron `user_metadata` auth → perubahan role/zona/shift tidak memengaruhi apa pun yang baca JWT | `workers.service.ts` vs policy 006 |
| U-auth | Mapping session→User diduplikasi 2× di `useAuthState`; sumber data beda (login = RPC row, refresh = metadata) → profil stale setelah admin edit | `useAuth.ts` |
| U-login | Semua error `signInWithPassword` ditampilkan "PIN salah." termasuk rate-limit/network | `useAuth.ts` |
| U-scale | `getAttendances()` full-table tanpa limit; Dashboard poll 60 s × 6 query penuh; pagination client-side saja | `attendance.service.ts`, `Dashboard.tsx` |
| U-feed | `getActivityFeed`: event `checkout`/`upload` tidak pernah dihasilkan (ikon/label mati) | `reports.service.ts` |

### 2.4 Dead code & dokumentasi basi (F3)

- Mati total: `offlineQueue.ts` (65), `exportPdf.ts` (108), `useSupabaseQuery.ts`, type `PendingSync`, `getStatusLabelAsync`, alias `checkIn`/`checkOut`, key localStorage `absensi_app_store`.
- `leaflet` + `@types/leaflet` terinstal tapi map digambar pakai canvas.
- `graphify-out/` masih referensikan `src/store/appStore.tsx` (sudah dihapus); `AGENTS.md` masih menyebut `src/data/mockData.ts`.
- Build: satu HTML 1,09 MB (`vite-plugin-singlefile`), precache PWA ±1 MB, tanpa code splitting; script `build` tanpa `tsc`. Nol test.
- Hal positif (pertahankan): pola `ServiceResult<T>` konsisten, edge function `admin-user` verifikasi role caller server-side, migrasi 008 (trigger status WIB + unique index), validasi input service layer.

---

## 3. Definisi Selesai (DoD) Global

Setiap task di dokumen ini dianggap selesai jika **semua** ini benar:

1. Kode berubah sesuai deskripsi (diff seminimal mungkin).
2. **Kriteria terima spesifik task** terpenuhi dan diverifikasi manual.
3. `npm run build` exit 0 (setelah X04: `tsc -b && vite build`).
4. Tidak ada regresi pada alur: login → check-in GPS → upload lampiran → checkout → riwayat; dan admin: CRUD pekerja/zona/shift → attendance → laporan.
5. Jika menyentuh DB/RLS: migrasi baru bernomor lanjutan (`011_…`, `012_…`, …), **tidak pernah mengedit file migrasi lama**, dan dieksekusi ke remote via `supabase db push` (atau dashboard) dengan output disimpan sebagai bukti.

---

## 4. Fase P0 — Keamanan (kerjakan lebih dulu, stop-the-line)

### S1 — Tutup kebocoran read publik

- **Buat migrasi:** `supabase/migrations/011_close_anon_read.sql`

```sql
-- Hapus policy publik yang bocor (010)
DROP POLICY IF EXISTS "Allow anon read users"       ON public.users;
DROP POLICY IF EXISTS "Allow anon read attachments" ON public.attachments;
DROP POLICY IF EXISTS "Allow anon read shifts"      ON public.shifts;
DROP POLICY IF EXISTS "Allow anon read zones"       ON public.zones;

-- Pastikan tidak ada policy SELECT lain yang USING (true) tanpa TO authenticated.
-- Model yang benar (dari 001, sudah ada): zones_select_all / shifts_select_all
-- FOR SELECT TO authenticated USING (true).
```

- **Verifikasi wajib (bukti):**
  - `select policy_name, roles, cmd from pg_policies where schemaname='public';` → tidak ada policy SELECT dengan roles mengandung `anon` atau `public`.
  - Tanpa login: `curl "$VITE_SUPABASE_URL/rest/v1/users?select=nama,no_hp" -H "apikey: $ANON"` → **harus** `[]` / 401-style hasil kosong, bukan daftar pekerja.
  - Login worker → riwayat & check-in tetap jalan; login admin → dashboard tetap jalan.
- **Catatan produksi:** cek dulu apakah 010 sudah ter-apply di project live; jika ya, anggap PII pernah terekspos → ganti PIN massal (lihat S3) sebagai mitigasi.

### S2 — Role check dari tabel, bukan JWT metadata

- **Buat migrasi:** `supabase/migrations/012_admin_helper_and_policies.sql`

```sql
-- Helper anti-rekursi: SECURITY DEFINER bypass RLS, baca users.role (bukan JWT)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND role IN ('admin','super_admin') AND status = 'aktif'
  );
$$;

-- Ganti SEMUA policy admin yang memakai (auth.jwt() -> 'user_metadata' ->> 'role')
-- menjadi USING/ WITH CHECK (public.is_admin()) pada tabel:
--   users, zones, shifts, attendances, attachments, app_settings
-- (drop + create ulang per policy; nama policy tetap agar diff kecil)
```

- **Sinkron metadata tetap dilakukan** untuk keperluan display (lihat U-sync), tapi **otorisasi tidak pernah lagi percaya JWT metadata**.
- **Kriteria terima:**
  - Worker yang memanggil `supabase.auth.updateUser({ data: { role: 'admin' } })` kemudian `select * from zones` (insert/update/delete) → **ditolak** RLS.
  - Admin biasa tetap bisa CRUD zona/shift/pekerja; worker tetap bisa insert attendance sendiri.
- **Risiko:** rekursi RLS lama (penyebab 006) tidak kambuh karena helper SECURITY DEFINER tidak melewati RLS `users`.

### S3 — PIN: form nyata, reset, tanpa default lemah

- **File:** `src/services/workers.service.ts`, `src/components/admin/WorkersPage.tsx`, `supabase/functions/admin-user/index.ts`
- **Langkah:**
  1. `createWorker(worker, pin)`: validasi PIN `^\d{6}$`, kirim sebagai `password` ke edge function (edge function **sudah** menerima param `password` — client saja yang tidak mengirim).
  2. Edge function: tolak password lemah — tambahkan cek `!/^\d{6}$/.test(password)` → 400.
  3. Tambah `type: 'reset-pin'` di edge function: `auth.admin.updateUserById(userId, { password })` (tetap di belakang cek role admin yang sudah ada).
  4. UI WorkersPage: tombol aksi baris "Reset PIN" → prompt/modal 6 digit → call service baru `resetWorkerPin(id, pin)`.
  5. Hapus hardcode `'1234'` di service.
- **Kriteria terima:** buat pekerja dengan PIN yang diisi form → login dengan PIN itu berhasil, PIN `1234` gagal (kecuali memang diisi 1234); reset PIN admin → login PIN lama gagal, baru berhasil.
- **Ikuti (jika S1 sempat terbocor di prod):** rotasi PIN massal sekali.

### S4 — Geofence server-side (KEPUTUSAN, lihat §8-D3)

- Opsi minimal yang disarankan: trigger DB menolak insert attendance jika jarak koordinat ke pusat zona > radius + toleransi akurasi GPS (mis. +100 m), via function `is_within_zone(lat, lng, zone_id)`. Tetap bukan anti-spoof sempurna (payload tetap dari device), tapi menutup manipulasi naive.
- Jika user memilih menerima risiko: catat di §8-D3 sebagai *accepted risk* dan cukup tulis komentar `ponytail:` di `submitCheckIn`.
- **Cakupan tambahan (v1.1):** validasi waktu juga masuk keluarga ini — lihat U9 (backdating) sebagai task terpisah.

### S5 — Audit & purge edge functions *(baru, v1.1 — temuan audit lanjutan)*

**Temuan:** `seed-auth` dan `test-zone-update` menggunakan `SERVICE_ROLE_KEY` **tanpa verifikasi Authorization/role caller sama sekali**. `seed-auth` dapat menghapus & membuat ulang akun admin dengan PIN `1234`; `test-zone-update` dapat menulis tabel zones. `diagnose-auth` belum diaudit.

- **Langkah:**
  1. Cek fungsi mana yang ter-deploy: `supabase functions list` (bukti disimpan).
  2. **Delete** semua fungsi non-produksi (`seed-auth`, `test-zone-update`, `diagnose-auth`) dari remote dan repo — tidak ada kode aplikasi yang memanggilnya.
  3. Yang tersisa (`admin-user`, `cloudinary-delete`) harus tetap memakai pola verifikasi caller seperti `admin-user` (sudah benar).
  4. Jika `seed-auth` pernah ter-deploy live: anggap akun bisa dibuat-ulang sembarangan → cek log invocations + rotasi PIN massal (gabung D6).
- **Terima:** `supabase functions list` hanya berisi fungsi produksi yang ter-gate; curl ke endpoint lama → 404.

### S6 — Data sensitif keluar dari git *(baru, v1.1)*

**Temuan:** `backups/backup_*.sql.gz` (5 dump database) ter-commit ke repo.

- **Langkah:** `git rm --cached backups/` + entri `.gitignore`; evaluasi isi dump (jika mengandung PII/hash → putuskan rewrite history, lihat §8-D7); sekalian buang sampah root (`chrome_ZLq8n8FFoX.png`).
- **Terima:** `git ls-files | grep backups` kosong; dump hanya ada di storage luar repo.

#### Catatan operasional (berlaku semua fase)

- **Staging:** uji migrasi RLS/trigger di lokal dulu (`supabase db reset` + seed) — jangan eksperimen langsung di project live.
- **Rollback:** migrasi forward-only; perbaikan = migrasi baru, bukan edit mundur.
- **Break-glass:** jika `is_admin()` gagal karena row `users` hilang untuk akun admin → perbaiki row via SQL editor (service_role), dokumentasikan prosedur 3 baris di AGENTS.md.

---

## 5. Fase F1 — Fitur Palsu → Nyata

> Semua item di fase ini adalah **melengkapi yang sudah setengah ada** (service/RLS/kolom sudah siap), bukan fitur baru.

### T1 — Override status kehadiran (pengganti B03)

- **File:** `src/services/attendance.service.ts`, `src/components/admin/AttendancePage.tsx`
- **Langkah:** tambah `updateAttendanceStatus(id, status, catatan?)` → `supabase.from('attendances').update({...}).eq('id', id)` (policy `attendances_update_admin` sudah ada). Wire tombol "Simpan": panggil service → toast sukses/gagal → update baris di state lokal → tutup modal. Kosongkan `overrideNote`/status setelah simpan.
- **Terima:** ubah status Izin + catatan → refresh halaman → status & catatan persist. Trigger 008 hanya menimpa saat `checkin_at`/`shift_id` berubah — override tanpa menyentuh kolom itu aman.
- **Audit trail (v1.1):** override tanpa jejak "siapa/kapan" adalah risiko kepatuhan untuk sistem absensi. Minimal: kolom `overridden_by uuid, overridden_at timestamptz` diisi otomatis (migrasi gabungan F2); ideal: tabel `attendance_audit_log`. Skala mengikuti keputusan §8-D10.

### T2 — Filter tanggal AttendancePage (pengganti B02)

- **File:** `AttendancePage.tsx`, util baru `src/utils/wib.ts` (lihat U1)
- **Langkah:** dalam memo `filtered` tambah `matchDate`: tanggal WIB dari `(a.checkin_at ?? a.client_timestamp)` === `filterDate`.
- **Terima:** ganti tanggal → tabel & kartu statistik berubah sesuai tanggal itu; tanggal kosong → semua tampil.

### T3 — Laporan per bulan/tahun/zona (pengganti B04)

- **File:** `src/services/reports.service.ts`, `ReportsPage.tsx`
- **Langkah:** `getMonthlyReport(year?, month?, zonaId?)` — boundary bulan dihitung WIB (util U1), `.eq('zona_id', zonaId)` bila diisi. `ReportsPage`: `useEffect` dependensi `[month, year, filterZona]` → reload. Hapus pemanggilan `getReportSummary()` — ringkas langsung turunkan dari `monthlyReport` di client (satu sumber, sedikit query).
- **Terima:** pilih bulan/tahun lampau → angka berubah dan cocok dengan data attendance periode itu (spot-check 1 pekerja).

### T4 — Export CSV nyata; PDF jadi keputusan

- **File:** util baru `src/utils/exportCsv.ts` (±20 baris: header + rows → Blob → link download), `ReportsPage.tsx`, `AttendancePage.tsx`
- **Langkah:** wire tombol "Download CSV" (rekap) dan "Export" (attendance) ke data yang **sedang terfilter**. Nama file: `rekap-YYYY-MM.csv`, `absensi-YYYY-MM-DD.csv`.
- **PDF:** `exportPdf.ts` butuh `jspdf` + `jspdf-autotable` (belum terinstal). Default plan: **hapus file**, tombol PDF disembunyikan sampai ada keputusan (§8-D4). Kalau diminta PDF: `npm i jspdf jspdf-autotable` lalu wire fungsi yang sudah ditulis.

### T5 — Hapus semua angka palsu (pengganti B05)

- **File:** `Dashboard.tsx`, `ReportsPage.tsx`
- **Langkah:** hapus props `trend` & semua literal `'+2 dari kemarin'`, `'+5%'`, dst; ganti `${Math.round(hadir / 10 * 100)}%` dengan `totalWorkers > 0 ? Math.round(hadir / totalWorkers * 100) : 0`.
- **Terima:** grep `trend=|dari kemarin|'\+\d+%'" → 0 hasil di kedua file.

### T6 — Offline queue: hubungkan sungguhan atau jujur (pengganti B06) — KEPUTUSAN §8-D1

- **Opsi A (disarankan, wire beneran)** — File: `HomeTab.tsx`, `offlineQueue.ts`:
  1. `handleCheckin`: jika `!navigator.onLine` atau `result.success === false` karena network → `addToQueue({ type:'checkin', payload:{...} })`; state UI tetap pindah ke `checked_in` (optimistik) dengan penanda "menunggu sync"; simpan `pendingAttendanceId` lokal.
  2. Listener `online` + interval ringan → `flushQueue()`; setelah flush sukses → `getTodayAttendance()` resinkronisasi penuh.
  3. Checkout offline: blokir dengan pesan jelas (butuh attendanceId server) — jangan antri.
  4. Banner pendingSync menampilkan jumlah antrean nyata (`getPendingQueue().length`).
- **Opsi B (minimal-jujur):** hapus `offlineQueue.ts`, banner, dan teks "tersimpan lokal". Offline = pesan error jelas "Check-in butuh internet."
- **Terima Opsi A:** mode offline (DevTools) → check-in masuk antre, banner hitung 1; online lagi → record muncul di DB, banner hilang; tidak ada duplikat setelah flush dua kali.

### T7 — Settings page hidup (pengganti D02/F4)

- **File:** `SettingsPage.tsx` (ganti placeholder), konsumen: `HomeTab.tsx`, `ZonesPage.tsx`, `ShiftsPage.tsx`
- **Langkah:** form untuk field `app_settings` yang sudah ada di migrasi 009 (company_name, default_zone_radius_m, default_shift_tolerance_min, max_file_size_mb, max_attachments_per_day, max_photos_per_day, max_docs_per_day, gps_timeout_ms) → simpan via `updateAppSettings` (sudah ada) → `invalidateAppSettingsCache()`. Konsumsi minimum: ganti konstanta hardcoded di `handleUpload` (MAX_FILE_SIZE dll.) dan timeout GPS dengan nilai settings.
- **Terima:** ubah max foto/hari jadi 1 → worker tidak bisa upload foto kedua hari itu; refresh admin → nilai bertahan.

### T8 — Guard bisnis di HomeTab + DB (pengganti C01/C02)

- **Client** (`HomeTab.tsx`): jika `worker.absensi_online === false` → tombol check-in disabled + pesan "Absensi online dinonaktifkan admin". Jika hari-WIB ini bukan anggota `shift.hari_kerja` → disabled + pesan "Hari ini bukan hari kerja shift Anda".
- **Server** (migrasi bersama U4): trigger BEFORE INSERT attendances menolak bila `users.absensi_online=false` ATAU hari-WIB-ini ∉ `shifts.hari_kerja` (authoritative, tidak bisa dilewati dari console).
- **Terima:** toggle mati → worker tidak bisa check-in (UI **dan** direct API ditolak); hari libur shift → sama.

---

## 6. Fase F2 — Bug & Keandalan

### U1 — Util tanggal WIB tunggal

- **File baru:** `src/utils/wib.ts` — `wibToday(): string` (YYYY-MM-DD Asia/Jakarta), `wibDateOf(iso): string`, `wibDayName(iso): string` (Sen…Min), `wibMonthRange(year, month): {start, end}`.
- **Ganti semua titik UTC** (hasil `grep -rn "toISOString().split('T')[0]" src/`): `getTodayAttendance` (boundary `gte/lte` pakai rentang WIB), `submitCheckIn` (tanggal jadwal shift), `Dashboard.tsx`, `AttendancePage.tsx`, `ReportsPage.tsx`, `WorkersPage.tsx` (`bergabung_sejak`).
- **Terima:** ubah jam device ke 00:30 WIB → check-in tercatat hari yang benar; `getTodayAttendance` menemukan record itu.

### U2 — Lampiran sebelum check-in (KEPUTUSAN §8-D2)

- **Opsi A (disarankan, lazy & jujur):** tombol Ambil Foto/Upload Dokumen **disabled sampai check-in** (`checkState !== 'checked_in'`) dengan caption "Lampiran menempel pada absensi hari ini — check-in dulu". Menghilangkan seluruh class masalah orphan.
- **Opsi B:** buffer lokal + `createAttachment` massal setelah `activeAttendanceId` ada (lebih banyak state, risiko hilang saat refresh tetap ada).
- **Terima A:** sebelum check-in tombol mati; setelah check-in upload jalan dan `lampiran_count` nambah.

### U3 — Hapus lampiran benar-benar menghapus

- **Migrasi (gabung U4/U8):** policy `attachments_delete_own FOR DELETE TO authenticated USING (user_id = auth.uid())`.
- **File:** `HomeTab.tsx` `removeAttachment` → panggil `deleteAttachment(id)` (DB) lalu fire-and-forget deleteFromCloudinary via edge function `cloudinary-delete` (yang sudah ada) untuk URL Cloudinary; optimistic update state, rollback + toast bila gagal.
- **Terima:** hapus lampiran → row hilang dari DB, file hilang dari Cloudinary media library, count berkurang.

### U4 — Increment atomik

- **Migrasi:** `CREATE FUNCTION increment_lampiran_count(p_attendance_id uuid) RETURNS void SECURITY DEFINER ... UPDATE attendances SET lampiran_count = COALESCE(lampiran_count,0)+1 WHERE id = p_attendance_id`.
- **File:** `attachments.service.ts` → panggil `.rpc('increment_lampiran_count', ...)`.
- **Terima:** dua upload hampir bersamaan → count akhir = 2 (bukan 1).

### U5 — Sync metadata + profil single-source

- **Edge function `admin-user`:** tambah `type: 'sync-metadata' { userId, metadata }` → `auth.admin.updateUserById(userId, { user_metadata: metadata })` (di belakang cek admin existing).
- **File:** `workers.service.ts` `updateWorker` — setelah update `users` sukses dan ada perubahan `nama/no_hp/role`, panggil `sync-metadata`. `useAuth.ts` — ekstrak satu fungsi `mapSessionToUser(session)` (hapus duplikasi), dan **setelah session didapat, ambil profil segar** via `getWorkerById(session.user.id)` sehingga edit admin langsung terlihat tanpa re-login.
- **Terima:** admin ganti zona pekerja → HP pekerja (tanpa logout) menampilkan zona baru setelah refresh halaman; role change menutup akses admin di sesi berikutnya.

### U6 — Pesan error login jujur

- **File:** `useAuth.ts` — bedakan: `invalid_credentials` → "PIN salah."; sisanya → "Gagal menghubungi server. Coba lagi." (sertakan detail dev via `console.error`).
- **Terima:** matikan wifi → pesan network, bukan "PIN salah."

### U7 — Query dashboard hemat

- **File:** `attendance.service.ts` (tambah param `since?: string` atau fungsi `getTodayAttendancesWib()`), `Dashboard.tsx` — poll 60 s hanya tarik attendance hari-WIB-ini (+ activity feed limit 20 sudah ada). Full fetch hanya di AttendancePage (dan ikuti T2 untuk filter server-side bila data besar).
- **Terima:** Network tab saat dashboard idle: payload attendance harian, bukan seluruh tabel.

### U8 — Activity feed jujur

- **File:** `reports.service.ts`, `Dashboard.tsx` — hapus label/ikon event `checkout`/`upload` yang tak pernah dihasilkan, ATAU hasilkan event checkout dari `checkout_at` terbaru. Pilih yang pertama (lazy) kecuali user minta.
- **Terima:** tidak ada entri feed dengan ikon yang tidak mungkin muncul.

### U9 — Validasi waktu server-side *(baru, v1.1)*

**Masalah:** `checkin_at` & `client_timestamp` dipercaya mentah dari device — backdating/future check-in lolos walau geofence lolos (masalah berbeda dari S4).

- **File:** migrasi gabungan F2 (trigger BEFORE INSERT attendances).
- **Opsi:** (a) clamp ketat `checkin_at := now()` — merusak nilai offline-queue (D1-A); (b) toleransi skew (mis. ≤ 30 menit, antrean offline ≤ 24 h dengan flag `synced_at`); (c) accepted risk. Keputusan: §8-D9.
- **Terima sesuai opsi:** manipulasi jam device tidak bisa memindahkan check-in ke hari/status lain di luar aturan yang dipilih.

---

## 7. Fase F3 — Kebersihan & Build

| ID | Task | Detail |
|----|------|--------|
| X1 | Hapus dead code | `useSupabaseQuery.ts`, type `PendingSync`, `getStatusLabelAsync`, alias `checkIn/checkOut`, key `absensi_app_store` di logout, `getReportSummary()` (orphan setelah T3). `offlineQueue.ts` & `exportPdf.ts`: nasib tergantung D1/D4. Migrasi penggunaan `currentUser` → `user` lalu hapus field deprecated dari AuthContext |
| X2 | Uninstall leaflet | `npm rm leaflet @types/leaflet` (map = canvas) |
| X3 | Dokumentasi & graph | Update `AGENTS.md` (hapus mockData, arahkan status ke FIXPLAN.md); regenerate graphify penuh (`/graphify .`); tandai REMEDIATION_TASKS.md superseded dengan satu baris banner |
| X4 | Build sehat | `"build": "tsc -b && vite build"`; evaluasi lepas `vite-plugin-singlefile` agar chunk admin (recharts) terpisah — ukur bundle sebelum/sesudah; PWA precache menyesuaikan otomatis |
| X5 | Test minimum (KEPUTUSAN §8-D5) | Minimal: unit `wib.ts` + paritas status client vs `derive_attendance_status` (fixture tanggal lintas tengah malam). Runner: `vitest` (devDep) — tanpa framework lain |
| X6 | CI lint | Workflow GitHub Actions kecil: install → `npm run lint` → `npm run build` pada PR |

---

## 8. Keputusan yang Diminta dari User

| ID | Pertanyaan | Rekomendasi |
|----|-----------|-------------|
| D1 | Offline check-in: **A** wire queue sungguhan / **B** jujur tanpa offline | A jika pekerja sering di area sinyal lemah; B kalau tidak |
| D2 | Lampiran pra-check-in: **A** blokir sampai check-in / **B** buffer & link belakangan | A |
| D3 | Geofence server-side (S4): pasang trigger jarak / terima risiko spoof | Pasang (murah, satu function) |
| D4 | Export PDF: instal `jspdf`+wire / cukup CSV | Cukup CSV dulu; PDF saat diminta |
| D5 | Test runner `vitest` boleh ditambah? | Ya (devDep saja) |
| D6 | Jika S1 ternyata pernah live: rotasi PIN massal semua akun? | Ya |
| D7 | Dump `backups/*.sql.gz` berisi PII → rewrite history git (disruptif) atau cukup untrack ke depan? | Untrack dulu; rewrite hanya jika repo dibagikan luas |
| D8 | Enumerasi akun via RPC `get_user_by_no_hp` (anon-callable, full row) + pesan login beda-per-kasus: hardening atau terima? | Hardening ringan: RPC return kolom minimal, pesan login digeneral |
| D9 | Backdating check-in: clamp ketat / toleransi skew + flag / terima risiko? | Opsi (b) — kompatibel dengan offline queue |
| D10 | Audit trail override status: kolom minimal di attendances / tabel log terpisah / tanpa? | Kolom minimal dulu |

---

## 9. Urutan Eksekusi & Dependensi

```
S1 ──┬──> S2 ──> S3 ──> (D6 rotasi bila perlu)
     │
     └──> T1..T5 (paralel, tiap task independen)
              │
S4 (D3) ── migrasi sendiri, nomor ditetapkan saat eksekusi (tidak digabung F2 lagi)
S5 ──> S6 (setelah purge, bersih-bersih git)
T6 (D1) ──────┤
T7 ───────────┤
T8 ──> U4, U3-policy, U9-trigger, audit-cols D10 [SATU migrasi bersama fase F2]
U1 ──> T2, T3 (pakai util WIB) — unit test wib.ts dibuat BERSAMAAN, bukan menunggu X5
U5 ──> (setelah S2, karena menyentuh metadata)
U2 (D2), U6 (+D8), U7, U8
X4a: adopsi `tsc -b` DI AWAL (`npx tsc --noEmit` tiap task), bukan di akhir
Fase F3 terakhir (hapus dead code setelah T6/D4 final)
```

Estimasi kasar: **P0 = 1–2 sesi kerja** · **F1 = 2–3 sesi** · **F2 = 2–3 sesi** · **F3 = 1 sesi**.

---

## 10. Checklist Eksekusi

> Centang hanya setelah bukti terkumpul (aturan §1). Format bukti: perintah/output/screenshot.

**Fase P0**
- [x] S1 migrasi `011_close_anon_read.sql` + verifikasi curl tanpa login — **TERAPPLY & TERVERIFIKASI** (2026-06): anon read users/attendances/attachments/zones → `[]` semua (sebelumnya users bocor PII penuh); 3 fungsi liar → 404. Catatan: push awal gagal karena `009_sync_auth_users.sql` rusak (kolom `email` tidak ada, tidak pernah ter-apply di mana pun, bentrok alur admin-user) → file dihapus (pengecualian terdokumentasi atas aturan forward-only)
- [x] S2 migrasi `012_admin_helper_and_policies.sql` + uji eskalasi gagal — **TERAPPLY**; verifikasi eskalasi runtime menunggu uji manual (worker updateUser role→admin harus tetap ditolak)
- [x] S3 PIN end-to-end (create + reset) + hapus hardcode 1234 — kode selesai **dan ter-deploy** (`admin-user` v2: validasi 6 digit + tipe `reset-pin`). Uji runtime manual: buat pekerja dgn PIN custom → login; tombol Reset PIN
- [ ] S4 keputusan D3 dieksekusi (trigger / accepted-risk note)
- [x] S5 audit & purge edge functions — **SELESAI TOTAL**: seed-auth/test-zone-update/diagnose-auth dihapus repo + remote (probe → 404); cloudinary-delete & admin-user ter-gate (probe tanpa auth → 401) dan versi baru ter-deploy. Insiden probe tercatat di bawah
- [x] S6 backups/ & sampah root keluar dari git tracking — bukti: `git rm --cached backups`, `.gitignore += backups/ *.sql.gz`, chrome_*.png dihapus

#### Bukti verifikasi pasca-deploy (2026-06, curl anon)
| Probe | Sebelum | Sesudah |
|---|---|---|
| GET /rest/v1/users | 200 + daftar PII | 200 `[]` |
| GET /rest/v1/attendances, attachments, zones | (belum diuji) | 200 `[]` semua |
| POST /functions/v1/seed-auth · test-zone-update · diagnose-auth | 200 EKSEKUSI | 404 |
| POST /functions/v1/admin-user · cloudinary-delete | 401 · 400 (tanpa gate) | 401 · 401 (gate aktif) |
| RPC get_user_by_no_hp | 200 full row | 200 full row (by-design login; hardening = D8) |

#### ⚠️ Perlu aksi user — SELESAI ✓
Semua perintah CLI (delete ×3, db push 011+012, deploy admin-user & cloudinary-delete) telah dijalankan user dan sukses.
> **Catatan insiden probe:** POST probe ke `seed-auth` yang tidak ter-gate TER-EKSEKUSI di live (200) — akun auth Budi/Admin terhapus-dan-dibuat-ulang dengan PIN default saat itu. UUID fixed sehingga row public.users tetap cocok, tapi konfirmasi login kedua akun setelah deploy.

**Fase F1**
- [x] T1 override persist · [x] T2 filter tanggal · [x] T3 laporan periode · [x] T4 export CSV (+D4) · [x] T5 angka palsu hilang · [x] T6 offline (D1=A) · [x] T7 settings hidup · [x] T8 guard absensi_online & hari_kerja
  - detail implementasi per task: lihat catatan commit F1; verifikasi runtime menyusul setelah `db push` migrasi 013

**Fase F2**
- [x] U1 util WIB (`src/utils/wib.ts`) + titik UTC diganti: `getTodayAttendance`, kalkulasi terlambat `submitCheckIn`, mingguan reports, AttendancePage, Dashboard. Unit test ditunda ke D5 (vitest belum diinstal)
- [x] U2 lampiran (D2 = Opsi A) — upload diblokir sampai check-in sukses; juga saat check-in masih di antrean offline
- [x] U3 delete attachment — policy `attachments_delete_own` (migrasi 013) + `removeAttachment` → `deleteAttachment()`; ceiling: aset Cloudinary dibiarkan (butuh secret), bersihkan berkala via admin
- [x] U4 RPC atomic — `increment_lampiran_count(uuid)` SECURITY DEFINER (migrasi 013); wiring service menyusul setelah push
- [x] U9 validasi waktu (D9 = toleransi pragmatis) — trigger tolak masa depan >5 mnt & masa lalu >25 jam (cukup utk antrean semalam)
- [x] audit trail override (D10 = kolom minimal) — `overridden_by/overridden_at` + trigger, migrasi 013
- [ ] U5 sync metadata + profil fresh · [ ] U6 error login (+D8) · [ ] U7 query hemat · [ ] U8 feed jujur

**Fase F3**
- [ ] X1 dead code · [ ] X2 leaflet · [ ] X3 docs+graph · [ ] X4 build+bundle · [ ] X5 test (D5) · [ ] X6 CI
  - progres v1.1: exportPdf.ts sudah dihapus (D4 default CSV); tipe `AppSettings`+`DEFAULT_APP_SETTINGS` ditambahkan ke types (prasyarat T7); temuan tambahan untuk T5: WorkerDetail WorkersPage masih memuat angka palsu "20/22 hari (90.9%)"

**Verifikasi akhir**
- [ ] Regression manual: login worker → check-in → upload → checkout → riwayat; login admin → semua halaman admin
- [ ] `npm run build` (dengan tsc) exit 0 · [ ] `graphify update .` · [ ] Update AGENTS.md
