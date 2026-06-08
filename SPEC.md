# SPEC.md — Spesifikasi Teknis MVP

Dokumen spesifikasi teknis untuk migrasi AbsensiOnline dari mock ke Supabase.
Fokus: MVP scope (go-live).

---

## 1. Environment Variables

```bash
# .env (development)
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon-key>
VITE_CLOUDINARY_CLOUD_NAME=<cloud-name>
VITE_CLOUDINARY_UPLOAD_PRESET=<unsigned-preset>
VITE_APP_NAME=AbsensiOnline
```

- `VITE_API_BASE_URL` dihapus (Supabase client langsung, bukan REST API).
- Anon key aman di frontend (RLS menjamin isolasi data).
- Cloudinary upload pakai unsigned preset (tanpa secret key di frontend).

---

## 2. Database Schema (Supabase PostgreSQL)

> **Urutan CREATE TABLE:** zones → shifts → users → attendances → attachments
> (users punya FK ke zones & shifts; attendances punya FK ke users, shifts, zones)

### 2.1 Table: `zones`

```sql
CREATE TABLE zones (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nama          TEXT NOT NULL,
  deskripsi     TEXT NOT NULL DEFAULT '',
  latitude      DOUBLE PRECISION NOT NULL,
  longitude     DOUBLE PRECISION NOT NULL,
  radius_meter  INTEGER NOT NULL DEFAULT 150,
  status        TEXT NOT NULL DEFAULT 'aktif' CHECK (status IN ('aktif', 'nonaktif')),
  color         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Validation: latitude -90..90, longitude -180..180
ALTER TABLE zones ADD CONSTRAINT chk_latitude CHECK (latitude BETWEEN -90 AND 90);
ALTER TABLE zones ADD CONSTRAINT chk_longitude CHECK (longitude BETWEEN -180 AND 180);
ALTER TABLE zones ADD CONSTRAINT chk_radius CHECK (radius_meter > 0 AND radius_meter <= 10000);
```

### 2.2 Table: `shifts`

```sql
CREATE TABLE shifts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nama            TEXT NOT NULL,
  jam_mulai       TEXT NOT NULL,  -- format "HH:MM"
  jam_selesai     TEXT NOT NULL,  -- format "HH:MM"
  toleransi_menit INTEGER NOT NULL DEFAULT 15,
  status          TEXT NOT NULL DEFAULT 'aktif' CHECK (status IN ('aktif', 'nonaktif')),
  ikon            TEXT NOT NULL DEFAULT '🏢',
  hari_kerja      TEXT[] NOT NULL DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Validation: toleransi >= 0
ALTER TABLE shifts ADD CONSTRAINT chk_toleransi CHECK (toleransi_menit >= 0);
```

### 2.3 Table: `users`

```sql
CREATE TABLE users (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nama       TEXT NOT NULL,
  no_hp      TEXT NOT NULL UNIQUE,
  jabatan    TEXT NOT NULL DEFAULT '',
  role       TEXT NOT NULL DEFAULT 'worker' CHECK (role IN ('worker', 'admin', 'super_admin')),
  zona_id    UUID REFERENCES zones(id) ON DELETE SET NULL,
  shift_id   UUID REFERENCES shifts(id) ON DELETE SET NULL,
  status     TEXT NOT NULL DEFAULT 'aktif' CHECK (status IN ('aktif', 'nonaktif')),
  tipe       TEXT NOT NULL DEFAULT 'tetap' CHECK (tipe IN ('tetap', 'kontrak', 'harian')),
  gender     TEXT NOT NULL DEFAULT 'pria' CHECK (gender IN ('pria', 'wanita')),
  foto       TEXT,
  bergabung_sejak DATE NOT NULL DEFAULT CURRENT_DATE,
  absensi_online BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index untuk login lookup
CREATE INDEX idx_users_no_hp_role ON users(no_hp, role);
CREATE INDEX idx_users_zona ON users(zona_id);
CREATE INDEX idx_users_shift ON users(shift_id);
```

**Mapping dari TypeScript `User`:**
| Field TS | Column SQL | Note |
|----------|-----------|------|
| `id` | `id` | UUID (bukan string `u_xxx` lagi) |
| `nama` | `nama` | |
| `no_hp` | `no_hp` | UNIQUE constraint |
| `jabatan` | `jabatan` | |
| `role` | `role` | CHECK constraint |
| `zona_id` | `zona_id` | FK → zones |
| `shift_id` | `shift_id` | FK → shifts |
| `status` | `status` | |
| `tipe` | `tipe` | |
| `gender` | `gender` | |
| `foto` | `foto` | nullable |
| `bergabung_sejak` | `bergabung_sejak` | DATE |
| `absensi_online` | `absensi_online` | BOOLEAN |

