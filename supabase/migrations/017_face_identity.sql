-- =============================================================
-- ANTI_SPOOF_PLAN Fase B1 — Identitas wajah (enrolment + status)
-- =============================================================

CREATE TABLE public.face_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES public.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'menunggu'
    CHECK (status IN ('menunggu','terverifikasi','ditolak')),
  images JSONB NOT NULL DEFAULT '[]',
  embedding JSONB,
  verified_by UUID REFERENCES public.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.face_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "face_select_own_or_admin" ON public.face_profiles
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_admin());

CREATE POLICY "face_insert_own" ON public.face_profiles
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- worker boleh mengganti foto miliknya (daftar ulang), tapi BUKAN statusnya:
CREATE POLICY "face_update_own_photos" ON public.face_profiles
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "face_update_admin" ON public.face_profiles
  FOR UPDATE TO authenticated
  USING (public.is_admin());

CREATE POLICY "face_delete_own" ON public.face_profiles
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- Trigger: non-admin tidak boleh mengubah status/verified_by/embedding
CREATE OR REPLACE FUNCTION public.guard_face_profile_self_update()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status
  OR NEW.verified_by IS DISTINCT FROM OLD.verified_by
  OR NEW.embedding IS DISTINCT FROM OLD.embedding THEN
    IF NOT public.is_admin() AND NEW.status = 'menunggu' AND OLD.status IN ('menunggu','ditolak') THEN
      -- worker daftar ulang: status kembali 'menunggu' — boleh
      NULL;
    ELSE
      RAISE EXCEPTION 'Perubahan status verifikasi hanya oleh admin.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_face_self_guard ON public.face_profiles;
CREATE TRIGGER trg_face_self_guard
  BEFORE UPDATE ON public.face_profiles
  FOR EACH ROW EXECUTE FUNCTION public.guard_face_profile_self_update();

CREATE TRIGGER trg_face_updated_at
  BEFORE UPDATE ON public.face_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ---------- kolom selfie di attendances ----------
ALTER TABLE public.attendances
  ADD COLUMN IF NOT EXISTS selfie_url   text,
  ADD COLUMN IF NOT EXISTS selfie_status text NOT NULL DEFAULT 'tidak_ada'
    CHECK (selfie_status IN ('tidak_ada','menunggu','cocok','ragu','gagal')),
  ADD COLUMN IF NOT EXISTS selfie_score numeric;

-- selfie_status juga dilindungi dari worker (soft-block D11 = keputusan admin)
CREATE OR REPLACE FUNCTION public.guard_attendance_self_update()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status          IS DISTINCT FROM OLD.status
  OR NEW.checkin_at      IS DISTINCT FROM OLD.checkin_at
  OR NEW.shift_id        IS DISTINCT FROM OLD.shift_id
  OR NEW.zona_id         IS DISTINCT FROM OLD.zona_id
  OR NEW.user_id         IS DISTINCT FROM OLD.user_id
  OR NEW.lampiran_count  IS DISTINCT FROM OLD.lampiran_count
  OR NEW.spoof_risk      IS DISTINCT FROM OLD.spoof_risk
  OR NEW.spoof_reasons   IS DISTINCT FROM OLD.spoof_reasons
  OR NEW.selfie_status   IS DISTINCT FROM OLD.selfie_status
  OR NEW.selfie_score    IS DISTINCT FROM OLD.selfie_score THEN
    IF NOT public.is_admin() THEN
      RAISE EXCEPTION 'Perubahan kolom ini hanya oleh admin.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Catatan: selfie_url diisi worker saat insert (nilai awal), bukan via
-- update — sehingga tidak masuk daftar terlindungi.
