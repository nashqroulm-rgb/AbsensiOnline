import { supabase } from '../config/supabase';
import type { Attachment, ServiceResult } from '../types';

function extractCloudinaryPublicId(url: string): { publicId: string; resourceType: string } | null {
  try {
    const u = new URL(url);
    const parts = u.pathname.split('/');
    const uploadIdx = parts.indexOf('upload');
    if (uploadIdx === -1) return null;
    const resourceType = parts[uploadIdx - 1] || 'image';
    const rest = parts.slice(uploadIdx + 1);
    const withoutVersion = rest[0]?.startsWith('v') && /^\d+$/.test(rest[0].slice(1)) ? rest.slice(1) : rest;
    const publicId = withoutVersion.join('/').replace(/\.[^.]+$/, '');
    return { publicId, resourceType };
  } catch {
    return null;
  }
}

async function deleteFromCloudinary(url: string): Promise<ServiceResult<void>> {
  const parsed = extractCloudinaryPublicId(url);
  if (!parsed) return { success: false, error: 'Invalid Cloudinary URL' };

  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return { success: false, error: 'Not authenticated' };

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  const res = await fetch(`${supabaseUrl}/functions/v1/cloudinary-delete`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
      apikey: supabaseKey,
    },
    body: JSON.stringify({ public_id: parsed.publicId, resource_type: parsed.resourceType }),
  });

  const result = await res.json();
  // console.log('[Cloudinary Delete] Full response:', JSON.stringify(result, null, 2)); // removed per audit

  if (!res.ok || !result.ok) {
    return { success: false, error: result.error || 'Cloudinary delete failed' };
  }
  return { success: true, data: undefined };
}

export async function getAttachmentsByAttendance(attendanceId: string): Promise<ServiceResult<Attachment[]>> {
  const { data, error } = await supabase
    .from('attachments')
    .select('*')
    .eq('attendance_id', attendanceId)
    .order('created_at', { ascending: false });
  if (error) return { success: false, error: error.message, code: error.code };
  return { success: true, data: data as Attachment[] };
}

export async function getAttachmentsByUser(userId: string): Promise<ServiceResult<Attachment[]>> {
  const { data, error } = await supabase
    .from('attachments')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) return { success: false, error: error.message, code: error.code };
  return { success: true, data: data as Attachment[] };
}

export async function createAttachment(attachment: Omit<Attachment, 'id' | 'created_at'>): Promise<ServiceResult<Attachment>> {
  const { data, error } = await supabase
    .from('attachments')
    .insert(attachment)
    .select();
  if (error) return { success: false, error: error.message, code: error.code };
  return { success: true, data: (data?.[0] as Attachment) || (attachment as Attachment) };
}

export async function deleteAttachment(id: string): Promise<ServiceResult<void>> {
  const { error } = await supabase.from('attachments').delete().eq('id', id);
  if (error) return { success: false, error: error.message, code: error.code };
  return { success: true, data: undefined };
}

export async function updateAttachmentVerification(
  id: string,
  status: 'terverifikasi' | 'ditolak',
): Promise<ServiceResult<Attachment>> {
  const { data, error } = await supabase
    .from('attachments')
    .update({ status_verifikasi: status })
    .eq('id', id)
    .select();
  if (error) return { success: false, error: error.message, code: error.code };
  return { success: true, data: (data?.[0] as Attachment) || ({} as Attachment) };
}

export async function rejectAndDeleteAttachment(id: string): Promise<ServiceResult<void>> {
  const { data: att, error: fetchErr } = await supabase
    .from('attachments')
    .select('url')
    .eq('id', id)
    .single();
  if (fetchErr || !att) return { success: false, error: 'Attachment not found' };

  const cloudRes = await deleteFromCloudinary(att.url);
  if (!cloudRes.success) return cloudRes;

  const { error } = await supabase.from('attachments').delete().eq('id', id);
  if (error) return { success: false, error: error.message, code: error.code };
  return { success: true, data: undefined };
}

export async function incrementLampiranCount(attendanceId: string): Promise<ServiceResult<void>> {
  const { data: att, error: fetchError } = await supabase
    .from('attendances')
    .select('lampiran_count')
    .eq('id', attendanceId)
    .single();
  if (fetchError || !att) return { success: false, error: 'Attendance not found' };

  const { error } = await supabase
    .from('attendances')
    .update({ lampiran_count: (att.lampiran_count || 0) + 1 })
    .eq('id', attendanceId);
  if (error) return { success: false, error: error.message, code: error.code };
  return { success: true, data: undefined };
}
