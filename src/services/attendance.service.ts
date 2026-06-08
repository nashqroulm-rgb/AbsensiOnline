import { supabase } from '../config/supabase';
import type { Attendance, AttendanceStatus, HistoryRecord, ServiceResult } from '../types';

export interface CheckInPayload {
  workerId: string;
  zoneId: string;
  shiftId?: string;
  workerName?: string;
  lat: number;
  lng: number;
  timestamp: string;
}

export async function getAttendances(): Promise<ServiceResult<Attendance[]>> {
  const { data, error } = await supabase
    .from('attendances')
    .select('*')
    .order('checkin_at', { ascending: false });
  if (error) return { success: false, error: error.message, code: error.code };
  return { success: true, data: data as Attendance[] };
}

export async function submitCheckIn(
  payload: CheckInPayload,
): Promise<ServiceResult<{ attendanceId: string }>> {
  const attendanceId = crypto.randomUUID();

  const { data: shift } = await supabase
    .from('shifts')
    .select('jam_mulai, toleransi_menit')
    .eq('id', payload.shiftId || '')
    .single();

  let status: AttendanceStatus = 'hadir';
  if (shift) {
    const date = payload.timestamp.split('T')[0];
    const [sh, sm] = shift.jam_mulai.split(':').map(Number);
    const checkin = new Date(payload.timestamp);
    const scheduled = new Date(`${date}T${String(sh).padStart(2, '0')}:${String(sm).padStart(2, '0')}:00`);
    const diffMin = (checkin.getTime() - scheduled.getTime()) / 60000;
    if (diffMin > shift.toleransi_menit) status = 'terlambat';
  }

  const { error } = await supabase.from('attendances').insert({
    id: attendanceId,
    user_id: payload.workerId,
    user_nama: payload.workerName || payload.workerId,
    shift_id: payload.shiftId || '',
    zona_id: payload.zoneId,
    checkin_at: payload.timestamp,
    status,
    client_timestamp: payload.timestamp,
    latitude_in: payload.lat,
    longitude_in: payload.lng,
    lampiran_count: 0,
  });

  if (error) return { success: false, error: error.message, code: error.code };
  return { success: true, data: { attendanceId } };
}

export async function submitCheckOut(
  attendanceId: string,
  payload: { lat: number; lng: number; timestamp: string },
): Promise<ServiceResult<void>> {
  const { data: existing, error: fetchError } = await supabase
    .from('attendances')
    .select('checkin_at')
    .eq('id', attendanceId)
    .single();

  if (fetchError || !existing) return { success: false, error: 'Data check-in tidak ditemukan.' };

  const durasi_menit = Math.round(
    (new Date(payload.timestamp).getTime() - new Date(existing.checkin_at!).getTime()) / 60000,
  );

  const { error } = await supabase
    .from('attendances')
    .update({
      checkout_at: payload.timestamp,
      durasi_menit,
      synced_at: payload.timestamp,
      latitude_out: payload.lat,
      longitude_out: payload.lng,
    })
    .eq('id', attendanceId);

  if (error) return { success: false, error: error.message, code: error.code };
  return { success: true, data: undefined };
}

export async function getTodayAttendance(workerId: string): Promise<ServiceResult<{
  id: string;
  timestamp: string;
  checkOutAt: string | null;
} | null>> {
  const today = new Date().toISOString().split('T')[0];

  const { data, error } = await supabase
    .from('attendances')
    .select('id, checkin_at, checkout_at')
    .eq('user_id', workerId)
    .gte('checkin_at', `${today}T00:00:00`)
    .lte('checkin_at', `${today}T23:59:59`)
    .order('checkin_at', { ascending: false })
    .limit(1)
    .single();

  if (error && error.code !== 'PGRST116') {
    return { success: false, error: error.message, code: error.code };
  }

  if (!data || !data.checkin_at) {
    return { success: true, data: null };
  }

  return {
    success: true,
    data: {
      id: data.id,
      timestamp: data.checkin_at,
      checkOutAt: data.checkout_at,
    },
  };
}

function getStatusLabel(status: AttendanceStatus): string {
  const map: Record<AttendanceStatus, string> = {
    hadir: 'Hadir', terlambat: 'Terlambat', absen: 'Absen',
    izin: 'Izin', libur: 'Libur', sakit: 'Sakit', cuti: 'Cuti',
  };
  return map[status] || status;
}

function getStatusColor(status: AttendanceStatus): string {
  const map: Record<AttendanceStatus, string> = {
    hadir: '#16A34A', terlambat: '#D97706', absen: '#DC2626',
    izin: '#2563EB', libur: '#6B7280', sakit: '#7C3AED', cuti: '#0891B2',
  };
  return map[status] || '#6B7280';
}

export { getStatusLabel, getStatusColor };

export async function getHistory(userId: string): Promise<ServiceResult<HistoryRecord[]>> {
  const { data: attendances, error: attError } = await supabase
    .from('attendances')
    .select('id, user_id, shift_id, checkin_at, checkout_at, durasi_menit, status, lampiran_count')
    .eq('user_id', userId)
    .order('checkin_at', { ascending: false });

  if (attError) return { success: false, error: attError.message, code: attError.code };

  const { data: shifts } = await supabase.from('shifts').select('id, nama');

  const shiftMap = new Map((shifts || []).map(s => [s.id, s.nama]));

  const records: HistoryRecord[] = (attendances || []).map(att => ({
    id: att.id,
    user_id: att.user_id,
    shift_id: att.shift_id,
    shift_nama: shiftMap.get(att.shift_id) || 'Shift',
    date: att.checkin_at?.split('T')[0] || '',
    checkin_at: att.checkin_at,
    checkout_at: att.checkout_at,
    durasi_menit: att.durasi_menit,
    status: att.status as AttendanceStatus,
    lampiran_count: att.lampiran_count,
  }));

  return { success: true, data: records };
}

/** @deprecated Use submitCheckIn */
export const checkIn = submitCheckIn;

/** @deprecated Use submitCheckOut */
export const checkOut = submitCheckOut;

export async function getStatusLabelAsync(status: AttendanceStatus): Promise<string> {
  return getStatusLabel(status);
}
