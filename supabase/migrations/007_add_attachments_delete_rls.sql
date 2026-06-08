-- Fix: tambah RLS DELETE policy untuk attachments
-- Tanpa ini, admin tidak bisa menghapus lampiran dari DB

CREATE POLICY "attachments_delete_admin" ON attachments
  FOR DELETE TO authenticated
  USING ((auth.jwt() -> 'user_metadata' ->> 'role') IN ('admin', 'super_admin'));
