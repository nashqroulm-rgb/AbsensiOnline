import { supabase } from '../config/supabase';
import type { MonthlyReport, WeeklyData, ActivityFeed, ServiceResult } from '../types';
import { wibMonthRange, wibToday } from '../utils/wib';

/** FIXPLAN T3/U1 — laporan per bulan kalender WIB + filter zona opsional. */
export async function getMonthlyReport(
  year?: number,
  month1to12?: number,
  zonaId?: string,
): Promise<ServiceResult<MonthlyReport[]>> {
  const now = new Date();
  const y = year ?? now.getFullYear();
  const m = month1to12 ?? now.getMonth() + 1;
  const { start, end } = wibMonthRange(y, m);

  let query = supabase
    .from('attendances')
    .select('user_id, user_nama, zona_id, status, checkin_at')
    .gte('checkin_at', start)
    .lt('checkin_at', end);
  if (zonaId) query = query.eq('zona_id', zonaId);

  const { data: attendances, error: attError } = await query;

  if (attError) return { success: false, error: attError.message, code: attError.code };

  const { data: zones } = await supabase.from('zones').select('id, nama');
  const zoneMap = new Map((zones || []).map(z => [z.id, z.nama]));

  const grouped = new Map<string, { nama: string; zona: string; hadir: number; terlambat: number; izin: number; absen: number; libur: number; total: number }>();

  for (const att of attendances || []) {
    const existing = grouped.get(att.user_id);
    const zoneName = zoneMap.get(att.zona_id) || '—';
    if (existing) {
      existing.total++;
      if (att.status === 'hadir') existing.hadir++;
      else if (att.status === 'terlambat') existing.terlambat++;
      else if (att.status === 'izin') existing.izin++;
      else if (att.status === 'absen') existing.absen++;
      else if (att.status === 'libur') existing.libur++;
    } else {
      grouped.set(att.user_id, {
        nama: att.user_nama,
        zona: zoneName,
        hadir: att.status === 'hadir' ? 1 : 0,
        terlambat: att.status === 'terlambat' ? 1 : 0,
        izin: att.status === 'izin' ? 1 : 0,
        absen: att.status === 'absen' ? 1 : 0,
        libur: att.status === 'libur' ? 1 : 0,
        total: 1,
      });
    }
  }

  const report: MonthlyReport[] = Array.from(grouped.entries()).map(([user_id, g]) => ({
    user_id,
    nama: g.nama,
    zona: g.zona,
    hadir: g.hadir,
    terlambat: g.terlambat,
    izin: g.izin,
    absen: g.absen,
    libur: g.libur,
    total_hari_kerja: g.total,
    persentase_kehadiran: g.total > 0 ? Math.round(((g.hadir + g.terlambat) / g.total) * 1000) / 10 : 0,
  }));

  return { success: true, data: report };
}

export async function getWeeklyData(): Promise<ServiceResult<WeeklyData[]>> {
  // FIXPLAN U1: minggu dimulai Senin WIB
  const startOfWeek = new Date(Date.parse(`${wibToday()}T00:00:00+07:00`));
  const dow = (startOfWeek.getUTCDay() + 6) % 7; // 0=Senin
  startOfWeek.setUTCDate(startOfWeek.getUTCDate() - dow);

  const { data: attendances, error } = await supabase
    .from('attendances')
    .select('status, checkin_at')
    .gte('checkin_at', startOfWeek.toISOString());

  if (error) return { success: false, error: error.message, code: error.code };

  const dayNames = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
  const weekData: WeeklyData[] = dayNames.map(hari => ({ hari, hadir: 0, terlambat: 0, absen: 0 }));

  for (const att of attendances || []) {
    if (!att.checkin_at) continue;
    const d = new Date(att.checkin_at);
    const idx = d.getDay();
    if (att.status === 'hadir') weekData[idx].hadir++;
    else if (att.status === 'terlambat') weekData[idx].terlambat++;
    else if (att.status === 'absen') weekData[idx].absen++;
  }

  return { success: true, data: weekData };
}

export async function getActivityFeed(): Promise<ServiceResult<ActivityFeed[]>> {
  const { data, error } = await supabase
    .from('attendances')
    .select('id, user_nama, status, checkin_at, zona_id')
    .not('checkin_at', 'is', null)
    .order('checkin_at', { ascending: false })
    .limit(20);

  if (error) return { success: false, error: error.message, code: error.code };

  const { data: zones } = await supabase.from('zones').select('id, nama');
  const zoneMap = new Map((zones || []).map(z => [z.id, z.nama]));

  const feed: ActivityFeed[] = (data || []).map(att => {
    let event: ActivityFeed['event'] = 'checkin';
    let keterangan: string | undefined;

    if (att.status === 'terlambat') {
      event = 'terlambat';
      keterangan = 'Terlambat';
    }

    return {
      id: att.id,
      user_nama: att.user_nama,
      event,
      waktu: att.checkin_at || '',
      zona: zoneMap.get(att.zona_id) || '—',
      keterangan,
    };
  });

  return { success: true, data: feed };
}
