/** Alias untuk ID — di database gunakan UUID, di TypeScript tetap string. */
export type UUID = string;

export type Role = 'worker' | 'admin' | 'super_admin';
export type AttendanceStatus = 'hadir' | 'terlambat' | 'absen' | 'izin' | 'libur' | 'sakit' | 'cuti';
export type ShiftStatus = 'aktif' | 'nonaktif';
export type UserStatus = 'aktif' | 'nonaktif';
export type VerificationStatus = 'terverifikasi' | 'menunggu' | 'ditolak';

export interface Zone {
  id: string;
  nama: string;
  deskripsi: string;
  latitude: number;
  longitude: number;
  radius_meter: number;
  status: ShiftStatus;
  color?: string;
}

export interface Shift {
  id: string;
  nama: string;
  jam_mulai: string;
  jam_selesai: string;
  toleransi_menit: number;
  status: ShiftStatus;
  ikon: string;
  hari_kerja: string[];
}

export interface User {
  id: string;
  nama: string;
  no_hp: string;
  jabatan: string;
  role: Role;
  zona_id: string;
  shift_id: string;
  status: UserStatus;
  tipe: 'tetap' | 'kontrak' | 'harian';
  gender: 'pria' | 'wanita';
  foto?: string;
  bergabung_sejak: string;
  absensi_online: boolean;
}

export interface Attachment {
  id: string;
  attendance_id: string;
  user_id: string;
  tipe: 'foto' | 'dokumen';
  url: string;
  nama_file: string;
  ukuran_bytes: number;
  status_verifikasi: VerificationStatus;
  created_at: string;
}

export interface Attendance {
  id: string;
  user_id: string;
  user_nama: string;
  shift_id: string;
  zona_id: string;
  checkin_at: string | null;
  checkout_at: string | null;
  durasi_menit: number | null;
  status: AttendanceStatus;
  client_timestamp: string | null;
  synced_at: string | null;
  latitude_in?: number;
  longitude_in?: number;
  accuracy_in?: number | null;
  latitude_out?: number;
  longitude_out?: number;
  accuracy_out?: number | null;
  spoof_risk?: 'belum_dinilai' | 'rendah' | 'sedang' | 'tinggi';
  spoof_reasons?: string[] | null;
  lampiran_count: number;
  catatan?: string;
}

export interface DashboardStats {
  total_pekerja: number;
  hadir: number;
  terlambat: number;
  tidak_hadir: number;
  persentase_hadir: number;
  persentase_terlambat: number;
  persentase_absen: number;
}

export interface ActivityFeed {
  id: string;
  user_nama: string;
  user_foto?: string;
  event: 'checkin' | 'checkout' | 'upload' | 'terlambat';
  waktu: string;
  zona: string;
  keterangan?: string;
}

export interface WeeklyData {
  hari: string;
  hadir: number;
  terlambat: number;
  absen: number;
}

export interface MonthlyReport {
  user_id: string;
  nama: string;
  zona: string;
  hadir: number;
  terlambat: number;
  izin: number;
  absen: number;
  libur: number;
  total_hari_kerja: number;
  persentase_kehadiran: number;
}

/** Standard return type untuk semua service methods. */
export type ServiceResult<T> =
  | { success: true; data: T }
  | { success: false; error: string; code?: string };

/** History record untuk riwayat absensi worker. */
export interface HistoryRecord {
  id: string;
  user_id: string;
  shift_id: string;
  shift_nama: string;
  date: string;
  checkin_at: string | null;
  checkout_at: string | null;
  durasi_menit: number | null;
  status: AttendanceStatus;
  lampiran_count: number;
}

/** FIXPLAN T7 — pengaturan aplikasi (singleton app_settings, migrasi 009). */
export interface AppSettings {
  id: number;
  company_name: string;
  timezone: string;
  default_zone_radius_m: number;
  default_shift_tolerance_min: number;
  max_file_size_mb: number;
  max_attachments_per_day: number;
  max_photos_per_day: number;
  max_docs_per_day: number;
  gps_timeout_ms: number;
  updated_at?: string;
}

export const DEFAULT_APP_SETTINGS: AppSettings = {
  id: 1,
  company_name: 'AbsensiOnline',
  timezone: 'Asia/Jakarta',
  default_zone_radius_m: 150,
  default_shift_tolerance_min: 15,
  max_file_size_mb: 5,
  max_attachments_per_day: 10,
  max_photos_per_day: 5,
  max_docs_per_day: 5,
  gps_timeout_ms: 10000,
};
