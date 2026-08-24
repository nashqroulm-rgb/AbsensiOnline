import { supabase } from '../config/supabase';
import type { Attendance, AttendanceStatus, HistoryRecord, ServiceResult } from '../types';
import { wibDateOf, wibDayRange, wibToday } from '../utils/wib';

export interface CheckInPayload {
  workerId: string;
  zoneId: string;
  shiftId?: string;
  workerName?: string;
  lat: number;
  lng: number;
  timestamp: string;
  /** ANTI_SPOOF A1: akurasi GPS (meter) dari device */
  accuracy?: number;
  /** ANTI_SPOOF B1 */
  selfie_url?: string;
  selfie_status?: 'menunggu' | 'tidak_ada';
}

export async function getAttendances(since?: string): Promise<ServiceResult<Attendance[]>> {
  // FIXPLAN U7: `since` opsional — dashboard hanya tarik hari-WIB ini
  let query = supabase.from('attendances').select('*');
  if (since) query = query.gte('checkin_at', since);
  const { data, error } = await query.order('checkin_at', { ascending: false });
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
    // FIXPLAN U1: tanggal jadwal dihitung di kalender WIB (bukan UTC)
    const date = wibDateOf(payload.timestamp);
    const [sh, sm] = shift.jam_mulai.split(':').map(Number);
    const checkin = new Date(payload.timestamp);
    const scheduled = new Date(`${date}T${String(sh).padStart(2, '0')}:${String(sm).padStart(2, '0')}:00+07:00`);
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
    accuracy_in: payload.accuracy,
    selfie_url: payload.selfie_url ?? null,
    selfie_status: payload.selfie_status ?? 'tidak_ada',
    lampiran_count: 0,
  });

  if (error) return { success: false, error: error.message, code: error.code };
  return { success: true, data: { attendanceId } };
}

export async function submitCheckOut(
  attendanceId: string,
  payload: { lat: number; lng: number; timestamp: string; accuracy?: number },
): Promise<ServiceResult<void>> {
  const { data: existing, error: fetchError } = await supabase
    .from('attendances')
    .select('checkin_at')
    .eq('id', attendanceId)
    .single();

  if (fetchError || !existing) return { success: false, error: 'Data check-in tidak ditemukan.' };
  if (!existing.checkin_at) return { success: false, error: 'Waktu check-in tidak valid.' };

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
      accuracy_out: payload.accuracy,
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
  // FIXPLAN U1: boundary "hari ini" memakai kalender WIB
  const { start, end } = wibDayRange(wibToday());

  const { data, error } = await supabase
    .from('attendances')
    .select('id, checkin_at, checkout_at')
    .eq('user_id', workerId)
    .gte('checkin_at', start)
    .lt('checkin_at', end)
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

/** FIXPLAN T1 — override status oleh admin (audit diisi trigger DB). */
export async function updateAttendanceStatus(
  id: string,
  status: AttendanceStatus,
  catatan?: string,
): Promise<ServiceResult<void>> {
  const { error } = await supabase
    .from('attendances')
    .update({ status, ...(catatan !== undefined ? { catatan } : {}) })
    .eq('id', id);
  if (error) return { success: false, error: error.message, code: error.code };
  return { success: true, data: undefined };
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
