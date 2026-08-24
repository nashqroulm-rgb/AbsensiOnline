import { useState, useMemo, useEffect } from 'react';
import { Filter, ChevronRight, Paperclip } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { getHistory, getStatusLabel } from '../../services/attendance.service';
import type { HistoryRecord, AttendanceStatus } from '../../types';
import Badge from '../ui/Badge';
import { getStatusBadgeVariant } from '../ui/Badge';

type FilterType = 'semua' | AttendanceStatus;

const FILTERS: { id: FilterType; label: string }[] = [
  { id: 'semua', label: 'Semua' },
  { id: 'hadir', label: 'Hadir' },
  { id: 'terlambat', label: 'Terlambat' },
  { id: 'izin', label: 'Izin' },
  { id: 'absen', label: 'Absen' },
];

function formatDuration(min: number | null) {
  if (!min) return '—';
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${h}j ${m}m`;
}

function formatTime(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
}

export default function HistoryTab() {
  const { user } = useAuth();
  const [activeFilter, setActiveFilter] = useState<FilterType>('semua');
  const [visibleCount, setVisibleCount] = useState(20);
  const [history, setHistory] = useState<HistoryRecord[]>([]);

  useEffect(() => {
    if (!user?.id) return;
    const load = () => getHistory(user.id).then(result => {
      if (result.success) setHistory(result.data);
    });
    load();
    window.addEventListener('attendance-updated', load);
    return () => window.removeEventListener('attendance-updated', load);
  }, [user?.id]);

  const filtered = useMemo(() =>
    activeFilter === 'semua' ? history : history.filter(h => h.status === activeFilter),
    [history, activeFilter]
  );

  const summary = useMemo(() => ({
    hadir: history.filter(h => h.status === 'hadir').length,
    terlambat: history.filter(h => h.status === 'terlambat').length,
    izin: history.filter(h => h.status === 'izin' || h.status === 'sakit' || h.status === 'cuti').length,
    absen: history.filter(h => h.status === 'absen').length,
  }), [history]);

  const visible = filtered.slice(0, visibleCount);

  // Group by month
  const grouped = useMemo(() => {
    const groups: Record<string, typeof visible> = {};
    visible.forEach(record => {
      const monthKey = new Date(record.date).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
      if (!groups[monthKey]) groups[monthKey] = [];
      groups[monthKey].push(record);
    });
    return Object.entries(groups);
  }, [visible]);

  return (
    <div className="pb-4">
      {/* Header */}
      <div className="bg-green-600 px-4 pt-6 pb-5">
        <h1 className="text-white font-bold text-lg">Riwayat Absensi</h1>
        <p className="text-green-100 text-xs mt-0.5">30 hari terakhir</p>

        {/* Summary pills */}
        <div className="grid grid-cols-4 gap-2 mt-4">
          {[
            { label: 'Hadir', value: summary.hadir, color: 'bg-green-500' },
            { label: 'Telat', value: summary.terlambat, color: 'bg-amber-500' },
            { label: 'Izin', value: summary.izin, color: 'bg-blue-500' },
            { label: 'Absen', value: summary.absen, color: 'bg-red-500' },
          ].map(({ label, value }) => (
            <div key={label} className="bg-white/10 rounded-lg p-2 text-center">
              <p className={`text-lg font-bold text-white`}>{value}</p>
              <p className="text-[10px] text-green-100">{label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Filters */}
      <div className="px-4 py-3 flex gap-2 overflow-x-auto scrollbar-hide">
        <Filter size={14} className="text-gray-400 flex-shrink-0 mt-2" />
        {FILTERS.map(f => (
          <button
            key={f.id}
            onClick={() => { setActiveFilter(f.id); setVisibleCount(20); }}
            className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              activeFilter === f.id ? 'bg-green-600 text-white' : 'bg-white border border-gray-200 text-gray-600'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Records */}
      <div className="px-4 space-y-4">
        {grouped.map(([month, records]) => (
          <div key={month}>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">{month}</p>
            <div className="space-y-2">
              {records.map(record => (
                <div key={record.id} className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-semibold text-gray-900">
                        {new Date(record.date).toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short' })}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">{record.shift_nama}</p>
                    </div>
                    <Badge variant={getStatusBadgeVariant(record.status)}>{getStatusLabel(record.status)}</Badge>
                  </div>
                  <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-gray-50">
                    <div>
                      <p className="text-[10px] text-gray-400">Check-in</p>
                      <p className="text-xs font-medium text-gray-800">{formatTime(record.checkin_at)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-gray-400">Check-out</p>
                      <p className="text-xs font-medium text-gray-800">{formatTime(record.checkout_at)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-gray-400">Durasi</p>
                      <p className="text-xs font-medium text-gray-800">{formatDuration(record.durasi_menit)}</p>
                    </div>
                  </div>
                  {record.lampiran_count > 0 && (
                    <div className="flex items-center gap-1 mt-2 text-xs text-gray-400">
                      <Paperclip size={11} /> {record.lampiran_count} lampiran
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}

        {visibleCount < filtered.length && (
          <button
            onClick={() => setVisibleCount(c => c + 10)}
            className="w-full py-3 text-sm text-green-600 font-medium flex items-center justify-center gap-1"
          >
            Muat lebih banyak <ChevronRight size={14} />
          </button>
        )}
      </div>
    </div>
  );
}
