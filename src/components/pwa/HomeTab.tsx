import { useState, useEffect, useRef } from 'react';
import { MapPin, CheckCircle, AlertCircle, Camera, FileText, X, Clock, Upload, WifiOff } from 'lucide-react';
import imageCompression from 'browser-image-compression';
import { useAuth } from '../../context/AuthContext';
import { submitCheckIn, submitCheckOut, getTodayAttendance } from '../../services/attendance.service';
import { getWorkerById } from '../../services/workers.service';
import { getZones } from '../../services/zones.service';
import { getShifts } from '../../services/shifts.service';
import { createAttachment, incrementLampiranCount } from '../../services/attachments.service';
import { uploadToCloudinary } from '../../utils/cloudinary';
import type { Attachment, User, Zone, Shift } from '../../types';
import GeofenceMap from './GeofenceMap';
import Badge from '../ui/Badge';

type CheckState = 'not_checked_in' | 'checked_in' | 'checked_out';

function haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export default function HomeTab() {
  const { currentUser } = useAuth();
  const [worker, setWorker] = useState<User | null>(currentUser);
  const [zone, setZone] = useState<Zone | null>(null);
  const [shift, setShift] = useState<Shift | null>(null);

  useEffect(() => {
    if (!currentUser?.id) return;
    const load = async () => {
      const workerResult = await getWorkerById(currentUser.id);
      if (workerResult.success) {
        setWorker(workerResult.data);
        const [zonesResult, shiftsResult] = await Promise.all([
          getZones(),
          getShifts(),
        ]);
        if (zonesResult.success) {
          setZone(zonesResult.data.find(z => z.id === workerResult.data.zona_id) || null);
        }
        if (shiftsResult.success) {
          setShift(shiftsResult.data.find(s => s.id === workerResult.data.shift_id) || null);
        }
      }
    };
    load();
  }, [currentUser?.id]);

  const [checkState, setCheckState] = useState<CheckState>('not_checked_in');
  const [activeAttendanceId, setActiveAttendanceId] = useState<string | null>(null);
  const [checkinTime, setCheckinTime] = useState<Date | null>(null);
  const [checkoutTime, setCheckoutTime] = useState<Date | null>(null);
  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [elapsed, setElapsed] = useState('');
  const [now, setNow] = useState(new Date());
  const [gpsStatus, setGpsStatus] = useState<'idle' | 'loading' | 'success' | 'error' | 'out-of-range'>('idle');
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [checkInAllowed, setCheckInAllowed] = useState(false);
  const [userPos, setUserPos] = useState<{ lat: number; lng: number; accuracy: number } | null>(null);
  const [distance, setDistance] = useState<number | null>(null);
  const [inRange, setInRange] = useState(false);
  const [loading, setLoading] = useState(false);
  const [pendingSync, setPendingSync] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => { window.removeEventListener('online', handleOnline); window.removeEventListener('offline', handleOffline); };
  }, []);

  useEffect(() => {
    if (isOnline && pendingSync) {
      setTimeout(() => { setPendingSync(false); }, 2000);
    }
  }, [isOnline, pendingSync]);

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (!checkinTime) return;
    const update = () => {
      const diff = checkoutTime ? checkoutTime.getTime() - checkinTime.getTime() : Date.now() - checkinTime.getTime();
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      setElapsed(`${h}j ${m}m`);
    };
    update();
    const t = setInterval(update, 60000);
    return () => clearInterval(t);
  }, [checkinTime, checkoutTime]);

  const blockCheckIn = (message: string) => {
    setGpsError(message);
    setInRange(false);
    setCheckInAllowed(false);
    setUserPos(null);
    setDistance(null);
  };

  const requestGPS = () => {
    if (!zone) return;
    setGpsStatus('loading');
    setGpsError(null);
    setCheckInAllowed(false);

    if (!navigator.geolocation) {
      setGpsStatus('error');
      blockCheckIn('Perangkat tidak mendukung GPS. Check-in diblokir.');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude, accuracy } = pos.coords;
        setUserPos({ lat: latitude, lng: longitude, accuracy: Math.round(accuracy) });
        const d = haversine(latitude, longitude, zone.latitude, zone.longitude);
        const rounded = Math.round(d);
        setDistance(rounded);
        const within = d <= zone.radius_meter;
        setInRange(within);

        if (within) {
          setGpsStatus('success');
          setGpsError(null);
          setCheckInAllowed(true);
        } else {
          setGpsStatus('out-of-range');
          setGpsError(
            `Anda berada ${rounded}m dari pusat zona (maks. ${zone.radius_meter}m). Check-in diblokir.`,
          );
          setCheckInAllowed(false);
        }
      },
      (err) => {
        setGpsStatus('error');
        if (err.code === 1) {
          blockCheckIn('Izin GPS ditolak. Aktifkan lokasi di pengaturan HP. Check-in diblokir.');
        } else if (err.code === 3) {
          blockCheckIn('Waktu habis saat mendeteksi lokasi. Check-in diblokir.');
        } else {
          blockCheckIn('Lokasi tidak dapat dideteksi. Check-in diblokir.');
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
    );
  };

  useEffect(() => {
    if (zone) requestGPS();
  }, [zone?.id]);

  useEffect(() => {
    if (!currentUser?.id) return;
    getTodayAttendance(currentUser.id).then((result) => {
      if (!result.success || !result.data) return;
      const record = result.data;
      setActiveAttendanceId(record.id);
      setCheckinTime(new Date(record.timestamp));
      if (record.checkOutAt) {
        setCheckoutTime(new Date(record.checkOutAt));
        setCheckState('checked_out');
        setActionMessage({
          type: 'success',
          text: `Check-out tercatat pukul ${new Date(record.checkOutAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}.`,
        });
      } else {
        setCheckState('checked_in');
        setActionMessage({
          type: 'success',
          text: `Sudah check-in hari ini pukul ${new Date(record.timestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}.`,
        });
      }
    });
  }, [currentUser?.id]);

  const formatTime = (d: Date) => d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

  const resolvePosition = (): Promise<{ lat: number; lng: number }> => {
    if (userPos) return Promise.resolve({ lat: userPos.lat, lng: userPos.lng });
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('GPS tidak tersedia'));
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        reject,
        { enableHighAccuracy: true, timeout: 10000 },
      );
    });
  };

  const handleCheckin = async () => {
    if (!checkInAllowed || !userPos || !worker || !zone) return;
    setLoading(true);
    setActionMessage(null);
    try {
      const timestamp = new Date().toISOString();
      const result = await submitCheckIn({
        workerId: worker.id,
        zoneId: zone.id,
        shiftId: worker.shift_id,
        workerName: worker.nama,
        lat: userPos.lat,
        lng: userPos.lng,
        timestamp,
      });
      if (!result.success) {
        setActionMessage({ type: 'error', text: 'Check-in gagal disimpan. Coba lagi.' });
        return;
      }
      const checkinDate = new Date(timestamp);
      setActiveAttendanceId(result.data.attendanceId);
      setCheckinTime(checkinDate);
      setCheckState('checked_in');
      setActionMessage({
        type: 'success',
        text: `Check-in berhasil pukul ${formatTime(checkinDate)}. Data tersimpan${!isOnline ? ' secara lokal' : ''}.`,
      });
      if (!isOnline) setPendingSync(true);
    } catch {
      setActionMessage({ type: 'error', text: 'Check-in gagal disimpan. Coba lagi.' });
    } finally {
      setLoading(false);
    }
  };

  const handleCheckout = async () => {
    if (!activeAttendanceId) {
      setActionMessage({ type: 'error', text: 'Data check-in tidak ditemukan.' });
      return;
    }
    setLoading(true);
    setActionMessage(null);
    try {
      const pos = await resolvePosition();
      const timestamp = new Date().toISOString();
      const result = await submitCheckOut(activeAttendanceId, {
        lat: pos.lat,
        lng: pos.lng,
        timestamp,
      });
      if (!result.success) {
        setActionMessage({ type: 'error', text: 'Check-out gagal disimpan. Coba lagi.' });
        return;
      }
      const checkoutDate = new Date(timestamp);
      setCheckoutTime(checkoutDate);
      setCheckState('checked_out');
      setActionMessage({
        type: 'success',
        text: `Check-out berhasil pukul ${formatTime(checkoutDate)}.`,
      });
      if (!isOnline) setPendingSync(true);
    } catch {
      setActionMessage({
        type: 'error',
        text: 'Lokasi tidak dapat dideteksi. Check-out membutuhkan GPS.',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (file: File, type: 'foto' | 'dokumen') => {
    const MAX_FILE_SIZE = 5 * 1024 * 1024;
    const MAX_FILES_PER_DAY = 10;
    const MAX_PHOTOS_PER_DAY = 5;
    const MAX_DOCS_PER_DAY = 5;

    if (file.size > MAX_FILE_SIZE) {
      alert(`Ukuran file maksimal 5MB (${type === 'foto' ? 'foto' : 'dokumen'})`);
      return;
    }
    if (attachments.length >= MAX_FILES_PER_DAY) {
      alert(`Batas ${MAX_FILES_PER_DAY} file per hari tercapai`);
      return;
    }
    const sameTypeCount = attachments.filter(a => a.tipe === type).length;
    const maxForType = type === 'foto' ? MAX_PHOTOS_PER_DAY : MAX_DOCS_PER_DAY;
    if (sameTypeCount >= maxForType) {
      alert(`Batas ${maxForType} ${type} per hari tercapai`);
      return;
    }
    if (!isOnline) { alert('Upload tersedia saat online'); return; }

    let uploadFile = file;
    if (type === 'foto') {
      try {
        setUploadProgress(0);
        uploadFile = await imageCompression(file, {
          maxSizeMB: 0.5,
          maxWidthOrHeight: 1920,
          useWebWorker: true,
          onProgress: (p) => setUploadProgress(Math.round(p * 0.5)),
        });
      } catch {
        alert('Gagal kompres foto. Upload file asli.');
        uploadFile = file;
      }
    }

    const folder = `${currentUser?.id || 'unknown'}/${activeAttendanceId || 'pending'}`;
    const result = await uploadToCloudinary(uploadFile, folder, (p) =>
      setUploadProgress(type === 'foto' ? 50 + Math.round(p * 0.5) : p),
    );
    if (!result.success) {
      alert(result.error);
      setUploadProgress(null);
      return;
    }

    if (activeAttendanceId) {
      const dbResult = await createAttachment({
        attendance_id: activeAttendanceId,
        user_id: currentUser?.id || '',
        tipe: type,
        url: result.data.secure_url,
        nama_file: file.name,
        ukuran_bytes: uploadFile.size,
        status_verifikasi: 'menunggu',
      });
      if (dbResult.success) {
        await incrementLampiranCount(activeAttendanceId);
        setAttachments(prev => [...prev, dbResult.data]);
      } else {
        alert('File berhasil diupload tapi gagal disimpan ke database.');
      }
    } else {
      const att: Attachment = {
        id: `att_${Date.now()}`,
        attendance_id: 'current',
        user_id: currentUser?.id || '',
        tipe: type,
        url: result.data.secure_url,
        nama_file: file.name,
        ukuran_bytes: uploadFile.size,
        status_verifikasi: 'menunggu',
        created_at: new Date().toISOString(),
      };
      setAttachments(prev => [...prev, att]);
    }
    setUploadProgress(null);
  };

  const removeAttachment = (id: string) => {
    setAttachments(prev => {
      const att = prev.find(a => a.id === id);
      if (att && att.url.startsWith('blob:')) {
        URL.revokeObjectURL(att.url);
      }
      return prev.filter(a => a.id !== id);
    });
  };

  const dateStr = now.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const shiftActive = shift ? (() => {
    const [sh, sm] = shift.jam_mulai.split(':').map(Number);
    const [eh, em] = shift.jam_selesai.split(':').map(Number);
    const nowMin = now.getHours() * 60 + now.getMinutes();
    const startMin = sh * 60 + sm;
    const endMin = eh * 60 + em;
    return nowMin >= startMin && nowMin <= endMin;
  })() : false;

  const fmtBytes = (b: number) => b > 1024 * 1024 ? `${(b / 1024 / 1024).toFixed(1)}MB` : `${Math.round(b / 1024)}KB`;

  return (
    <div className="min-h-screen" style={{ background: '#F3F4F6' }}>
      {/* Dark Topbar */}
      <div className="sticky top-0 z-20" style={{ background: '#111827' }}>
        <div className="px-4 pt-4 pb-3">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-gray-400 text-xs">Selamat datang,</p>
              <p className="text-white font-semibold text-base leading-tight">{currentUser?.nama}</p>
              <p className="text-gray-400 text-xs mt-0.5">{dateStr}</p>
            </div>
            <div className="flex items-center gap-2">
              {!isOnline && (
                <div className="flex items-center gap-1 bg-amber-500/20 text-amber-400 px-2 py-1 rounded-full text-xs">
                  <WifiOff size={10} /> Offline
                </div>
              )}
              <div className={`px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-1.5 ${
                checkState === 'not_checked_in' ? 'bg-gray-700 text-gray-300' :
                checkState === 'checked_in' ? 'bg-green-600/30 text-green-400' : 'bg-gray-700 text-gray-300'
              }`}>
                {checkState === 'not_checked_in' && <><span className="w-1.5 h-1.5 rounded-full bg-gray-400" /> Belum Check-In</>}
                {checkState === 'checked_in' && <><span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" /> Sudah check-in hari ini · {checkinTime && formatTime(checkinTime)}</>}
                {checkState === 'checked_out' && <><span className="w-1.5 h-1.5 rounded-full bg-gray-400" /> Selesai · {checkoutTime && formatTime(checkoutTime)}</>}
              </div>
            </div>
          </div>
          {checkState === 'checked_in' && elapsed && (
            <div className="mt-2 text-gray-400 text-xs flex items-center gap-1">
              <Clock size={11} /> {elapsed} berlalu
            </div>
          )}
        </div>

        {/* Pending Sync Banner */}
        {pendingSync && (
          <div className="mx-4 mb-3 bg-amber-500/20 border border-amber-500/30 rounded-lg px-3 py-2 flex items-center gap-2">
            <div className="w-2 h-2 bg-amber-400 rounded-full animate-pulse" />
            <span className="text-amber-300 text-xs font-medium">
              {isOnline ? 'Menyinkronkan data...' : 'Menunggu Sync · Data tersimpan lokal'}
            </span>
          </div>
        )}
      </div>

      <div className="p-4 space-y-3">
        {/* Location & Check-in Card */}
        <div className="bg-white rounded-xl overflow-hidden shadow-sm border border-black/[0.06]">
          <div className="p-4 pb-3 border-b border-gray-50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 bg-green-50 rounded-lg flex items-center justify-center">
                  <MapPin size={14} className="text-green-600" />
                </div>
                <span className="text-sm font-semibold text-gray-900">Lokasi & Check-In</span>
              </div>
              {gpsStatus === 'loading' && (
                <span className="text-xs text-gray-400">Mendeteksi GPS…</span>
              )}
              {(gpsStatus === 'success' || gpsStatus === 'out-of-range') && userPos && (
                <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                  gpsStatus === 'success' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                }`}>
                  {gpsStatus === 'success' ? <CheckCircle size={11} /> : <AlertCircle size={11} />}
                  {gpsStatus === 'success' ? 'In-Range ✓' : 'Out-of-Range ⚠'}
                </div>
              )}
              {gpsStatus === 'error' && (
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">
                  <AlertCircle size={11} /> GPS Error
                </div>
              )}
            </div>
          </div>

          <div className="p-4 space-y-3">
            {zone && (
              <GeofenceMap
                centerLat={zone.latitude}
                centerLng={zone.longitude}
                radius={zone.radius_meter}
                userLat={userPos?.lat}
                userLng={userPos?.lng}
                inRange={inRange}
              />
            )}

            <div className="flex items-center justify-between text-sm">
              <div>
                <p className="text-xs text-gray-500">Zona Aktif</p>
                <p className="font-medium text-gray-900 text-sm">{zone?.nama || '—'}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-500">Akurasi GPS</p>
                <div className="flex items-center gap-1 justify-end">
                  {gpsStatus === 'loading' ? (
                    <div className="w-3 h-3 border border-gray-300 border-t-green-500 rounded-full animate-spin" />
                  ) : gpsStatus === 'success' || gpsStatus === 'out-of-range' ? (
                    <p className="font-medium text-gray-900">{userPos?.accuracy}m</p>
                  ) : (
                    <p className="text-gray-400 text-xs">—</p>
                  )}
                </div>
              </div>
            </div>

            {(gpsStatus === 'success' || gpsStatus === 'out-of-range') && distance !== null && (
              <div className="bg-gray-50 rounded-lg px-3 py-2 text-xs flex items-center justify-between">
                <span className="text-gray-500">Jarak ke zona</span>
                <span className={`font-semibold ${inRange ? 'text-green-600' : 'text-amber-600'}`}>{distance}m</span>
              </div>
            )}

            {actionMessage && (
              <div className={`rounded-lg p-3 flex items-start gap-2 border ${
                actionMessage.type === 'success'
                  ? 'bg-green-50 border-green-200'
                  : 'bg-red-50 border-red-200'
              }`}>
                {actionMessage.type === 'success' ? (
                  <CheckCircle size={16} className="text-green-600 flex-shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle size={16} className="text-red-500 flex-shrink-0 mt-0.5" />
                )}
                <p className={`text-xs ${actionMessage.type === 'success' ? 'text-green-800' : 'text-red-700'}`}>
                  {actionMessage.text}
                </p>
              </div>
            )}

            {gpsError && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
                <AlertCircle size={16} className="text-red-500 flex-shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-red-800">Check-in tidak tersedia</p>
                  <p className="text-xs text-red-700 mt-0.5">{gpsError}</p>
                </div>
              </div>
            )}

            {(gpsStatus === 'error' || gpsStatus === 'out-of-range') && zone && (
              <button
                type="button"
                onClick={requestGPS}
                className="w-full py-2 text-xs font-medium text-green-700 bg-green-50 hover:bg-green-100 border border-green-200 rounded-lg transition-colors"
              >
                Coba deteksi ulang GPS
              </button>
            )}

            {/* Check-in/out buttons */}
            {checkState === 'not_checked_in' && (
              <button
                onClick={handleCheckin}
                disabled={loading || !checkInAllowed}
                className={`w-full h-12 font-semibold rounded-lg transition-colors flex items-center justify-center gap-2 shadow-sm ${
                  checkInAllowed
                    ? 'bg-green-600 hover:bg-green-700 text-white'
                    : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                } disabled:opacity-100`}
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : gpsStatus === 'loading' ? (
                  'Mendeteksi lokasi…'
                ) : checkInAllowed ? (
                  '✓ Check-In Sekarang'
                ) : gpsStatus === 'out-of-range' ? (
                  '⚠ Di luar area kerja'
                ) : gpsStatus === 'error' ? (
                  '⚠ GPS tidak tersedia'
                ) : (
                  'Menunggu GPS…'
                )}
              </button>
            )}
            {checkState === 'checked_in' && (
              <div className="space-y-2">
                <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-center">
                  <p className="text-xs text-green-600 font-medium">Durasi Kerja</p>
                  <p className="text-xl font-bold text-green-700">{elapsed}</p>
                  <p className="text-xs text-gray-500">Check-in {checkinTime && formatTime(checkinTime)}</p>
                </div>
                <button
                  onClick={handleCheckout}
                  disabled={loading}
                  className="w-full h-12 bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2 shadow-sm"
                >
                  {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : '✗ Check-Out Sekarang'}
                </button>
              </div>
            )}
            {checkState === 'checked_out' && (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-center">
                <p className="text-xs text-gray-500">Selesai bekerja</p>
                <p className="font-bold text-gray-800">Total: {elapsed}</p>
                <p className="text-xs text-gray-400">{checkinTime && formatTime(checkinTime)} → {checkoutTime && formatTime(checkoutTime)}</p>
              </div>
            )}
          </div>
        </div>

        {/* Shift Card */}
        {shift && (
          <div className="bg-white rounded-xl p-4 shadow-sm border border-black/[0.06]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center text-xl">{shift.ikon}</div>
                <div>
                  <p className="font-semibold text-gray-900 text-sm">{shift.nama}</p>
                  <p className="text-gray-500 text-xs">{shift.jam_mulai} – {shift.jam_selesai} · Toleransi {shift.toleransi_menit} menit</p>
                </div>
              </div>
              <Badge variant={shiftActive ? 'green' : 'gray'} dot>
                {shiftActive ? 'Aktif' : 'Selesai'}
              </Badge>
            </div>
          </div>
        )}

        {/* Attachment Card */}
        <div className="bg-white rounded-xl overflow-hidden shadow-sm border border-black/[0.06]">
          <div className="p-4 border-b border-gray-50 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 bg-blue-50 rounded-lg flex items-center justify-center">
                <FileText size={14} className="text-blue-600" />
              </div>
              <span className="text-sm font-semibold text-gray-900">Lampiran</span>
            </div>
            <span className="text-xs text-gray-400">{attachments.length}/10 file</span>
          </div>

          <div className="p-4 space-y-3">
            {!isOnline && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-2.5 text-xs text-amber-700 flex items-center gap-2">
                <WifiOff size={12} /> Upload tersedia saat online
              </div>
            )}
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => isOnline && photoInputRef.current?.click()}
                disabled={!isOnline || attachments.length >= 10}
                className="flex items-center justify-center gap-2 h-10 bg-green-50 hover:bg-green-100 disabled:opacity-40 border border-green-200 text-green-700 rounded-lg text-xs font-medium transition-colors"
              >
                <Camera size={14} /> Ambil Foto
              </button>
              <button
                onClick={() => isOnline && fileInputRef.current?.click()}
                disabled={!isOnline || attachments.length >= 10}
                className="flex items-center justify-center gap-2 h-10 bg-blue-50 hover:bg-blue-100 disabled:opacity-40 border border-blue-200 text-blue-700 rounded-lg text-xs font-medium transition-colors"
              >
                <Upload size={14} /> Upload Dokumen
              </button>
            </div>
            <input ref={photoInputRef} type="file" accept="image/*" capture="environment" className="hidden"
              onChange={e => e.target.files?.[0] && handleUpload(e.target.files[0], 'foto')} />
            <input ref={fileInputRef} type="file" accept=".pdf,.doc,.docx,.xls,.xlsx" className="hidden"
              onChange={e => e.target.files?.[0] && handleUpload(e.target.files[0], 'dokumen')} />

            {uploadProgress !== null && (
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-gray-500">
                  <span>Mengunggah...</span><span>{uploadProgress}%</span>
                </div>
                <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-green-500 rounded-full transition-all" style={{ width: `${uploadProgress}%` }} />
                </div>
              </div>
            )}

            {attachments.length > 0 && (
              <div className="space-y-2">
                {attachments.map(att => (
                  <div key={att.id} className="flex items-center gap-3 p-2.5 bg-gray-50 rounded-lg">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm flex-shrink-0 ${att.tipe === 'foto' ? 'bg-green-100' : 'bg-blue-100'}`}>
                      {att.tipe === 'foto' ? '📷' : '📄'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-gray-800 truncate">{att.nama_file}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-gray-400">{fmtBytes(att.ukuran_bytes)}</span>
                        <Badge variant={att.status_verifikasi === 'terverifikasi' ? 'green' : att.status_verifikasi === 'menunggu' ? 'amber' : 'red'} className="text-[10px] px-1.5 py-0">
                          {att.status_verifikasi === 'terverifikasi' ? 'Terverifikasi' : att.status_verifikasi === 'menunggu' ? 'Menunggu' : 'Ditolak'}
                        </Badge>
                      </div>
                    </div>
                    <button onClick={() => removeAttachment(att.id)} className="p-1 hover:bg-red-50 rounded transition-colors">
                      <X size={13} className="text-gray-400 hover:text-red-500" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            {attachments.length === 0 && uploadProgress === null && (
              <p className="text-center text-gray-400 text-xs py-2">Belum ada lampiran hari ini</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
