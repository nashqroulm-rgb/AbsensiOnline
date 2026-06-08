-- =============================================================
-- Fix RLS: users_select_admin caused infinite recursion
-- Subquery ke users FROM users = recursive loop → 500 error
-- Fix: gunakan auth.jwt() -> raw_user_meta_data -> role
-- =============================================================

-- Drop recursive policies
DROP POLICY IF EXISTS "users_select_admin" ON users;
DROP POLICY IF EXISTS "users_insert_admin" ON users;
DROP POLICY IF EXISTS "users_update_admin" ON users;
DROP POLICY IF EXISTS "users_delete_admin" ON users;

-- Recreate with auth.jwt() (no subquery, no recursion)
CREATE POLICY "users_select_admin" ON users
  FOR SELECT TO authenticated
  USING ((auth.jwt() -> 'user_metadata' ->> 'role') IN ('admin', 'super_admin'));

CREATE POLICY "users_insert_admin" ON users
  FOR INSERT TO authenticated
  WITH CHECK ((auth.jwt() -> 'user_metadata' ->> 'role') IN ('admin', 'super_admin'));

CREATE POLICY "users_update_admin" ON users
  FOR UPDATE TO authenticated
  USING ((auth.jwt() -> 'user_metadata' ->> 'role') IN ('admin', 'super_admin'));

CREATE POLICY "users_delete_admin" ON users
  FOR DELETE TO authenticated
  USING ((auth.jwt() -> 'user_metadata' ->> 'role') IN ('admin', 'super_admin'));

-- Also fix other tables that had the same recursive pattern
DROP POLICY IF EXISTS "zones_insert_admin" ON zones;
DROP POLICY IF EXISTS "zones_update_admin" ON zones;
DROP POLICY IF EXISTS "zones_delete_admin" ON zones;
CREATE POLICY "zones_insert_admin" ON zones
  FOR INSERT TO authenticated
  WITH CHECK ((auth.jwt() -> 'user_metadata' ->> 'role') IN ('admin', 'super_admin'));
CREATE POLICY "zones_update_admin" ON zones
  FOR UPDATE TO authenticated
  USING ((auth.jwt() -> 'user_metadata' ->> 'role') IN ('admin', 'super_admin'));
CREATE POLICY "zones_delete_admin" ON zones
  FOR DELETE TO authenticated
  USING ((auth.jwt() -> 'user_metadata' ->> 'role') IN ('admin', 'super_admin'));

DROP POLICY IF EXISTS "shifts_insert_admin" ON shifts;
DROP POLICY IF EXISTS "shifts_update_admin" ON shifts;
DROP POLICY IF EXISTS "shifts_delete_admin" ON shifts;
CREATE POLICY "shifts_insert_admin" ON shifts
  FOR INSERT TO authenticated
  WITH CHECK ((auth.jwt() -> 'user_metadata' ->> 'role') IN ('admin', 'super_admin'));
CREATE POLICY "shifts_update_admin" ON shifts
  FOR UPDATE TO authenticated
  USING ((auth.jwt() -> 'user_metadata' ->> 'role') IN ('admin', 'super_admin'));
CREATE POLICY "shifts_delete_admin" ON shifts
  FOR DELETE TO authenticated
  USING ((auth.jwt() -> 'user_metadata' ->> 'role') IN ('admin', 'super_admin'));

DROP POLICY IF EXISTS "attendances_select_admin" ON attendances;
DROP POLICY IF EXISTS "attendances_update_admin" ON attendances;
DROP POLICY IF EXISTS "attendances_delete_admin" ON attendances;
CREATE POLICY "attendances_select_admin" ON attendances
  FOR SELECT TO authenticated
  USING ((auth.jwt() -> 'user_metadata' ->> 'role') IN ('admin', 'super_admin'));
CREATE POLICY "attendances_update_admin" ON attendances
  FOR UPDATE TO authenticated
  USING ((auth.jwt() -> 'user_metadata' ->> 'role') IN ('admin', 'super_admin'));
CREATE POLICY "attendances_delete_admin" ON attendances
  FOR DELETE TO authenticated
  USING ((auth.jwt() -> 'user_metadata' ->> 'role') IN ('admin', 'super_admin'));

DROP POLICY IF EXISTS "attachments_select_admin" ON attachments;
DROP POLICY IF EXISTS "attachments_update_admin" ON attachments;
CREATE POLICY "attachments_select_admin" ON attachments
  FOR SELECT TO authenticated
  USING ((auth.jwt() -> 'user_metadata' ->> 'role') IN ('admin', 'super_admin'));
CREATE POLICY "attachments_update_admin" ON attachments
  FOR UPDATE TO authenticated
  USING ((auth.jwt() -> 'user_metadata' ->> 'role') IN ('admin', 'super_admin'));
