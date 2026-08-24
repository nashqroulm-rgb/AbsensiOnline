-- =============================================================
-- FIX — logika terbalik di guard_face_profile_self_update (017)
--
-- Lama: jika kolom status berubah DAN BUKAN (worker daftar-ulang)
--   → raise. Admin ikut kena raise karena kondisi worker = false.
-- Benar: admin lolos bebas; HANYA worker yang dibatasi.
-- =============================================================

CREATE OR REPLACE FUNCTION public.guard_face_profile_self_update()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status     IS DISTINCT FROM OLD.status
  OR NEW.verified_by IS DISTINCT FROM OLD.verified_by
  OR NEW.embedding   IS DISTINCT FROM OLD.embedding THEN

    IF NOT public.is_admin() THEN
      -- Worker: hanya boleh daftar ulang (foto diganti, status tetap 'menunggu')
      IF NOT (NEW.status = 'menunggu' AND OLD.status IN ('menunggu', 'ditolak')) THEN
        RAISE EXCEPTION 'Perubahan status verifikasi hanya oleh admin.';
      END IF;
    END IF;
    -- Admin: lolos tanpa syarat
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Verifikasi manual:
--   Admin: Setujui/Tolak di antrean wajah → berhasil (verified_by terisi).
--   Worker: PATCH status sendiri → error.
--   Worker: daftar ulang setelah ditolak → berhasil, status kembali 'menunggu'.
