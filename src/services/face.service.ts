import { supabase } from '../config/supabase';
import type { ServiceResult } from '../types';

// ANTI_SPOOF Fase B1 — profil wajah (enrolment + verifikasi admin)

export type FaceVerificationStatus = 'menunggu' | 'terverifikasi' | 'ditolak';

export interface FaceImage { url: string; created_at: string }

export interface FaceProfile {
  id: string;
  user_id: string;
  status: FaceVerificationStatus;
  images: FaceImage[];
  user_nama?: string;
}

export async function getMyFaceProfile(userId: string): Promise<ServiceResult<FaceProfile | null>> {
  const { data, error } = await supabase
    .from('face_profiles')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) return { success: false, error: error.message, code: error.code };
  return { success: true, data: (data as FaceProfile) ?? null };
}

/** Daftar baru / daftar ulang (foto diganti, status kembali 'menunggu'). */
export async function submitFaceEnrolment(
  userId: string,
  images: FaceImage[],
): Promise<ServiceResult<FaceProfile>> {
  const existing = await getMyFaceProfile(userId);
  if (!existing.success) return { success: false, error: existing.error };

  if (existing.data) {
    const { data, error } = await supabase
      .from('face_profiles')
      .update({ images, status: 'menunggu' })
      .eq('id', existing.data.id)
      .select()
      .single();
    if (error) return { success: false, error: error.message, code: error.code };
    return { success: true, data: data as FaceProfile };
  }

  const { data, error } = await supabase
    .from('face_profiles')
    .insert({ user_id: userId, images })
    .select()
    .single();
  if (error) return { success: false, error: error.message, code: error.code };
  return { success: true, data: data as FaceProfile };
}

export async function getPendingFaceProfiles(): Promise<ServiceResult<(FaceProfile & { user_nama: string })[]>> {
  const { data, error } = await supabase
    .from('face_profiles')
    .select('*, users!inner(nama)')
    .eq('status', 'menunggu')
    .order('created_at');
  if (error) return { success: false, error: error.message, code: error.code };
  const rows = (data as unknown as (FaceProfile & { users: { nama: string } })[]).map(r => ({
    ...r,
    user_nama: r.users.nama,
  }));
  return { success: true, data: rows };
}

export async function setFaceProfileStatus(
  id: string,
  status: Extract<FaceVerificationStatus, 'terverifikasi' | 'ditolak'>,
): Promise<ServiceResult<void>> {
  const { data: { session } } = await supabase.auth.getSession();
  const { error } = await supabase
    .from('face_profiles')
    .update({ status, verified_by: session?.user?.id ?? null })
    .eq('id', id);
  if (error) return { success: false, error: error.message, code: error.code };
  return { success: true, data: undefined };
}
