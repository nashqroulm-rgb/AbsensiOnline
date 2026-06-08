import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, Bell, MapPin, Clock, Briefcase, Calendar, Phone, Hash, ChevronRight } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { getWorkerById } from '../../services/workers.service';
import { getZones } from '../../services/zones.service';
import { getShifts } from '../../services/shifts.service';
import { getHistory } from '../../services/attendance.service';
import type { User, Zone, Shift } from '../../types';
import Badge from '../ui/Badge';
import Toggle from '../ui/Toggle';
import Modal from '../ui/Modal';

export default function ProfileTab() {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();
  const [notifEnabled, setNotifEnabled] = useState(true);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [profile, setProfile] = useState<User | null>(currentUser);
  const [zone, setZone] = useState<Zone | null>(null);
  const [shift, setShift] = useState<Shift | null>(null);
  const [stats, setStats] = useState({ hadir: 0, terlambat: 0, izin: 0 });

  useEffect(() => {
    if (!currentUser?.id) return;
    const load = async () => {
      const workerResult = await getWorkerById(currentUser.id);
      if (workerResult.success) {
        setProfile(workerResult.data);
        const [zonesResult, shiftsResult, historyResult] = await Promise.all([
          getZones(),
          getShifts(),
          getHistory(currentUser.id),
        ]);
        if (zonesResult.success) {
          setZone(zonesResult.data.find(z => z.id === workerResult.data.zona_id) || null);
        }
        if (shiftsResult.success) {
          setShift(shiftsResult.data.find(s => s.id === workerResult.data.shift_id) || null);
        }
        if (historyResult.success) {
          const now = new Date();
          const thisMonth = historyResult.data.filter(h => {
            const d = new Date(h.date);
            return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
          });
          setStats({
            hadir: thisMonth.filter(h => h.status === 'hadir').length,
            terlambat: thisMonth.filter(h => h.status === 'terlambat').length,
            izin: thisMonth.filter(h => ['izin', 'sakit', 'cuti'].includes(h.status)).length,
          });
        }
      }
    };
    load();
  }, [currentUser?.id]);

  const bergabungDate = profile?.bergabung_sejak
    ? new Date(profile.bergabung_sejak).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
    : '—';

  const avatar = profile?.nama?.slice(0, 2).toUpperCase() || 'AB';

  const statsBulanIni = [
    { label: 'Hadir', value: stats.hadir, color: '#16A34A', bg: '#F0FDF4' },
    { label: 'Terlambat', value: stats.terlambat, color: '#D97706', bg: '#FFFBEB' },
    { label: 'Izin', value: stats.izin, color: '#2563EB', bg: '#EFF6FF' },
  ];

  const tipeMap: Record<string, string> = { tetap: 'Karyawan Tetap', kontrak: 'Karyawan Kontrak', harian: 'Karyawan Harian' };

  return (
    <div style={{ background: '#F3F4F6' }} className="min-h-screen">
      {/* Topbar */}
      <div style={{ background: '#111827' }} className="sticky top-0 z-20 px-4 py-4">
        <h1 className="text-white font-semibold text-base">Profil Saya</h1>
      </div>

      <div className="p-4 space-y-3">
        {/* Profile Card */}
        <div className="bg-white rounded-xl p-5 shadow-sm border border-black/[0.06]">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center text-white text-xl font-bold shadow-md shadow-green-200">
              {avatar}
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="font-bold text-gray-900 text-lg leading-tight">{profile?.nama}</h2>
              <p className="text-gray-500 text-sm mt-0.5">{profile?.jabatan}</p>
              <div className="flex flex-wrap gap-1.5 mt-2">
                <Badge variant="blue">{shift?.nama || 'Shift Pagi'}</Badge>
                <Badge variant="green">{zone?.nama?.split(' - ')[0] || 'Blok A'}</Badge>
                <Badge variant="gray">{tipeMap[profile?.tipe || 'tetap'] || 'Karyawan Tetap'}</Badge>
              </div>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="bg-white rounded-xl p-4 shadow-sm border border-black/[0.06]">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Statistik Bulan Ini</p>
          <div className="grid grid-cols-3 gap-3">
            {statsBulanIni.map(s => (
              <div key={s.label} className="rounded-xl p-3 text-center" style={{ background: s.bg }}>
                <p className="text-2xl font-bold" style={{ color: s.color }}>{s.value}</p>
                <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Info Penugasan */}
        <div className="bg-white rounded-xl overflow-hidden shadow-sm border border-black/[0.06]">
          <div className="px-4 py-3 border-b border-gray-50">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Info Penugasan</p>
          </div>
          <div className="divide-y divide-gray-50">
            {[
              { icon: MapPin, label: 'Zona Kerja', value: zone?.nama || '—', color: 'text-green-500' },
              { icon: Clock, label: 'Shift', value: shift ? `${shift.nama} · ${shift.jam_mulai}–${shift.jam_selesai}` : '—', color: 'text-blue-500' },
              { icon: Briefcase, label: 'Jabatan', value: currentUser?.jabatan || '—', color: 'text-amber-500' },
              { icon: Calendar, label: 'Bergabung Sejak', value: bergabungDate, color: 'text-purple-500' },
            ].map(({ icon: Icon, label, value, color }) => (
              <div key={label} className="flex items-center gap-3 px-4 py-3">
                <div className={`w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center flex-shrink-0`}>
                  <Icon size={15} className={color} />
                </div>
                <div>
                  <p className="text-xs text-gray-400">{label}</p>
                  <p className="text-sm font-medium text-gray-800">{value}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Info Akun */}
        <div className="bg-white rounded-xl overflow-hidden shadow-sm border border-black/[0.06]">
          <div className="px-4 py-3 border-b border-gray-50">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Info Akun</p>
          </div>
          <div className="divide-y divide-gray-50">
            <div className="flex items-center gap-3 px-4 py-3">
              <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center">
                <Phone size={15} className="text-gray-500" />
              </div>
              <div>
                <p className="text-xs text-gray-400">Nomor HP</p>
                <p className="text-sm font-medium text-gray-800">{currentUser?.no_hp}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 px-4 py-3">
              <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center">
                <Hash size={15} className="text-gray-500" />
              </div>
              <div>
                <p className="text-xs text-gray-400">ID Pekerja</p>
                <p className="text-sm font-medium text-gray-800 uppercase font-mono">{currentUser?.id}</p>
              </div>
            </div>
            <div className="flex items-center justify-between px-4 py-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center">
                  <Bell size={15} className="text-gray-500" />
                </div>
                <div>
                  <p className="text-xs text-gray-400">Notifikasi</p>
                  <p className="text-sm font-medium text-gray-800">Push Notification</p>
                </div>
              </div>
              <Toggle checked={notifEnabled} onChange={setNotifEnabled} />
            </div>
          </div>
        </div>

        {/* Logout */}
        <button
          onClick={() => setShowLogoutConfirm(true)}
          className="w-full bg-white rounded-xl px-4 py-4 shadow-sm border border-black/[0.06] flex items-center gap-3 hover:bg-red-50 transition-colors group"
        >
          <div className="w-8 h-8 rounded-lg bg-red-50 group-hover:bg-red-100 flex items-center justify-center">
            <LogOut size={15} className="text-red-500" />
          </div>
          <span className="text-sm font-medium text-red-600 flex-1 text-left">Keluar</span>
          <ChevronRight size={14} className="text-gray-300" />
        </button>
      </div>

      {/* Logout Confirm Modal */}
      <Modal isOpen={showLogoutConfirm} onClose={() => setShowLogoutConfirm(false)} title="Konfirmasi Keluar" size="sm">
        <div className="p-5 space-y-4">
          <p className="text-sm text-gray-600">Apakah kamu yakin ingin keluar dari aplikasi?</p>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setShowLogoutConfirm(false)}
              className="py-2.5 rounded-lg border border-gray-200 text-sm text-gray-700 hover:bg-gray-50 font-medium"
            >
              Batal
            </button>
            <button
              onClick={() => { logout(); setShowLogoutConfirm(false); navigate('/login', { replace: true }); }}
              className="py-2.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-medium"
            >
              Keluar
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
