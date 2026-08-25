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
    // hint kolom wajib: tabel ini punya 2 FK ke users (user_id & verified_by)
    .select('*, users!user_id(nama)')
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

/** ANTI_SPOOF B1 — admin reset verifikasi: profil jadi 'ditolak' sehingga
 *  worker langsung mendapat form daftar ulang. found=false bila tak pernah daftar. */
export async function resetFaceVerification(
  userId: string,
): Promise<ServiceResult<void> & { found: boolean }> {
  const { data: { session } } = await supabase.auth.getSession();
  const { data, error } = await supabase
    .from('face_profiles')
    .update({ status: 'ditolak', verified_by: session?.user?.id ?? null })
    .eq('user_id', userId)
    .select('id')
    .maybeSingle();
  if (error) return { success: false, error: error.message, code: error.code, found: false };
  return { success: true, data: undefined, found: !!data };
}

/** ANTI_SPOOF B1: antrean selfie absensi yang menunggu keputusan admin. */
export async function getPendingSelfies(): Promise<ServiceResult<{
  id: string;
  user_nama: string;
  checkin_at: string | null;
  selfie_url: string | null;
}[]>> {
  const { data, error } = await supabase
    .from('attendances')
    .select('id, user_nama, checkin_at, selfie_url')
    .eq('selfie_status', 'menunggu')
    .order('checkin_at', { ascending: false })
    .limit(50);
  if (error) return { success: false, error: error.message, code: error.code };
  const rows = data as { id: string; user_nama: string; checkin_at: string | null; selfie_url: string | null }[];
  return { success: true, data: rows };
}

/** Keputusan admin atas selfie absensi (D11: soft-block). */
export async function setSelfieReview(
  id: string,
  status: 'cocok' | 'ragu' | 'gagal',
): Promise<ServiceResult<void>> {
  const { error } = await supabase
    .from('attendances')
    .update({ selfie_status: status })
    .eq('id', id);
  if (error) return { success: false, error: error.message, code: error.code };
  return { success: true, data: undefined };
}
