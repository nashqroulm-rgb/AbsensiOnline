-- =============================================================
-- Emergency cleanup: remove broken auth users
-- =============================================================

DELETE FROM auth.users WHERE email IN (
  '080000000001@absensi.local',
  '081234567890@absensi.local'
);