### 2.4 Table: `attendances`

```sql
CREATE TABLE attendances (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  user_nama        TEXT NOT NULL,
  shift_id         UUID NOT NULL REFERENCES shifts(id),
  zona_id          UUID NOT NULL REFERENCES zones(id),
  checkin_at       TIMESTAMPTZ,
  checkout_at      TIMESTAMPTZ,
  durasi_menit     INTEGER,
  status           TEXT NOT NULL DEFAULT 'absen'
                   CHECK (status IN ('hadir', 'terlambat', 'absen', 'izin', 'libur', 'sakit', 'cuti')),
  client_timestamp TIMESTAMPTZ,
  synced_at        TIMESTAMPTZ,
  latitude_in      DOUBLE PRECISION,
  longitude_in     DOUBLE PRECISION,
  latitude_out     DOUBLE PRECISION,
  longitude_out    DOUBLE PRECISION,
  lampiran_count   INTEGER NOT NULL DEFAULT 0,
  catatan          TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes untuk query utama
CREATE INDEX idx_attendances_user_date ON attendances(user_id, checkin_at DESC);
CREATE INDEX idx_attendances_date ON attendances(checkin_at DESC);
CREATE INDEX idx_attendances_zona ON attendances(zona_id);
CREATE INDEX idx_attendances_status ON attendances(status);
```

**Derived status logic** (server-side function):

```sql
CREATE OR REPLACE FUNCTION derive_attendance_status(
  p_checkin_at TIMESTAMPTZ,
  p_shift_id UUID
) RETURNS TEXT AS $$
DECLARE
  v_shift RECORD;
  v_scheduled TIMESTAMPTZ;
  v_diff_min DOUBLE PRECISION;
BEGIN
  SELECT jam_mulai, toleransi_menit INTO v_shift FROM shifts WHERE id = p_shift_id;
  IF NOT FOUND THEN RETURN 'hadir'; END IF;

  v_scheduled := (p_checkin_at::date || 'T' || v_shift.jam_mulai || ':00')::timestamptz;
  v_diff_min := EXTRACT(EPOCH FROM (p_checkin_at - v_scheduled)) / 60;

  IF v_diff_min > v_shift.toleransi_menit THEN
    RETURN 'terlambat';
  ELSE
    RETURN 'hadir';
  END IF;
END;
$$ LANGUAGE plpgsql;
```

### 2.5 Table: `attachments`

```sql
CREATE TABLE attachments (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  attendance_id     UUID NOT NULL REFERENCES attendances(id) ON DELETE CASCADE,
  user_id           UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tipe              TEXT NOT NULL CHECK (tipe IN ('foto', 'dokumen')),
  url               TEXT NOT NULL,
  nama_file         TEXT NOT NULL,
  ukuran_bytes      INTEGER NOT NULL,
  status_verifikasi TEXT NOT NULL DEFAULT 'menunggu'
                    CHECK (status_verifikasi IN ('terverifikasi', 'menunggu', 'ditolak')),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_attachments_attendance ON attachments(attendance_id);
CREATE INDEX idx_attachments_user ON attachments(user_id);
```

### 2.6 File Upload → Cloudinary

Tidak ada Supabase Storage. File upload via **Cloudinary unsigned upload**.

- **Cloud name:** dari env `VITE_CLOUDINARY_CLOUD_NAME`
- **Upload preset:** dari env `VITE_CLOUDINARY_UPLOAD_PRESET` (unsigned, tidak perlu API secret)
- **URL format:** `https://res.cloudinary.com/<cloud-name>/image/upload/<version>/<public-id>.<ext>`
- **Folder:** `absensi/{user_id}/{attendance_id}/`

Frontend langsung upload ke Cloudinary (POST multipart), dapat URL, simpan ke kolom `attachments.url`.

---

## 3. Row Level Security (RLS) Policies

### 3.1 General Pattern

```
auth.uid() → users.id (via Supabase Auth UUID)
```

Setiap user Supabase Auth terhubung ke `users.id`. RLS menggunakan ini sebagai basis izin.

### 3.2 Table: `users`

