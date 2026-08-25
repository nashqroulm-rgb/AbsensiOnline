-- =============================================================
-- FIX — 42P01 "relation pts does not exist"
-- Static-pattern check memakai CTE `pts` di DUA statement terpisah;
-- CTE hanya hidup dalam satu statement. Digabung jadi satu rantai.
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
  v_days           integer;
  v_allclose       boolean;
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
    ), uniq AS (
      SELECT count(DISTINCT d) AS n FROM pts
    ), pairs AS (
      SELECT bool_and(
               public.haversine_m(a.latitude_in, a.longitude_in, b.latitude_in, b.longitude_in) < 2
             ) AS all_close
      FROM pts a CROSS JOIN pts b
      WHERE (a.d, a.latitude_in, a.longitude_in) < (b.d, b.latitude_in, b.longitude_in)
    )
    SELECT u.n, p.all_close INTO v_days, v_allclose FROM uniq u CROSS JOIN pairs p;

    IF v_days >= 3 AND v_allclose IS TRUE THEN
      v_reasons := v_reasons || 'koordinat statik';
      IF v_risk <> 'tinggi' THEN v_risk := 'sedang'; END IF;
    END IF;
  END IF;

  NEW.spoof_risk := v_risk;
  NEW.spoof_reasons := v_reasons;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
