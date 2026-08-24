-- =============================================================
-- FIXPLAN S1 — Tutup kebocoran read publik (dibuat oleh 010)
-- 010_rls_policies.sql membuat policy "Allow anon read *"
-- FOR SELECT USING (true) tanpa TO authenticated → seluruh tabel
-- users & attachments terbaca oleh siapa pun dengan anon key.
-- Migrasi ini menghapusnya; model RLS kembali ke 001/006:
--   zones/shifts: SELECT TO authenticated USING (true)
--   users/attendances/attachments: admin atau own-row saja
-- =============================================================

DROP POLICY IF EXISTS "Allow anon read users"       ON public.users;
DROP POLICY IF EXISTS "Allow anon read attachments" ON public.attachments;
DROP POLICY IF EXISTS "Allow anon read shifts"      ON public.shifts;
DROP POLICY IF EXISTS "Allow anon read zones"       ON public.zones;

-- Defensif (v1.1): kondisi live terbukti menyimpang dari riwayat migrasi
-- lokal (kebocoran terdeteksi walau 010 belum ter-push) — maka hapus
-- SEMUA policy SELECT yang membuka akses ke anon/public, apa pun namanya.
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT schemaname, tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND cmd = 'SELECT'
      AND ('anon' = ANY (roles) OR 'public' = ANY (roles))
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', r.policyname, r.schemaname, r.tablename);
    RAISE NOTICE 'Dropped open SELECT policy: %.% %', r.schemaname, r.tablename, r.policyname;
  END LOOP;
END $$;

-- Verifikasi pasca-apply (jalankan manual):
--   SELECT policyname, roles, cmd FROM pg_policies WHERE schemaname='public';
--   → tidak boleh ada baris SELECT dengan roles memuat 'anon'/'public'.
