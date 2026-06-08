import { supabase } from '../config/supabase';
import type { Attachment, ServiceResult } from '../types';

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
