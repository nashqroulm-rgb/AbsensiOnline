-- =============================================================
-- FIXPLAN migrasi gabungan fase F1/F2 (T8, U3, U4, U9, D10)
-- 1. Worker boleh hapus lampiran miliknya sendiri (U3)
-- 2. increment_lampiran_count atomic RPC (U4)
-- 3. Audit trail override status (D10, kolom minimal)
-- 4. Guard INSERT attendance: absensi_online, hari_kerja,
--    sanity waktu (backdating/future) — T8 + U9 opsi (b)
-- =============================================================

-- ---------- U3: hapus lampiran sendiri ----------
CREATE POLICY "attachments_delete_own" ON public.attachments
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- ---------- U4: counter atomik ----------
CREATE OR REPLACE FUNCTION public.increment_lampiran_count(p_attendance_id uuid)
RETURNS void
LANGUAGE sql SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.attendances
  SET lampiran_count = COALESCE(lampiran_count, 0) + 1
  WHERE id = p_attendance_id;
$$;

REVOKE EXECUTE ON FUNCTION public.increment_lampiran_count(uuid) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.increment_lampiran_count(uuid) TO authenticated;

-- ---------- D10: audit override ----------
ALTER TABLE public.attendances ADD COLUMN IF NOT EXISTS overridden_by uuid REFERENCES public.users(id);
ALTER TABLE public.attendances ADD COLUMN IF NOT EXISTS overridden_at timestamptz;

CREATE OR REPLACE FUNCTION public.set_override_audit()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    NEW.overridden_by := auth.uid();
    NEW.overridden_at := now();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_attendance_override_audit ON public.attendances;
CREATE TRIGGER trg_attendance_override_audit
  BEFORE UPDATE OF status ON public.attendances
  FOR EACH ROW
  EXECUTE FUNCTION public.set_override_audit();

-- ---------- T8 + U9: guard insert ----------
-- Catatan hari_kerja: nilai kanonik adalah nama pendek Indonesia
-- 'Min','Sen','Sel','Rab','Kam','Jum','Sab' (samakan dengan data shift;
-- guard hanya aktif bila array tidak kosong).
CREATE OR REPLACE FUNCTION public.validate_attendance_insert()
RETURNS TRIGGER AS $$
DECLARE
  u_absensi_online boolean;
  s_hari_kerja     text[];
  hari_wib         text;
BEGIN
  -- U9: sanity waktu. Ceiling pragmatis: tolak masa depan >5 menit dan
  -- masa lalu >25 jam (cukup utk antrean offline semalam). Naikkan bila
  -- kebutuhan antrean lebih panjang.
  IF NEW.checkin_at > now() + interval '5 minutes' THEN
    RAISE EXCEPTION 'Waktu check-in tidak valid (di masa depan).';
  END IF;
  IF NEW.checkin_at < now() - interval '25 hours' THEN
    RAISE EXCEPTION 'Waktu check-in terlalu lama di masa lalu (maks. 25 jam).';
  END IF;

  -- T8: absensi_online = false → tolak
  SELECT absensi_online INTO u_absensi_online FROM public.users WHERE id = NEW.user_id;
  IF FOUND AND u_absensi_online = false THEN
    RAISE EXCEPTION 'Absensi online dinonaktifkan oleh admin.';
  END IF;

  -- T8: di luar hari_kerja shift → tolak
  SELECT hari_kerja INTO s_hari_kerja FROM public.shifts WHERE id = NULLIF(NEW.shift_id, '');
  IF FOUND AND s_hari_kerja IS NOT NULL AND array_length(s_hari_kerja, 1) > 0 THEN
    hari_wib := CASE extract(isodow FROM (NEW.checkin_at AT TIME ZONE 'Asia/Jakarta'))
      WHEN 1 THEN 'Sen' WHEN 2 THEN 'Sel' WHEN 3 THEN 'Rab' WHEN 4 THEN 'Kam'
      WHEN 5 THEN 'Jum' WHEN 6 THEN 'Sab' WHEN 7 THEN 'Min' END;
    IF NOT (hari_wib = ANY (s_hari_kerja)) THEN
      RAISE EXCEPTION 'Hari ini bukan hari kerja shift Anda.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_attendance_insert_guard ON public.attendances;
CREATE TRIGGER trg_attendance_insert_guard
  BEFORE INSERT ON public.attendances
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_attendance_insert();

-- Verifikasi manual pasca-apply:
--   1. INSERT attendance dengan checkin_at = now()+interval '1 hour' → error.
--   2. Worker dgn users.absensi_online=false → INSERT ditolak.
--   3. Shift hari_kerja '{Sen}' + checkin hari Minggu WIB → INSERT ditolak.
