-- =============================================================
-- FIX — 22P02 "invalid input syntax for type uuid: \"\""
-- NULLIF(NEW.shift_id,'') memaksa cast '' → uuid di dalam trigger,
-- sehingga SEMUA insert attendance gagal sejak 013.
-- Ganti dengan pemeriksaan IS NOT NULL yang benar.
-- =============================================================

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
  IF NEW.checkin_at > now() + interval '5 minutes' THEN
    RAISE EXCEPTION 'Waktu check-in tidak valid (di masa depan).';
  END IF;
  IF NEW.checkin_at < now() - interval '25 hours' THEN
    RAISE EXCEPTION 'Waktu check-in terlalu lama di masa lalu (maks. 25 jam).';
  END IF;

  SELECT absensi_online INTO u_absensi_online FROM public.users WHERE id = NEW.user_id;
  IF FOUND AND u_absensi_online = false THEN
    RAISE EXCEPTION 'Absensi online dinonaktifkan oleh admin.';
  END IF;

  -- FIX: tanpa NULLIF terhadap kolom uuid
  IF NEW.shift_id IS NOT NULL THEN
    SELECT hari_kerja INTO s_hari_kerja FROM public.shifts WHERE id = NEW.shift_id;
    IF FOUND AND s_hari_kerja IS NOT NULL AND array_length(s_hari_kerja, 1) > 0 THEN
      hari_wib := CASE extract(isodow FROM (NEW.checkin_at AT TIME ZONE 'Asia/Jakarta'))
        WHEN 1 THEN 'Sen' WHEN 2 THEN 'Sel' WHEN 3 THEN 'Rab' WHEN 4 THEN 'Kam'
        WHEN 5 THEN 'Jum' WHEN 6 THEN 'Sab' WHEN 7 THEN 'Min' END;
      IF NOT (
        hari_wib = ANY (ARRAY(SELECT public.normalize_day_name(h) FROM unnest(s_hari_kerja) h))
      ) THEN
        RAISE EXCEPTION 'Hari ini bukan hari kerja shift Anda.';
      END IF;
    END IF;
  END IF;

  IF NEW.zona_id IS NOT NULL AND NEW.latitude_in IS NOT NULL THEN
    IF NOT public.is_within_zone(NEW.latitude_in, NEW.longitude_in, NEW.zona_id, NEW.accuracy_in) THEN
      RAISE EXCEPTION 'Anda berada di luar area kerja zona ini.';
    END IF;
  END IF;

  IF NEW.accuracy_in IS NOT NULL AND (NEW.accuracy_in < 1 OR NEW.accuracy_in > 500) THEN
    RAISE EXCEPTION 'Akurasi GPS tidak valid (%m). Coba posisi terbuka.', NEW.accuracy_in;
  END IF;

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
    SELECT count(*) INTO v_dist FROM (SELECT DISTINCT d FROM pts) days HAVING count(*) >= 3;
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

-- Catatan: payload client juga diperbaiki mengirim NULL (bukan '')
-- untuk shift kosong — lihat attendance.service.ts.
