-- =============================================================
-- AbsensiOnline — App Settings (singleton)
-- =============================================================

CREATE TABLE app_settings (
  id                        INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  company_name              TEXT NOT NULL DEFAULT 'AbsensiOnline',
  timezone                  TEXT NOT NULL DEFAULT 'Asia/Jakarta',
  default_zone_radius_m     INTEGER NOT NULL DEFAULT 150,
  default_shift_tolerance_min INTEGER NOT NULL DEFAULT 15,
  max_file_size_mb          INTEGER NOT NULL DEFAULT 5,
  max_attachments_per_day   INTEGER NOT NULL DEFAULT 10,
  max_photos_per_day        INTEGER NOT NULL DEFAULT 5,
  max_docs_per_day          INTEGER NOT NULL DEFAULT 5,
  gps_timeout_ms            INTEGER NOT NULL DEFAULT 10000,
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE app_settings ADD CONSTRAINT chk_default_radius
  CHECK (default_zone_radius_m > 0 AND default_zone_radius_m <= 10000);
ALTER TABLE app_settings ADD CONSTRAINT chk_default_tolerance
  CHECK (default_shift_tolerance_min >= 0 AND default_shift_tolerance_min <= 120);
ALTER TABLE app_settings ADD CONSTRAINT chk_max_file_size
  CHECK (max_file_size_mb >= 1 AND max_file_size_mb <= 50);
ALTER TABLE app_settings ADD CONSTRAINT chk_max_attachments
  CHECK (max_attachments_per_day >= 1 AND max_attachments_per_day <= 50);
ALTER TABLE app_settings ADD CONSTRAINT chk_max_photos
  CHECK (max_photos_per_day >= 0 AND max_photos_per_day <= 50);
ALTER TABLE app_settings ADD CONSTRAINT chk_max_docs
  CHECK (max_docs_per_day >= 0 AND max_docs_per_day <= 50);
ALTER TABLE app_settings ADD CONSTRAINT chk_gps_timeout
  CHECK (gps_timeout_ms >= 3000 AND gps_timeout_ms <= 60000);

INSERT INTO app_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

CREATE TRIGGER trigger_app_settings_updated_at
  BEFORE UPDATE ON app_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "app_settings_select_authenticated" ON app_settings
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "app_settings_update_admin" ON app_settings
  FOR UPDATE TO authenticated
  USING ((auth.jwt() -> 'user_metadata' ->> 'role') IN ('admin', 'super_admin'));