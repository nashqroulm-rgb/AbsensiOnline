-- =============================================================
-- AbsensiOnline — Login Helper
-- Security definer function: bypass RLS untuk lookup no_hp saat login
-- =============================================================

CREATE OR REPLACE FUNCTION get_user_by_no_hp(p_no_hp TEXT)
RETURNS TABLE (
  id UUID,
  nama TEXT,
  no_hp TEXT,
  jabatan TEXT,
  role TEXT,
  zona_id UUID,
  shift_id UUID,
  status TEXT,
  tipe TEXT,
  gender TEXT,
  foto TEXT,
  bergabung_sejak DATE,
  absensi_online BOOLEAN
) AS $$
  SELECT
    u.id, u.nama, u.no_hp, u.jabatan, u.role,
    u.zona_id, u.shift_id, u.status, u.tipe,
    u.gender, u.foto, u.bergabung_sejak, u.absensi_online
  FROM users u
  WHERE u.no_hp = p_no_hp
    AND u.status = 'aktif'
  LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER STABLE;
