-- =============================================================
-- AbsensiOnline — Initial Schema
-- Generated: 2026-06-08
-- Urutan: zones → shifts → users → attendances → attachments
-- =============================================================

-- =============================================================
-- 1. TABLES (tanpa FK circular)
-- =============================================================

-- 1.1 zones (no FK dependencies)
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

ALTER TABLE zones ADD CONSTRAINT chk_latitude CHECK (latitude BETWEEN -90 AND 90);
ALTER TABLE zones ADD CONSTRAINT chk_longitude CHECK (longitude BETWEEN -180 AND 180);
ALTER TABLE zones ADD CONSTRAINT chk_radius CHECK (radius_meter > 0 AND radius_meter <= 10000);

-- 1.2 shifts (no FK dependencies)
CREATE TABLE shifts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nama            TEXT NOT NULL,
  jam_mulai       TEXT NOT NULL,
  jam_selesai     TEXT NOT NULL,
  toleransi_menit INTEGER NOT NULL DEFAULT 15,
  status          TEXT NOT NULL DEFAULT 'aktif' CHECK (status IN ('aktif', 'nonaktif')),
  ikon            TEXT NOT NULL DEFAULT '🏢',
  hari_kerja      TEXT[] NOT NULL DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE shifts ADD CONSTRAINT chk_toleransi CHECK (toleransi_menit >= 0);

-- 1.3 users (FK → zones, shifts)
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

CREATE INDEX idx_users_no_hp_role ON users(no_hp, role);
CREATE INDEX idx_users_zona ON users(zona_id);
CREATE INDEX idx_users_shift ON users(shift_id);

-- 1.4 attendances (FK → users, shifts, zones)
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

CREATE INDEX idx_attendances_user_date ON attendances(user_id, checkin_at DESC);
CREATE INDEX idx_attendances_date ON attendances(checkin_at DESC);
CREATE INDEX idx_attendances_zona ON attendances(zona_id);
CREATE INDEX idx_attendances_status ON attendances(status);

-- 1.5 attachments (FK → attendances, users)
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

-- =============================================================
-- 2. FUNCTIONS
-- =============================================================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_zones_updated_at
  BEFORE UPDATE ON zones FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trigger_shifts_updated_at
  BEFORE UPDATE ON shifts FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trigger_users_updated_at
  BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trigger_attendances_updated_at
  BEFORE UPDATE ON attendances FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Derive attendance status dari checkin time + shift toleransi
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

  v_scheduled := (p_checkin_at::date || ' ' || v_shift.jam_mulai || ':00+07')::timestamptz;
  v_diff_min := EXTRACT(EPOCH FROM (p_checkin_at - v_scheduled)) / 60;

  IF v_diff_min > v_shift.toleransi_menit THEN
    RETURN 'terlambat';
  ELSE
    RETURN 'hadir';
  END IF;
END;
$$ LANGUAGE plpgsql;

-- =============================================================
-- 3. ROW LEVEL SECURITY (RLS)
-- =============================================================

ALTER TABLE zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendances ENABLE ROW LEVEL SECURITY;
ALTER TABLE attachments ENABLE ROW LEVEL SECURITY;

-- --- zones ---
CREATE POLICY "zones_select_all" ON zones
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "zones_insert_admin" ON zones
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'super_admin')));

CREATE POLICY "zones_update_admin" ON zones
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'super_admin')));

CREATE POLICY "zones_delete_admin" ON zones
  FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'super_admin')));

-- --- shifts ---
CREATE POLICY "shifts_select_all" ON shifts
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "shifts_insert_admin" ON shifts
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'super_admin')));

CREATE POLICY "shifts_update_admin" ON shifts
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'super_admin')));

CREATE POLICY "shifts_delete_admin" ON shifts
  FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'super_admin')));

-- --- users ---
CREATE POLICY "users_select_admin" ON users
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'super_admin')));

CREATE POLICY "users_select_own" ON users
  FOR SELECT TO authenticated
  USING (id = auth.uid());

CREATE POLICY "users_insert_admin" ON users
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'super_admin')));

CREATE POLICY "users_update_admin" ON users
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'super_admin')));

CREATE POLICY "users_delete_admin" ON users
  FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'super_admin')));

-- --- attendances ---
CREATE POLICY "attendances_select_admin" ON attendances
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'super_admin')));

CREATE POLICY "attendances_select_own" ON attendances
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "attendances_insert_own" ON attendances
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "attendances_update_own" ON attendances
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "attendances_update_admin" ON attendances
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'super_admin')));

CREATE POLICY "attendances_delete_admin" ON attendances
  FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'super_admin')));

-- --- attachments ---
CREATE POLICY "attachments_select_admin" ON attachments
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'super_admin')));

CREATE POLICY "attachments_select_own" ON attachments
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "attachments_insert_own" ON attachments
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "attachments_update_admin" ON attachments
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'super_admin')));

-- =============================================================
-- 4. SEED DATA (opsional — untuk dev/testing)
-- =============================================================

