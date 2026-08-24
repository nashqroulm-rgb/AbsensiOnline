import { useState, useEffect } from 'react';
import { Users, UserCheck, UserX, AlertCircle, TrendingUp, RefreshCw } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend } from 'recharts';
import { getWeeklyData, getActivityFeed } from '../../services/reports.service';
import { getAttendances } from '../../services/attendance.service';
import { getWorkers } from '../../services/workers.service';
import { getShifts } from '../../services/shifts.service';
import { getZones } from '../../services/zones.service';
import Badge from '../ui/Badge';
import { getStatusBadgeVariant } from '../ui/Badge';
import { wibDayRange, wibToday } from '../../utils/wib';
import type { ActivityFeed, WeeklyData, Attendance, User, Shift, Zone } from '../../types';

function StatCard({ icon: Icon, label, value, sub, color, trend }: {
  icon: React.ElementType; label: string; value: number | string;
  sub?: string; color: string; trend?: string;
}) {
  return (
    <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
      <div className="flex items-start justify-between">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center`} style={{ background: `${color}15` }}>
          <Icon size={20} style={{ color }} />
        </div>
        {trend && (
          <span className="text-xs text-green-600 font-medium flex items-center gap-1">
            <TrendingUp size={12} /> {trend}
          </span>
        )}
      </div>
      <div className="mt-3">
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        <p className="text-sm text-gray-500 mt-0.5">{label}</p>
        {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
      </div>
    </div>
  );
}

function ActivityItem({ item }: { item: ActivityFeed }) {
  // FIXPLAN U8: service hanya memproduksi checkin/terlambat — label lain dihapus
  const eventColors: Record<string, string> = {
    checkin: '#16A34A', terlambat: '#D97706',
  };
  const eventLabels: Record<string, string> = {
    checkin: 'Check-In', terlambat: 'Terlambat',
  };
  const eventIcons: Record<string, string> = { checkin: '✓', terlambat: '⚠' };

  const timeAgo = (iso: string) => {
    const diff = (Date.now() - new Date(iso).getTime()) / 60000;
    if (diff < 1) return 'Baru saja';
    if (diff < 60) return `${Math.round(diff)} menit lalu`;
    return `${Math.round(diff / 60)} jam lalu`;
  };

  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-gray-50 last:border-0">
      <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 mt-0.5"
        style={{ background: eventColors[item.event] }}>
        {eventIcons[item.event]}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-gray-800">
          <span className="font-medium">{item.user_nama}</span>
          {' '}<span className="text-gray-500">{eventLabels[item.event].toLowerCase()}</span>
          {item.keterangan && <span className="text-gray-400"> — {item.keterangan}</span>}
        </p>
        <p className="text-xs text-gray-400 mt-0.5">{item.zona} · {timeAgo(item.waktu)}</p>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [lastUpdate, setLastUpdate] = useState(new Date());
  const [refreshing, setRefreshing] = useState(false);
  const [attendances, setAttendances] = useState<Attendance[]>([]);
  const [workers, setWorkers] = useState<User[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [zones, setZones] = useState<Zone[]>([]);
  const [weeklyData, setWeeklyData] = useState<WeeklyData[]>([]);
  const [activityFeed, setActivityFeed] = useState<ActivityFeed[]>([]);

  const loadAll = async () => {
    // FIXPLAN U7: dashboard hanya butuh attendance hari-WIB-ini
    const { start } = wibDayRange(wibToday());
    const [attResult, workerResult, shiftResult, zoneResult] = await Promise.all([
      getAttendances(start),
      getWorkers(),
      getShifts(),
      getZones(),
    ]);
    if (attResult.success) setAttendances(attResult.data);
    if (workerResult.success) setWorkers(workerResult.data);
    if (shiftResult.success) setShifts(shiftResult.data);
    if (zoneResult.success) setZones(zoneResult.data);
  };

  const loadReports = async () => {
    const [weeklyResult, activityResult] = await Promise.all([getWeeklyData(), getActivityFeed()]);
    if (weeklyResult.success) setWeeklyData(weeklyResult.data);
    if (activityResult.success) setActivityFeed(activityResult.data);
  };

  useEffect(() => {
    loadAll();
    loadReports();
  }, []);

  const totalWorkers = workers.filter(u => u.role === 'worker').length;

  const today = wibToday(); // FIXPLAN U1: kalender WIB
  const checkedIn = attendances.filter(a => a.checkin_at?.startsWith(today));

  const hadir = checkedIn.filter(a => a.status === 'hadir').length;
  const terlambat = checkedIn.filter(a => a.status === 'terlambat').length;
  const absen = Math.max(0, totalWorkers - hadir - terlambat);

  const donutData = [
    { name: 'Hadir', value: hadir, color: '#16A34A' },
    { name: 'Terlambat', value: terlambat, color: '#D97706' },
    { name: 'Absen', value: absen, color: '#DC2626' },
  ];

  const shiftColors = ['#16A34A', '#D97706', '#2563EB'];
  const shiftIcons = ['🌅', '☀️', '🌙'];
  const activeShifts = shifts.map((s, i) => {
    const count = attendances.filter(a => {
      if (!a.checkin_at) return false;
      return a.shift_id === s.id && a.checkin_at.startsWith(today);
    }).length;
    return {
      id: s.id,
      nama: s.nama,
      waktu: `${s.jam_mulai}–${s.jam_selesai}`,
      ikon: shiftIcons[i % shiftIcons.length],
      count,
      color: shiftColors[i % shiftColors.length],
    };
  });

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([loadAll(), loadReports()]);
    setLastUpdate(new Date());
    setRefreshing(false);
  };

  useEffect(() => {
    const t = setInterval(handleRefresh, 60000);
    return () => clearInterval(t);
  }, []);

  const recentCheckins = attendances.filter(a => a.checkin_at).slice(0, 5);

  return (
    <div className="p-6 space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Users} label="Total Pekerja" value={totalWorkers} color="#2563EB" sub="Aktif & nonaktif" />
        <StatCard icon={UserCheck} label="Hadir Hari Ini" value={hadir} color="#16A34A"
          sub={`${totalWorkers > 0 ? Math.round((hadir / totalWorkers) * 100) : 0}% dari total`} />
        <StatCard icon={AlertCircle} label="Terlambat" value={terlambat} color="#D97706" sub={`${terlambat} pekerja`} />
        <StatCard icon={UserX} label="Tidak Hadir" value={absen} color="#DC2626" sub={`${absen} pekerja`} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Donut Chart */}
        <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900 text-sm">Kehadiran Hari Ini</h3>
            <button onClick={handleRefresh} className={`p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 ${refreshing ? 'animate-spin' : ''}`}>
              <RefreshCw size={14} />
            </button>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={donutData} cx="50%" cy="50%" innerRadius={55} outerRadius={80} dataKey="value" paddingAngle={3}>
                {donutData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
              </Pie>
              <Tooltip formatter={(v, n) => [v, n]} />
              <Legend iconType="circle" iconSize={8} formatter={(v) => <span className="text-xs text-gray-600">{v}</span>} />
            </PieChart>
          </ResponsiveContainer>
          <p className="text-xs text-gray-400 text-center mt-1">
            Diperbarui: {lastUpdate.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>

        {/* Activity Feed */}
        <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm lg:col-span-2">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-gray-900 text-sm">Aktivitas Terbaru</h3>
            <span className="text-xs text-gray-400">Auto-refresh 60 detik</span>
          </div>
          <div className="space-y-0 max-h-[220px] overflow-y-auto">
            {activityFeed.map(item => <ActivityItem key={item.id} item={item} />)}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Bar Chart */}
        <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm lg:col-span-2">
          <h3 className="font-semibold text-gray-900 text-sm mb-4">Kehadiran Mingguan</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={weeklyData} barSize={14} barGap={4}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
              <XAxis dataKey="hari" tick={{ fontSize: 12, fill: '#6B7280' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#6B7280' }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 12 }} />
              <Bar dataKey="hadir" name="Hadir" fill="#16A34A" radius={[4, 4, 0, 0]} />
              <Bar dataKey="terlambat" name="Terlambat" fill="#D97706" radius={[4, 4, 0, 0]} />
              <Bar dataKey="absen" name="Absen" fill="#DC2626" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Active Shifts */}
        <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
          <h3 className="font-semibold text-gray-900 text-sm mb-4">Shift Aktif</h3>
          <div className="space-y-3">
            {activeShifts.map(s => (
              <div key={s.id} className="flex items-center gap-3 p-3 rounded-xl" style={{ background: `${s.color}10` }}>
                <span className="text-2xl">{s.ikon}</span>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">{s.nama}</p>
                  <p className="text-xs text-gray-500">{s.waktu}</p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold" style={{ color: s.color }}>{s.count}</p>
                  <p className="text-[10px] text-gray-400">pekerja</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Check-ins Table */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900 text-sm">Check-In Terbaru</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50">
                {['Pekerja', 'Zona', 'Shift', 'Waktu', 'Status'].map(h => (
                  <th key={h} className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {recentCheckins.map(att => {
                const zone = zones.find(z => z.id === att.zona_id);
                const shift = shifts.find(s => s.id === att.shift_id);
                return (
                  <tr key={att.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center text-white text-xs font-bold">
                          {att.user_nama.slice(0, 1)}
                        </div>
                        <span className="text-sm font-medium text-gray-900">{att.user_nama}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-sm text-gray-600">{zone?.nama?.split(' - ')[0] || '—'}</td>
                    <td className="px-5 py-3 text-sm text-gray-600">{shift?.nama || '—'}</td>
                    <td className="px-5 py-3 text-sm text-gray-600">
                      {att.checkin_at ? new Date(att.checkin_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '—'}
                    </td>
                    <td className="px-5 py-3">
                      <Badge variant={getStatusBadgeVariant(att.status)} dot>
                        {att.status.charAt(0).toUpperCase() + att.status.slice(1)}
                      </Badge>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
