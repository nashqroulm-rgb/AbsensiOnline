-- =============================================================
-- FIXPLAN audit — tutup celah attendances_update_own
--
-- Policy 001 "attendances_update_own USING (user_id = auth.uid())"
-- tanpa batasan kolom → worker bisa PATCH barisnya sendiri dan
-- mengubah status (terlambat→hadir), checkin_at, shift/zona,
-- bahkan lampiran_count langsung via API.
--
-- Checkout worker tetap butuh update sendiri (checkout_at,
-- durasi_menit, latitude_out...). Solusi: trigger tolak perubahan
-- kolom terlindungi oleh non-admin; admin lewat is_admin().
-- =============================================================

CREATE OR REPLACE FUNCTION public.guard_attendance_self_update()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status      IS DISTINCT FROM OLD.status
  OR NEW.checkin_at  IS DISTINCT FROM OLD.checkin_at
  OR NEW.shift_id    IS DISTINCT FROM OLD.shift_id
  OR NEW.zona_id     IS DISTINCT FROM OLD.zona_id
  OR NEW.user_id     IS DISTINCT FROM OLD.user_id
  OR NEW.lampiran_count IS DISTINCT FROM OLD.lampiran_count THEN
    IF NOT public.is_admin() THEN
      RAISE EXCEPTION 'Perubahan kolom ini hanya oleh admin.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_attendance_self_update_guard ON public.attendances;
CREATE TRIGGER trg_attendance_self_update_guard
  BEFORE UPDATE ON public.attendances
  FOR EACH ROW
  EXECUTE FUNCTION public.guard_attendance_self_update();

-- Verifikasi manual:
--   Worker: UPDATE own row SET status='hadir' WHERE ... → error.
--   Worker checkout normal (update checkout_at/durasi/koordinat) → lolos.
--   Admin override status → lolos (is_admin() true).