```sql
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Admin bisa baca semua user
CREATE POLICY "Admin can read all users"
  ON users FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
  );

-- Worker hanya bisa baca diri sendiri
CREATE POLICY "Worker can read own profile"
  ON users FOR SELECT TO authenticated
  USING (id = auth.uid());

-- Admin bisa CRUD semua user
CREATE POLICY "Admin can insert users"
  ON users FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
  );

CREATE POLICY "Admin can update users"
  ON users FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
  )
  WITH CHECK (true);

CREATE POLICY "Admin can delete users"
  ON users FOR DELETE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
  );
```

### 3.3 Table: `zones`

```sql
ALTER TABLE zones ENABLE ROW LEVEL SECURITY;

-- Semua authenticated bisa baca zones
CREATE POLICY "Authenticated can read zones"
  ON zones FOR SELECT TO authenticated USING (true);

-- Admin bisa CRUD zones
CREATE POLICY "Admin can insert zones"
  ON zones FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
  );

CREATE POLICY "Admin can update zones"
  ON zones FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
  );

CREATE POLICY "Admin can delete zones"
  ON zones FOR DELETE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
  );
```

### 3.4 Table: `shifts`

```sql
ALTER TABLE shifts ENABLE ROW LEVEL SECURITY;

-- Semua authenticated bisa baca shifts
CREATE POLICY "Authenticated can read shifts"
  ON shifts FOR SELECT TO authenticated USING (true);

-- Admin bisa CRUD shifts
CREATE POLICY "Admin can insert shifts"
  ON shifts FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
  );

CREATE POLICY "Admin can update shifts"
  ON shifts FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
  );

CREATE POLICY "Admin can delete shifts"
  ON shifts FOR DELETE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
  );
```

### 3.5 Table: `attendances`

```sql
ALTER TABLE attendances ENABLE ROW LEVEL SECURITY;

-- Admin bisa baca semua attendances
CREATE POLICY "Admin can read all attendances"
  ON attendances FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
  );

-- Worker hanya bisa baca attendances sendiri
CREATE POLICY "Worker can read own attendances"
  ON attendances FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Worker bisa insert attendances sendiri (check-in)
CREATE POLICY "Worker can insert own attendances"
  ON attendances FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Worker bisa update attendances sendiri (checkout, lampiran)
CREATE POLICY "Worker can update own attendances"
  ON attendances FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

-- Admin bisa update semua attendances (override status)
CREATE POLICY "Admin can update all attendances"
  ON attendances FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
  );

-- Admin bisa delete attendances
CREATE POLICY "Admin can delete attendances"
  ON attendances FOR DELETE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
  );
```

### 3.6 Table: `attachments`

```sql
ALTER TABLE attachments ENABLE ROW LEVEL SECURITY;

-- Admin bisa baca semua attachments
CREATE POLICY "Admin can read all attachments"
  ON attachments FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
  );

-- Worker bisa baca attachments sendiri
CREATE POLICY "Worker can read own attachments"
  ON attachments FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Worker bisa insert attachments sendiri
CREATE POLICY "Worker can insert own attachments"
  ON attachments FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Admin bisa update status verifikasi
CREATE POLICY "Admin can update attachments"
  ON attachments FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
  );
```

---

## 4. Auth Migration (Mock → Supabase Auth)

> **MVP: Opsi B** (Email/Password dengan mapping). Opsi A (Phone OTP) ditunda post-MVP.

### 4.1 Supabase Auth Setup

Gunakan **Email/Password** dengan mapping no_hp → email:
- Email format: `{no_hp}@absensi.local` (email palsu, hanya untuk Supabase Auth identifier)
- Password: PIN yang dimasukkan user (untuk MVP masih `1234`, di-hash oleh Supabase)

### 4.2 Auth Flow Baru

```
Login (no_hp + PIN)
  → Query users table: WHERE no_hp = input AND role = role_input AND status = 'aktif'
  → Jika user ditemukan:
    → supabase.auth.signInWithPassword({ email: '${no_hp}@absensi.local', password: pin })
    → Dapat session (access_token, refresh_token)
    → Simpan user data di AuthContext
    → Redirect ke /admin/dashboard atau /app/home
  → Jika tidak ditemukan / password salah:
    → Return error message
```

### 4.3 Client Initialization

```typescript
// src/config/supabase.ts
import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);
```

### 4.4 Logout