-- Zones (UUID stabil berdasarkan ID lama)
INSERT INTO zones (id, nama, deskripsi, latitude, longitude, radius_meter, status, color) VALUES
  ('a0000000-0000-4000-8000-000000000001', 'Blok A - Gudang Utama', 'Area gudang penyimpanan bahan baku', -6.2088, 106.8456, 150, 'aktif', '#16A34A'),
  ('a0000000-0000-4000-8000-000000000002', 'Blok B - Produksi', 'Area lantai produksi utama', -6.2100, 106.8470, 200, 'aktif', '#2563EB'),
  ('a0000000-0000-4000-8000-000000000003', 'Blok C - Kantor', 'Area perkantoran dan administrasi', -6.2075, 106.8440, 100, 'aktif', '#D97706'),
  ('a0000000-0000-4000-8000-000000000004', 'Blok D - Lapangan', 'Area lapangan terbuka dan parkir', -6.2115, 106.8490, 300, 'aktif', '#7C3AED'),
  ('a0000000-0000-4000-8000-000000000005', 'Site Remote - Bekasi', 'Lokasi proyek di Bekasi', -6.2400, 106.9920, 250, 'nonaktif', '#DC2626')
ON CONFLICT (id) DO NOTHING;

-- Shifts
INSERT INTO shifts (id, nama, jam_mulai, jam_selesai, toleransi_menit, status, ikon, hari_kerja) VALUES
  ('b0000000-0000-4000-8000-000000000001', 'Shift Pagi',  '07:00', '15:00', 15, 'aktif', '🌅', ARRAY['Senin','Selasa','Rabu','Kamis','Jumat']),
  ('b0000000-0000-4000-8000-000000000002', 'Shift Siang',  '15:00', '23:00', 15, 'aktif', '☀️', ARRAY['Senin','Selasa','Rabu','Kamis','Jumat','Sabtu']),
  ('b0000000-0000-4000-8000-000000000003', 'Shift Malam',  '23:00', '07:00', 20, 'aktif', '🌙', ARRAY['Senin','Selasa','Rabu','Kamis','Jumat','Sabtu','Minggu']),
  ('b0000000-0000-4000-8000-000000000004', 'Shift Normal', '08:00', '17:00', 30, 'aktif', '🏢', ARRAY['Senin','Selasa','Rabu','Kamis','Jumat'])
ON CONFLICT (id) DO NOTHING;

-- Users (admin + workers)
-- PIN: 1234 → Supabase Auth: {no_hp}@absensi.local / 1234
INSERT INTO users (id, nama, no_hp, jabatan, role, zona_id, shift_id, status, tipe, gender, bergabung_sejak, absensi_online) VALUES
  ('c0000000-0000-4000-8000-000000000001', 'Budi Santoso',    '081234567890', 'Operator Gudang',       'worker', 'a0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000001', 'aktif', 'tetap',   'pria',   '2023-01-15', true),
  ('c0000000-0000-4000-8000-000000000002', 'Sari Dewi',       '081234567891', 'Supervisor Produksi',   'worker', 'a0000000-0000-4000-8000-000000000002', 'b0000000-0000-4000-8000-000000000001', 'aktif', 'tetap',   'wanita', '2022-08-01', true),
  ('c0000000-0000-4000-8000-000000000003', 'Ahmad Rizky',     '081234567892', 'Teknisi Mesin',         'worker', 'a0000000-0000-4000-8000-000000000002', 'b0000000-0000-4000-8000-000000000002', 'aktif', 'kontrak', 'pria',   '2024-03-10', true),
  ('c0000000-0000-4000-8000-000000000004', 'Dewi Rahayu',     '081234567893', 'Admin Kantor',          'worker', 'a0000000-0000-4000-8000-000000000003', 'b0000000-0000-4000-8000-000000000004', 'aktif', 'tetap',   'wanita', '2021-06-20', true),
  ('c0000000-0000-4000-8000-000000000005', 'Eko Prasetyo',    '081234567894', 'Security',              'worker', 'a0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000003', 'aktif', 'harian',  'pria',   '2023-11-05', true),
  ('c0000000-0000-4000-8000-000000000006', 'Fitri Handayani', '081234567895', 'QC Inspector',          'worker', 'a0000000-0000-4000-8000-000000000002', 'b0000000-0000-4000-8000-000000000001', 'aktif', 'tetap',   'wanita', '2022-04-18', true),
  ('c0000000-0000-4000-8000-000000000007', 'Gunawan Wibowo',  '081234567896', 'Driver Forklift',       'worker', 'a0000000-0000-4000-8000-000000000004', 'b0000000-0000-4000-8000-000000000002', 'aktif', 'tetap',   'pria',   '2020-09-01', false),
  ('c0000000-0000-4000-8000-000000000008', 'Hani Susanti',    '081234567897', 'Operator Packing',      'worker', 'a0000000-0000-4000-8000-000000000002', 'b0000000-0000-4000-8000-000000000001', 'nonaktif', 'kontrak', 'wanita', '2024-01-15', true),
  ('c0000000-0000-4000-8000-000000000009', 'Irwan Setiawan',  '081234567898', 'Manajer Lapangan',      'admin',  'a0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000004', 'aktif', 'tetap',   'pria',   '2019-03-12', true),
  ('c0000000-0000-4000-8000-000000000010', 'Joko Widodo',     '081234567899', 'Helper',                'worker', 'a0000000-0000-4000-8000-000000000004', 'b0000000-0000-4000-8000-000000000001', 'aktif', 'harian',  'pria',   '2025-01-10', true),
  ('c0000000-0000-4000-8000-000000000011', 'Admin Sistem',    '080000000001', 'System Administrator',  'admin',  'a0000000-0000-4000-8000-000000000003', 'b0000000-0000-4000-8000-000000000004', 'aktif', 'tetap',   'pria',   '2020-01-01', false)
ON CONFLICT (id) DO NOTHING;
