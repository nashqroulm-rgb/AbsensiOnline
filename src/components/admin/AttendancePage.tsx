import { useState, useMemo, useEffect, Fragment } from 'react';
import { Search, Download, Eye, Edit2, ChevronLeft, ChevronRight } from 'lucide-react';
import { getAttendances, getStatusLabel } from '../../services/attendance.service';
import { getShifts } from '../../services/shifts.service';
import { getZones } from '../../services/zones.service';
import { getAttachmentsByAttendance, updateAttachmentVerification } from '../../services/attachments.service';
import type { Attendance, AttendanceStatus, Zone, Shift, Attachment } from '../../types';
import Badge from '../ui/Badge';
import { getStatusBadgeVariant } from '../ui/Badge';
import Modal from '../ui/Modal';
import AttachmentModal from './AttachmentModal';

const STATUS_OPTS: { value: string; label: string }[] = [
  { value: '', label: 'Semua Status' },
  { value: 'hadir', label: 'Hadir' },
  { value: 'terlambat', label: 'Terlambat' },
  { value: 'absen', label: 'Absen' },
  { value: 'izin', label: 'Izin' },
  { value: 'libur', label: 'Libur' },
];

function formatTime(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
}

function formatDate(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatDuration(min: number | null) {
  if (!min) return '—';
  return `${Math.floor(min / 60)}j ${min % 60}m`;
}

export default function AttendancePage() {
  const [search, setSearch] = useState('');
  const [filterZona, setFilterZona] = useState('');
  const [filterShift, setFilterShift] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterDate, setFilterDate] = useState(new Date().toISOString().split('T')[0]);
  const [page, setPage] = useState(1);
  const [selectedAtt, setSelectedAtt] = useState<Attendance | null>(null);
  const [showOverride, setShowOverride] = useState(false);
  const [overrideStatus, setOverrideStatus] = useState<AttendanceStatus>('izin');
  const [overrideNote, setOverrideNote] = useState('');
  const [attendances, setAttendances] = useState<Attendance[]>([]);
  const [zones, setZones] = useState<Zone[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [showAttachments, setShowAttachments] = useState(false);
  const [currentAttachments, setCurrentAttachments] = useState<Attachment[]>([]);
  const [attUserNama, setAttUserNama] = useState('');

  useEffect(() => {
    async function load() {
      const [attRes, zoneRes, shiftRes] = await Promise.all([
        getAttendances(),
        getZones(),
        getShifts(),
      ]);
      if (attRes.success) setAttendances(attRes.data);
      if (zoneRes.success) setZones(zoneRes.data);
      if (shiftRes.success) setShifts(shiftRes.data);
    }
    load();
  }, []);

  const openAttachments = async (att: Attendance) => {
    const res = await getAttachmentsByAttendance(att.id);
    setCurrentAttachments(res.success ? res.data : []);
    setAttUserNama(att.user_nama);
    setShowAttachments(true);
  };

  const handleVerify = async (id: string, status: 'terverifikasi' | 'ditolak') => {
    await updateAttachmentVerification(id, status);
    setCurrentAttachments(prev => prev.map(a => a.id === id ? { ...a, status_verifikasi: status } : a));
  };

  const PAGE_SIZE = 10;

  const filtered = useMemo(() => attendances.filter(a => {
    const matchSearch = !search || a.user_nama.toLowerCase().includes(search.toLowerCase()) || a.user_id.includes(search);
    const matchZona = !filterZona || a.zona_id === filterZona;
    const matchShift = !filterShift || a.shift_id === filterShift;
    const matchStatus = !filterStatus || a.status === filterStatus;
    return matchSearch && matchZona && matchShift && matchStatus;
  }), [attendances, search, filterZona, filterShift, filterStatus]);

  const total = filtered.length;
  const totalPages = Math.ceil(total / PAGE_SIZE);
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const stats = {
    total: filtered.length,
    hadir: filtered.filter(a => a.status === 'hadir').length,
    terlambat: filtered.filter(a => a.status === 'terlambat').length,
    absen: filtered.filter(a => a.status === 'absen').length,
    izin: filtered.filter(a => a.status === 'izin').length,
  };

  return (
    <div className="p-6 space-y-5">
      {/* Quick Stats */}
      <div className="grid grid-cols-5 gap-3">
        {[
          { label: 'Total Record', value: stats.total, color: '#2563EB' },
          { label: 'Hadir', value: stats.hadir, color: '#16A34A' },
          { label: 'Terlambat', value: stats.terlambat, color: '#D97706' },
          { label: 'Absen', value: stats.absen, color: '#DC2626' },
          { label: 'Izin', value: stats.izin, color: '#7C3AED' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm text-center">
            <p className="text-2xl font-bold" style={{ color: s.color }}>{s.value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-48">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
              placeholder="Cari nama atau ID pekerja..."
              className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
          </div>
          <input type="date" value={filterDate} onChange={e => setFilterDate(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
          <select value={filterZona} onChange={e => { setFilterZona(e.target.value); setPage(1); }}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500">
            <option value="">Semua Zona</option>
            {zones.map(z => <option key={z.id} value={z.id}>{z.nama}</option>)}
          </select>
          <select value={filterShift} onChange={e => { setFilterShift(e.target.value); setPage(1); }}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500">
            <option value="">Semua Shift</option>
            {shifts.map(s => <option key={s.id} value={s.id}>{s.nama}</option>)}
          </select>
          <select value={filterStatus} onChange={e => { setFilterStatus(e.target.value); setPage(1); }}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500">
            {STATUS_OPTS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
          <button className="flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50">
            <Download size={15} /> Export
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                {['Pekerja', 'Tanggal', 'Shift', 'Zona', 'Check-In', 'Check-Out', 'Durasi', 'Status', 'Lampiran', 'Aksi'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {paginated.map(att => {
                const zone = zones.find(z => z.id === att.zona_id);
                const shift = shifts.find(s => s.id === att.shift_id);
                const isSelected = selectedAtt?.id === att.id;
                return (
                  <Fragment key={att.id}>
                    <tr onClick={() => setSelectedAtt(isSelected ? null : att)}
                      className={`hover:bg-gray-50/50 transition-colors cursor-pointer ${isSelected ? 'bg-blue-50/20' : ''}`}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 bg-green-600 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                            {att.user_nama.slice(0, 1)}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900">{att.user_nama}</p>
                            <p className="text-xs font-mono text-gray-400">{att.user_id}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{formatDate(att.checkin_at || att.client_timestamp)}</td>
                      <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{shift?.nama || '—'}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{zone?.nama?.split(' - ')[0] || '—'}</td>
                      <td className="px-4 py-3 text-sm font-mono text-gray-700">{formatTime(att.checkin_at)}</td>
                      <td className="px-4 py-3 text-sm font-mono text-gray-700">{formatTime(att.checkout_at)}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{formatDuration(att.durasi_menit)}</td>
                      <td className="px-4 py-3">
                        <Badge variant={getStatusBadgeVariant(att.status)} dot>
                          {getStatusLabel(att.status)}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {att.lampiran_count > 0 ? (
                          <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full text-xs font-medium">{att.lampiran_count} file</span>
                        ) : '—'}
                      </td>
                      <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center gap-1">
                          <button onClick={() => att.lampiran_count > 0 ? openAttachments(att) : setSelectedAtt(isSelected ? null : att)}
                            className="p-1.5 hover:bg-blue-50 rounded-lg text-gray-400 hover:text-blue-600 transition-colors">
                            <Eye size={14} />
                          </button>
                          <button onClick={() => { setSelectedAtt(att); setShowOverride(true); }}
                            className="p-1.5 hover:bg-amber-50 rounded-lg text-gray-400 hover:text-amber-600 transition-colors" title="Override Status">
                            <Edit2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                    {isSelected && (
                      <tr key={`${att.id}-detail`}>
                        <td colSpan={10} className="px-4 pb-4 pt-2 bg-blue-50/20">
                          <AttendanceDetail att={att} zones={zones} shifts={shifts} onOverride={() => { setShowOverride(true); }} onOpenAttachments={() => openAttachments(att)} />
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>

        {paginated.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-400 text-sm">Tidak ada data kehadiran</p>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between">
            <p className="text-xs text-gray-500">Menampilkan {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} dari {total}</p>
            <div className="flex items-center gap-1">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-40 text-gray-500"><ChevronLeft size={16} /></button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                <button key={p} onClick={() => setPage(p)} className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${page === p ? 'bg-green-600 text-white' : 'hover:bg-gray-100 text-gray-600'}`}>{p}</button>
              ))}
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-40 text-gray-500"><ChevronRight size={16} /></button>
            </div>
          </div>
        )}
      </div>

      {/* Override Modal */}
      <Modal isOpen={showOverride} onClose={() => setShowOverride(false)} title="Override Status Kehadiran" size="sm">
        <div className="p-5 space-y-4">
          <p className="text-sm text-gray-600">Ubah status kehadiran <strong>{selectedAtt?.user_nama}</strong></p>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Status Baru</label>
            <select value={overrideStatus} onChange={e => setOverrideStatus(e.target.value as AttendanceStatus)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500">
              <option value="izin">Izin</option>
              <option value="sakit">Sakit</option>
              <option value="cuti">Cuti</option>
              <option value="hadir">Hadir</option>
              <option value="absen">Absen</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Catatan</label>
            <textarea value={overrideNote} onChange={e => setOverrideNote(e.target.value)} rows={3}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
              placeholder="Alasan perubahan status..." />
          </div>
          <div className="flex gap-2">
            <button onClick={() => setShowOverride(false)} className="flex-1 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-700 hover:bg-gray-50 font-medium">Batal</button>
            <button onClick={() => setShowOverride(false)} className="flex-1 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium">Simpan</button>
          </div>
        </div>
      </Modal>

      {/* Attachment Modal */}
      <AttachmentModal isOpen={showAttachments} onClose={() => setShowAttachments(false)}
        attachments={currentAttachments} userNama={attUserNama} onVerify={handleVerify} />
    </div>
  );
}

function AttendanceDetail({ att, zones, shifts, onOverride, onOpenAttachments }: { att: Attendance; zones: Zone[]; shifts: Shift[]; onOverride: () => void; onOpenAttachments: () => void }) {
  const zone = zones.find(z => z.id === att.zona_id);
  const shift = shifts.find(s => s.id === att.shift_id);

  return (
    <div className="bg-white rounded-xl p-4 border border-blue-100 grid grid-cols-2 md:grid-cols-4 gap-4">
      {[
        { label: 'Zona', value: zone?.nama || '—' },
        { label: 'Shift', value: shift?.nama || '—' },
        { label: 'Check-In At', value: att.checkin_at ? new Date(att.checkin_at).toLocaleString('id-ID') : '—' },
        { label: 'Check-Out At', value: att.checkout_at ? new Date(att.checkout_at).toLocaleString('id-ID') : '—' },
        { label: 'Koordinat Masuk', value: att.latitude_in ? `${att.latitude_in.toFixed(5)}, ${att.longitude_in?.toFixed(5)}` : '—' },
        { label: 'Synced At', value: att.synced_at ? new Date(att.synced_at).toLocaleString('id-ID') : 'Belum sync' },
        { label: 'Lampiran', value: `${att.lampiran_count} file` },
        { label: 'Catatan', value: att.catatan || '—' },
      ].map(({ label, value }) => (
        <div key={label}>
          <p className="text-xs text-gray-400">{label}</p>
          <p className="text-sm font-medium text-gray-800 mt-0.5">{value}</p>
        </div>
      ))}
      <div className="col-span-2 md:col-span-4 flex gap-2 pt-2 border-t border-gray-100">
        <button onClick={onOverride} className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xs font-medium">Override Status</button>
        {att.lampiran_count > 0 && (
          <button onClick={onOpenAttachments} className="px-4 py-2 border border-gray-200 hover:bg-gray-50 text-gray-600 rounded-lg text-xs font-medium">Lihat Lampiran</button>
        )}
      </div>
    </div>
  );
}