```typescript
await supabase.auth.signOut();
// Hapus semua localStorage keys terkait app
localStorage.removeItem('absensi_token');
localStorage.removeItem('absensi_user');
localStorage.removeItem('absensi_app_store');
```

---

## 5. Service Layer → Supabase Queries

### 5.1 `workers.service.ts`

```typescript
// GET /api/workers → supabase.from('users').select('*').neq('role', 'super_admin')
// POST /api/workers → supabase.from('users').insert(worker)
// PUT /api/workers/:id → supabase.from('users').update(data).eq('id', id)
// DELETE /api/workers/:id → supabase.from('users').delete().eq('id', id)
```

| Method | Supabase Query |
|--------|---------------|
| `getWorkers()` | `supabase.from('users').select('*').neq('role', 'super_admin')` |
| `getWorkerById(id)` | `supabase.from('users').select('*').eq('id', id).single()` |
| `createWorker(worker)` | `supabase.from('users').insert(worker).select().single()` |
| `updateWorker(id, data)` | `supabase.from('users').update(data).eq('id', id).select().single()` |
| `deleteWorker(id)` | `supabase.from('users').delete().eq('id', id)` |

### 5.2 `shifts.service.ts`

| Method | Supabase Query |
|--------|---------------|
| `getShifts()` | `supabase.from('shifts').select('*')` |
| `getShiftById(id)` | `supabase.from('shifts').select('*').eq('id', id).single()` |
| `createShift(shift)` | `supabase.from('shifts').insert(shift).select().single()` |
| `updateShift(id, data)` | `supabase.from('shifts').update(data).eq('id', id).select().single()` |
| `deleteShift(id)` | `supabase.from('shifts').delete().eq('id', id)` |

### 5.3 `zones.service.ts`

| Method | Supabase Query |
|--------|---------------|
| `getZones()` | `supabase.from('zones').select('*')` |
| `getZoneById(id)` | `supabase.from('zones').select('*').eq('id', id).single()` |
| `createZone(zone)` | `supabase.from('zones').insert(zone).select().single()` |
| `updateZone(id, data)` | `supabase.from('zones').update(data).eq('id', id).select().single()` |
| `deleteZone(id)` | `supabase.from('zones').delete().eq('id', id)` |

### 5.4 `attendance.service.ts`

| Method | Supabase Query |
|--------|---------------|
| `getAttendances()` | `supabase.from('attendances').select('*').order('checkin_at', { ascending: false })` |
| `submitCheckIn(payload)` | `supabase.from('attendances').insert({ user_id, zona_id, shift_id, ... }).select().single()` |
| `submitCheckOut(id, payload)` | `supabase.from('attendances').update({ checkout_at, durasi_menit, ... }).eq('id', id)` |
| `getTodayAttendance(userId)` | `supabase.from('attendances').select('*').eq('user_id', userId).gte('checkin_at', today).order('checkin_at', { ascending: false }).limit(1).single()` |
| `getHistory(userId)` | `supabase.from('attendances').select('*').eq('user_id', userId).order('checkin_at', { ascending: false })` |

### 5.5 `reports.service.ts`

| Method | Query Logic |
|--------|------------|
| `getMonthlyReport()` | Aggregate attendances per user per month (group by user_id, count status) |
| `getWeeklyData()` | Aggregate attendances per day of current week |
| `getActivityFeed()` | Latest 20 attendances with user join, order by created_at |
| `getReportSummary()` | Sum/avg dari monthly report |

**RPC untuk reports (optional, lebih efisien):**

```sql
CREATE OR REPLACE FUNCTION get_monthly_report(p_month DATE)
RETURNS TABLE (
  user_id UUID,
  nama TEXT,
  zona TEXT,
  hadir BIGINT,
  terlambat BIGINT,
  izin BIGINT,
  absen BIGINT,
  libur BIGINT,
  total_hari_kerja BIGINT,
  persentase_kehadiran NUMERIC
) AS $$
  SELECT
    a.user_id,
    u.nama,
    z.nama AS zona,
    COUNT(*) FILTER (WHERE a.status = 'hadir') AS hadir,
    COUNT(*) FILTER (WHERE a.status = 'terlambat') AS terlambat,
    COUNT(*) FILTER (WHERE a.status = 'izin') AS izin,
    COUNT(*) FILTER (WHERE a.status = 'absen') AS absen,
    COUNT(*) FILTER (WHERE a.status = 'libur') AS libur,
    COUNT(*) AS total_hari_kerja,
    ROUND(COUNT(*) FILTER (WHERE a.status IN ('hadir', 'terlambat')) * 100.0 / NULLIF(COUNT(*), 0), 1) AS persentase_kehadiran
  FROM attendances a
  JOIN users u ON a.user_id = u.id
  JOIN zones z ON a.zona_id = z.id
  WHERE DATE_TRUNC('month', a.checkin_at) = DATE_TRUNC('month', p_month)
  GROUP BY a.user_id, u.nama, z.nama
  ORDER BY u.nama;
$$ LANGUAGE sql;
```

