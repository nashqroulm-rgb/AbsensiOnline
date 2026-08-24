-- =============================================================
-- ANTI_SPOOF_PLAN Fase A — Validasi lokasi server-side
-- 1. Kolom accuracy & spoof risk
-- 2. haversine_m + is_within_zone (radius + toleransi akurasi)
-- 3. validate_attendance_insert diperluas: radius, plausibility
--    accuracy, impossible-travel, static-pattern → spoof_risk
-- 4. guard_attendance_self_update diperluas: spo kolom ikut
--    dilindungi dari worker
-- =============================================================

-- ---------- A1: skema ----------
ALTER TABLE public.attendances
  ADD COLUMN IF NOT EXISTS accuracy_in  integer,
  ADD COLUMN IF NOT EXISTS accuracy_out integer,
  ADD COLUMN IF NOT EXISTS spoof_risk   text NOT NULL DEFAULT 'belum_dinilai'
    CHECK (spoof_risk IN ('belum_dinilai','rendah','sedang','tinggi')),
  ADD COLUMN IF NOT EXISTS spoof_reasons text[] NOT NULL DEFAULT '{}';

-- ---------- helper jarak ----------
CREATE OR REPLACE FUNCTION public.haversine_m(
  lat1 double precision, lng1 double precision,
  lat2 double precision, lng2 double precision)
RETURNS double precision LANGUAGE sql IMMUTABLE AS $$
  SELECT 6371000 * 2 * atan2(
    sqrt(pow(sin(radians(lat2 - lat1)/2), 2) +
         cos(radians(lat1)) * cos(radians(lat2)) *
         pow(sin(radians(lng2 - lng1)/2), 2)),
    sqrt(1 - pow(sin(radians(lat2 - lat1)/2), 2) +
         cos(radians(lat1)) * cos(radians(lat2)) *
         pow(sin(radians(lng2 - lng1)/2), 2)));
$$;

-- ---------- A2: radius vs zona ----------
CREATE OR REPLACE FUNCTION public.is_within_zone(
  p_lat double precision, p_lng double precision,
  p_zone uuid, p_accuracy integer DEFAULT NULL)
RETURNS boolean LANGUAGE sql STABLE SET search_path = public AS $$
  SELECT z.id IS NOT NULL AND public.haversine_m(p_lat, p_lng, z.latitude, z.longitude)
           <= z.radius_meter + GREATEST(COALESCE(p_accuracy, 100), 100)
  FROM public.zones z WHERE z.id = p_zone;
$$;

-- ---------- guard self-update: tambah kolom spo ----------
CREATE OR REPLACE FUNCTION public.guard_attendance_self_update()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status          IS DISTINCT FROM OLD.status
  OR NEW.checkin_at      IS DISTINCT FROM OLD.checkin_at
  OR NEW.shift_id        IS DISTINCT FROM OLD.shift_id
  OR NEW.zona_id         IS DISTINCT FROM OLD.zona_id
  OR NEW.user_id         IS DISTINCT FROM OLD.user_id
  OR NEW.lampiran_count  IS DISTINCT FROM OLD.lampiran_count
  OR NEW.spoof_risk      IS DISTINCT FROM OLD.spoof_risk
  OR NEW.spoof_reasons   IS DISTINCT FROM OLD.spoof_reasons THEN
    IF NOT public.is_admin() THEN
      RAISE EXCEPTION 'Perubahan kolom ini hanya oleh admin.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ---------- trigger insert: versi ANTI_SPOOF ----------
CREATE OR REPLACE FUNCTION public.validate_attendance_insert()
RETURNS TRIGGER AS $$
DECLARE
  u_absensi_online boolean;
  s_hari_kerja     text[];
  hari_wib         text;
  v_reasons        text[] := '{}';
  v_risk           text := 'rendah';
  prev             record;
  v_hours          double precision;
  v_dist           double precision;
  v_bool           boolean;
