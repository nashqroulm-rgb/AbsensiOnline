-- =============================================================
-- FIXPLAN S2 — Otorisasi admin dari tabel users, bukan JWT metadata
--
-- Masalah: policy admin memakai (auth.jwt() -> 'user_metadata' ->> 'role').
-- Supabase mengizinkan user mengubah user_metadata miliknya sendiri via
-- auth.updateUser({ data }) → eskalasi worker menjadi admin.
--
-- Solusi: helper is_admin() SECURITY DEFINER membaca public.users.role
-- (definer bypass RLS → tidak ada rekursi ala 006).
-- =============================================================

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid()
      AND role IN ('admin', 'super_admin')
      AND status = 'aktif'
  );
$$;

REVOKE EXECUTE ON FUNCTION public.is_admin() FROM anon;

-- ------------------------------------------------------------
-- users (pengganti policy 006)
-- ------------------------------------------------------------
DROP POLICY IF EXISTS "users_select_admin" ON public.users;
CREATE POLICY "users_select_admin" ON public.users
  FOR SELECT TO authenticated USING (public.is_admin());

DROP POLICY IF EXISTS "users_insert_admin" ON public.users;
CREATE POLICY "users_insert_admin" ON public.users
  FOR INSERT TO authenticated WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "users_update_admin" ON public.users;
CREATE POLICY "users_update_admin" ON public.users
  FOR UPDATE TO authenticated USING (public.is_admin());

DROP POLICY IF EXISTS "users_delete_admin" ON public.users;
CREATE POLICY "users_delete_admin" ON public.users
  FOR DELETE TO authenticated USING (public.is_admin());

-- ------------------------------------------------------------
-- zones (pengganti policy 006)
-- ------------------------------------------------------------
DROP POLICY IF EXISTS "zones_insert_admin" ON public.zones;
CREATE POLICY "zones_insert_admin" ON public.zones
  FOR INSERT TO authenticated WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "zones_update_admin" ON public.zones;
CREATE POLICY "zones_update_admin" ON public.zones
  FOR UPDATE TO authenticated USING (public.is_admin());

DROP POLICY IF EXISTS "zones_delete_admin" ON public.zones;
CREATE POLICY "zones_delete_admin" ON public.zones
  FOR DELETE TO authenticated USING (public.is_admin());

-- ------------------------------------------------------------
-- shifts (pengganti policy 006)
-- ------------------------------------------------------------
DROP POLICY IF EXISTS "shifts_insert_admin" ON public.shifts;
CREATE POLICY "shifts_insert_admin" ON public.shifts
  FOR INSERT TO authenticated WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "shifts_update_admin" ON public.shifts;
CREATE POLICY "shifts_update_admin" ON public.shifts
  FOR UPDATE TO authenticated USING (public.is_admin());

DROP POLICY IF EXISTS "shifts_delete_admin" ON public.shifts;
CREATE POLICY "shifts_delete_admin" ON public.shifts
  FOR DELETE TO authenticated USING (public.is_admin());

-- ------------------------------------------------------------
-- attendances (pengganti policy 006)
-- ------------------------------------------------------------
DROP POLICY IF EXISTS "attendances_select_admin" ON public.attendances;
CREATE POLICY "attendances_select_admin" ON public.attendances
  FOR SELECT TO authenticated USING (public.is_admin());

DROP POLICY IF EXISTS "attendances_update_admin" ON public.attendances;
CREATE POLICY "attendances_update_admin" ON public.attendances
  FOR UPDATE TO authenticated USING (public.is_admin());

DROP POLICY IF EXISTS "attendances_delete_admin" ON public.attendances;
CREATE POLICY "attendances_delete_admin" ON public.attendances
  FOR DELETE TO authenticated USING (public.is_admin());

-- ------------------------------------------------------------
-- attachments (pengganti policy 006 + 007)
-- ------------------------------------------------------------
DROP POLICY IF EXISTS "attachments_select_admin" ON public.attachments;
CREATE POLICY "attachments_select_admin" ON public.attachments
  FOR SELECT TO authenticated USING (public.is_admin());

DROP POLICY IF EXISTS "attachments_update_admin" ON public.attachments;
CREATE POLICY "attachments_update_admin" ON public.attachments
  FOR UPDATE TO authenticated USING (public.is_admin());

DROP POLICY IF EXISTS "attachments_delete_admin" ON public.attachments;
CREATE POLICY "attachments_delete_admin" ON public.attachments
  FOR DELETE TO authenticated USING (public.is_admin());

-- ------------------------------------------------------------
-- app_settings (pengganti policy 009)
-- ------------------------------------------------------------
DROP POLICY IF EXISTS "app_settings_update_admin" ON public.app_settings;
CREATE POLICY "app_settings_update_admin" ON public.app_settings
  FOR UPDATE TO authenticated USING (public.is_admin());

-- Verifikasi pasca-apply:
--   1. Worker login → updateUser({ data: { role: 'admin' } })
--      → insert zone harus ditolak RLS.
--   2. Admin login → CRUD zona/shift/pekerja tetap jalan.
--   3. SELECT pg_policies → tidak ada lagi 'user_metadata' di qual/check.
