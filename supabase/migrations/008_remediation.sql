-- =============================================================
-- AbsensiOnline — Remediation
-- 1. Trigger status terlambat/hadir via derive_attendance_status
-- 2. Unique: satu check-in per user per hari (WIB)
-- =============================================================

CREATE OR REPLACE FUNCTION set_attendance_status_on_write()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.checkin_at IS NOT NULL AND NEW.shift_id IS NOT NULL THEN
    NEW.status := derive_attendance_status(NEW.checkin_at, NEW.shift_id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_attendance_status_on_insert ON attendances;
CREATE TRIGGER trg_attendance_status_on_insert
  BEFORE INSERT ON attendances
  FOR EACH ROW
  EXECUTE FUNCTION set_attendance_status_on_write();

DROP TRIGGER IF EXISTS trg_attendance_status_on_update ON attendances;
CREATE TRIGGER trg_attendance_status_on_update
  BEFORE UPDATE OF checkin_at, shift_id ON attendances
  FOR EACH ROW
  WHEN (NEW.checkin_at IS NOT NULL AND NEW.shift_id IS NOT NULL)
  EXECUTE FUNCTION set_attendance_status_on_write();

CREATE UNIQUE INDEX IF NOT EXISTS idx_attendances_one_checkin_per_day
  ON attendances (
    user_id,
    ((checkin_at AT TIME ZONE 'Asia/Jakarta')::date)
  )
  WHERE checkin_at IS NOT NULL;