BEGIN
  -- [013] sanity waktu
  IF NEW.checkin_at > now() + interval '5 minutes' THEN
    RAISE EXCEPTION 'Waktu check-in tidak valid (di masa depan).';
  END IF;
  IF NEW.checkin_at < now() - interval '25 hours' THEN
    RAISE EXCEPTION 'Waktu check-in terlalu lama di masa lalu (maks. 25 jam).';
  END IF;

  -- [013] absensi_online
  SELECT absensi_online INTO u_absensi_online FROM public.users WHERE id = NEW.user_id;
  IF FOUND AND u_absensi_online = false THEN
    RAISE EXCEPTION 'Absensi online dinonaktifkan oleh admin.';
  END IF;

  -- [013] hari_kerja shift
  SELECT hari_kerja INTO s_hari_kerja FROM public.shifts WHERE id = NULLIF(NEW.shift_id, '');
  IF FOUND AND s_hari_kerja IS NOT NULL AND array_length(s_hari_kerja, 1) > 0 THEN
    hari_wib := CASE extract(isodow FROM (NEW.checkin_at AT TIME ZONE 'Asia/Jakarta'))
      WHEN 1 THEN 'Sen' WHEN 2 THEN 'Sel' WHEN 3 THEN 'Rab' WHEN 4 THEN 'Kam'
      WHEN 5 THEN 'Jum' WHEN 6 THEN 'Sab' WHEN 7 THEN 'Min' END;
    IF NOT (hari_wib = ANY (s_hari_kerja)) THEN
      RAISE EXCEPTION 'Hari ini bukan hari kerja shift Anda.';
    END IF;
  END IF;

  -- [A2] radius zona (tolak keras)
  IF NULLIF(NEW.zona_id::text, '') IS NOT NULL AND NEW.latitude_in IS NOT NULL THEN
    IF NOT public.is_within_zone(NEW.latitude_in, NEW.longitude_in, NEW.zona_id, NEW.accuracy_in) THEN
      RAISE EXCEPTION 'Anda berada di luar area kerja zona ini.';
    END IF;
  END IF;

  -- [A3] plausibility accuracy
  IF NEW.accuracy_in IS NOT NULL AND (NEW.accuracy_in < 1 OR NEW.accuracy_in > 500) THEN
    RAISE EXCEPTION 'Akurasi GPS tidak valid (%m). Coba posisi terbuka.', NEW.accuracy_in;
  END IF;

  -- [A4] impossible travel
  SELECT latitude_in, longitude_in, checkin_at INTO prev
  FROM public.attendances
  WHERE user_id = NEW.user_id AND latitude_in IS NOT NULL AND checkin_at < NEW.checkin_at
  ORDER BY checkin_at DESC LIMIT 1;
  IF FOUND AND NEW.latitude_in IS NOT NULL THEN
    v_hours := GREATEST(EXTRACT(EPOCH FROM (NEW.checkin_at - prev.checkin_at)) / 3600.0, 1.0/60);
    v_dist  := public.haversine_m(prev.latitude_in, prev.longitude_in, NEW.latitude_in, NEW.longitude_in);
    IF (v_dist / 1000.0) / v_hours > 150 THEN
      v_reasons := v_reasons || 'perjalanan mustahil';
      v_risk := 'tinggi';
    END IF;
  END IF;

  -- [A5] pola koordinat statik (3 titik, hari kalender berbeda)
  IF NEW.latitude_in IS NOT NULL THEN
    WITH hist AS (
      SELECT latitude_in, longitude_in,
             (checkin_at AT TIME ZONE 'Asia/Jakarta')::date AS d
      FROM public.attendances
      WHERE user_id = NEW.user_id AND latitude_in IS NOT NULL AND checkin_at < NEW.checkin_at
      ORDER BY checkin_at DESC LIMIT 2
    ), pts AS (
      SELECT latitude_in, longitude_in, d FROM hist
      UNION ALL
      SELECT NEW.latitude_in, NEW.longitude_in,
             (NEW.checkin_at AT TIME ZONE 'Asia/Jakarta')::date
    )
    SELECT count(*) INTO v_dist FROM (
      SELECT DISTINCT d FROM pts
    ) days HAVING count(*) >= 3;
    -- v_dist = jumlah hari unik (>=3 artinya cukup sampel)
    IF v_dist IS NOT NULL AND v_dist >= 3 THEN
      SELECT bool_and(t.ok) INTO v_bool FROM (
        SELECT public.haversine_m(a.latitude_in, a.longitude_in, b.latitude_in, b.longitude_in) < 2 AS ok
        FROM pts a CROSS JOIN pts b
        WHERE (a.d, a.latitude_in) < (b.d, b.latitude_in)
      ) t;
      IF v_bool IS TRUE THEN
        v_reasons := v_reasons || 'koordinat statik';
        IF v_risk <> 'tinggi' THEN v_risk := 'sedang'; END IF;
      END IF;
    END IF;
  END IF;

  NEW.spoof_risk := v_risk;
  NEW.spoof_reasons := v_reasons;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Verifikasi manual:
--   1. curl/SQL INSERT koordinat 10 km dari zona → error 'di luar area'.
--   2. INSERT dengan accuracy_in = 0 → error.
--   3. Replay koordinat identik 3 hari → baris ke-3 spoof_risk='sedang',
--      reasons={'koordinat statik'}; worker tidak bisa mengubahnya via PATCH.