---

## 6. Attachments Upload Flow

```
1. Worker pilih file (foto/dokumen)
2. Kompresi via browser-image-compression:
   - Foto: max 1MB, quality 0.8, maxWidth 1920px
   - Dokumen: skip kompresi (hanya foto)
3. Upload ke Cloudinary unsigned endpoint:
   POST https://api.cloudinary.com/v1_1/<cloud-name>/image/upload
   Body: { file, upload_preset, folder }
4. Dapat Cloudinary URL (secure_url)
5. Insert ke attachments table: { attendance_id, user_id, tipe, url, nama_file, ukuran_bytes }
6. Update attendances.lampiran_count (+1)
```

**Cloudinary unsigned upload (frontend langsung):**

```typescript
const uploadToCloudinary = async (file: File): Promise<string> => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET);
  formData.append('folder', `absensi/${userId}/${attendanceId}`);

  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${import.meta.env.VITE_CLOUDINARY_CLOUD_NAME}/image/upload`,
    { method: 'POST', body: formData }
  );
  const data = await res.json();
  return data.secure_url;
};
```

**Batas file:**
- Foto: max 10MB sebelum kompresi, 1MB setelah kompresi
- Dokumen: max 25MB (PDF, DOC, XLS)
- Max 10 file per hari per attendance

---

## 7. Realtime Subscriptions (Dashboard)

```typescript
// Dashboard subscribe ke attendances table
supabase
  .channel('attendances-changes')
  .on('postgres_changes', { event: '*', schema: 'public', table: 'attendances' }, (payload) => {
    // Update dashboard stats, activity feed, recent checkins
  })
  .subscribe();
```

Events:
- `INSERT` → new check-in → update stats + add activity item
- `UPDATE` → check-out → update stats
- `DELETE` → admin hapus → remove dari list

---

## 8. Hardcoded Data yang harus diganti

| Lokasi | Data | Sumber Baru |
|--------|------|-------------|
| `Dashboard.tsx:10-15` | `donutData` hardcoded | Hitung dari `attendances[]` hari ini |
| `Dashboard.tsx:106-110` | `activeShifts` count | Hitung dari `attendances[]` per shift |
| `Dashboard.tsx:104` | `absen + 1` magic number | `totalWorkers - hadir - terlambat` |
| `ProfileTab.tsx:27-31` | `statsBulanIni` | Query attendances bulan ini per user |
| `ReportsPage.tsx:9-14` | `zoneBarData` | Aggregate dari `attendances[]` per zona |
| `AdminLayout.tsx:22` | `notifCount` hardcoded 3 | Query atau set 0 |

---

## 9. Input Validation Rules

| Field | Rule | Implementation |
|-------|------|---------------|
| `zones.latitude` | -90 ≤ val ≤ 90, not NaN | DB CHECK + frontend validate |
| `zones.longitude` | -180 ≤ val ≤ 180, not NaN | DB CHECK + frontend validate |
| `zones.radius_meter` | 1 < val ≤ 10000 | DB CHECK |
| `users.no_hp` | UNIQUE, format phone | DB UNIQUE + frontend regex |
| `shifts.jam_mulai` | format HH:MM | Frontend validate |
| `shifts.jam_selesai` | format HH:MM | Frontend validate |
| `shifts.toleransi_menit` | ≥ 0 | DB CHECK |

---

## 10. Error Response Format

Semua service method harus return:

```typescript
type ServiceResult<T> = {
  success: true;
  data: T;
} | {
  success: false;
  error: string;
  code?: string;
};
```

Error codes:
- `AUTH_REQUIRED` — tidak ada session
- `FORBIDDEN` — role tidak cukup
- `NOT_FOUND` — data tidak ada
- `VALIDATION_ERROR` — input tidak valid
- `NETWORK_ERROR` — Supabase unreachable
- `UNKNOWN` — error lainnya
