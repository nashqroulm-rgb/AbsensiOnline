import React, { useState, useEffect, useMemo } from 'react';
import { Search, Plus, Download, ChevronLeft, ChevronRight, Edit2, Trash2, Eye, UserX, Key } from 'lucide-react';
import type { User, Zone, Shift } from '../../types';
import { getWorkers, createWorker, updateWorker, deleteWorker, resetWorkerPin } from '../../services/workers.service';
import { getPendingFaceProfiles, setFaceProfileStatus, type FaceProfile } from '../../services/face.service';
import { downloadCsv } from '../../utils/exportCsv';
import { getZones } from '../../services/zones.service';
import { getShifts } from '../../services/shifts.service';
import Badge from '../ui/Badge';
import { getStatusBadgeVariant } from '../ui/Badge';
import Toggle from '../ui/Toggle';
import Modal from '../ui/Modal';
import ConfirmDialog from '../ui/ConfirmDialog';
import { useToast } from '../ui/Toast';

const PAGE_SIZE = 8;

const statFields = [
  { label: 'Total', key: 'total', color: '#2563EB' },
  { label: 'Aktif', key: 'aktif', color: '#16A34A' },
  { label: 'Nonaktif', key: 'nonaktif', color: '#6B7280' },
  { label: 'Pria', key: 'pria', color: '#0891B2' },
  { label: 'Wanita', key: 'wanita', color: '#D946EF' },
];

type WorkerFormData = {
  nama: string;
  no_hp: string;
  jabatan: string;
  zona_id: string;
  shift_id: string;
  tipe: User['tipe'];
  gender: User['gender'];
  pin: string;
  absensi_online: boolean;
  status: User['status'];
};

function WorkerForm({
  onClose,
  onSubmit,
  initial,
  zones,
  shifts,
  toast,
}: {
  onClose: () => void;
  onSubmit: (data: WorkerFormData) => void;
  initial?: Partial<User>;
  zones: Zone[];
  shifts: Shift[];
  toast: (msg: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
}) {
  const [form, setForm] = useState({
    nama: initial?.nama || '',
    no_hp: initial?.no_hp || '',
    jabatan: initial?.jabatan || '',
    zona_id: initial?.zona_id || 'z1',
    shift_id: initial?.shift_id || 's1',
    tipe: initial?.tipe || 'tetap',
    gender: initial?.gender || 'pria',
    pin: '',
    absensi_online: initial?.absensi_online ?? true,
    status: initial?.status || 'aktif',
  });

  const set = (k: string, v: string | boolean) => setForm(f => ({ ...f, [k]: v }));

  return (
    <div className="p-5 space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <label className="block text-xs font-medium text-gray-700 mb-1">Nama Lengkap *</label>
          <input value={form.nama} onChange={e => set('nama', e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" placeholder="Nama pekerja" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">No HP *</label>
          <input value={form.no_hp} onChange={e => set('no_hp', e.target.value)} type="tel"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" placeholder="08xx" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Jabatan</label>
          <input value={form.jabatan} onChange={e => set('jabatan', e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" placeholder="Jabatan" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Zona</label>
          <select value={form.zona_id} onChange={e => set('zona_id', e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500">
            {zones.map(z => <option key={z.id} value={z.id}>{z.nama}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Shift</label>
          <select value={form.shift_id} onChange={e => set('shift_id', e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500">
            {shifts.map(s => <option key={s.id} value={s.id}>{s.nama}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Tipe</label>
          <select value={form.tipe} onChange={e => set('tipe', e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500">
            <option value="tetap">Karyawan Tetap</option>
            <option value="kontrak">Karyawan Kontrak</option>
            <option value="harian">Karyawan Harian</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Gender</label>
          <select value={form.gender} onChange={e => set('gender', e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500">
            <option value="pria">Pria</option>
            <option value="wanita">Wanita</option>
          </select>
        </div>
        {!initial && (
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">PIN Awal</label>
            <input value={form.pin} onChange={e => set('pin', e.target.value.replace(/\D/g, '').slice(0, 6))} type="password" inputMode="numeric" maxLength={6}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" placeholder="6 digit angka" />
          </div>
        )}
        <div className="col-span-2 flex items-center justify-between p-3 bg-gray-50 rounded-lg">
          <div>
            <p className="text-sm font-medium text-gray-700">Absensi Online</p>
            <p className="text-xs text-gray-400">Izinkan pekerja absen via app</p>
          </div>
          <Toggle checked={form.absensi_online} onChange={v => set('absensi_online', v)} />
        </div>
      </div>
      <div className="flex gap-2 pt-2">
        <button onClick={onClose} className="flex-1 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-700 hover:bg-gray-50 font-medium">Batal</button>
        <button
          onClick={() => {
            if (!form.nama.trim() || !form.no_hp.trim()) return;
            if (!/^[0-9]{10,15}$/.test(form.no_hp.trim())) { toast('Nomor HP harus 10-15 digit angka', 'warning'); return; }
            onSubmit({
              nama: form.nama.trim(),
              no_hp: form.no_hp.trim(),
              jabatan: form.jabatan.trim(),
              zona_id: form.zona_id,
              shift_id: form.shift_id,
              tipe: form.tipe as User['tipe'],
              gender: form.gender as User['gender'],
              pin: form.pin,
              absensi_online: form.absensi_online,
              status: form.status as User['status'],
            });
          }}
          className="flex-1 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium"
        >
          {initial ? 'Simpan Perubahan' : 'Tambah Pekerja'}
        </button>
      </div>
    </div>
  );
}

export default function WorkersPage() {
  const [search, setSearch] = useState('');
  const [filterZona, setFilterZona] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [page, setPage] = useState(1);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editUser, setEditUser] = useState<User | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<User | null>(null);
  const [showResetPin, setShowResetPin] = useState(false);
  const [resetTarget, setResetTarget] = useState<User | null>(null);
  const [resetPin, setResetPin] = useState('');
  const [showFaceReview, setShowFaceReview] = useState(false);
  const [faceQueue, setFaceQueue] = useState<(FaceProfile & { user_nama: string })[] | null>(null);
  const [workers, setWorkers] = useState<User[]>([]);
  const [zones, setZones] = useState<Zone[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const loadData = async () => {
    setLoading(true);
    setError(null);
    const [workersRes, zonesRes, shiftsRes] = await Promise.all([
      getWorkers(),
      getZones(),
      getShifts(),
    ]);
    if (workersRes.success) setWorkers(workersRes.data);
    else setError(workersRes.error);
    if (zonesRes.success) setZones(zonesRes.data);
    if (shiftsRes.success) setShifts(shiftsRes.data);
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  const handleSaveWorker = async (form: WorkerFormData) => {
    if (editUser) {
      const res = await updateWorker(editUser.id, {
        nama: form.nama,
        no_hp: form.no_hp,
        jabatan: form.jabatan,
        zona_id: form.zona_id,
        shift_id: form.shift_id,
        tipe: form.tipe,
        gender: form.gender,
        absensi_online: form.absensi_online,
        status: form.status,
      });
      if (!res.success) { setError(res.error); return; }
    } else {
      // FIXPLAN S3: PIN wajib dari form
      if (!/^\d{6}$/.test(form.pin)) {
        toast('PIN awal harus tepat 6 digit angka.', 'error');
        return;
      }
      const res = await createWorker({
        nama: form.nama,
        no_hp: form.no_hp,
        jabatan: form.jabatan || 'Pekerja Lapangan',
        role: 'worker',
        zona_id: form.zona_id,
        shift_id: form.shift_id,
        status: form.status,
        tipe: form.tipe,
        gender: form.gender,
        bergabung_sejak: new Date().toISOString().split('T')[0],
        absensi_online: form.absensi_online,
      }, form.pin);
      if (!res.success) { setError(res.error); return; }
    }
    setShowForm(false);
    setEditUser(null);
    loadData();
  };

  const confirmDelete = (worker: User) => {
    setDeleteTarget(worker);
    setShowDeleteConfirm(true);
  };

  // FIXPLAN audit: tombol Nonaktifkan/Aktifkan kini berfungsi
  const [toggleTarget, setToggleTarget] = useState<User | null>(null);
  const confirmToggleStatus = (worker: User) => setToggleTarget(worker);
  const handleToggleStatus = async () => {
    if (!toggleTarget) return;
    const newStatus = toggleTarget.status === 'aktif' ? 'nonaktif' : 'aktif';
    const res = await updateWorker(toggleTarget.id, { status: newStatus });
    if (!res.success) { toast(res.error, 'error'); return; }
    toast(`${toggleTarget.nama} ${newStatus === 'aktif' ? 'diaktifkan' : 'dinonaktifkan'}.`, 'success');
    setToggleTarget(null);
    loadData();
  };

  const handleResetPin = async () => {
    if (!resetTarget) return;
    const res = await resetWorkerPin(resetTarget.id, resetPin);
    if (!res.success) { toast(res.error, 'error'); return; }
    toast(`PIN ${resetTarget.nama} berhasil direset.`, 'success');
    setShowResetPin(false);
    setResetTarget(null);
    setResetPin('');
  };

  // ANTI_SPOOF B1: antrean verifikasi wajah
  const openFaceReview = async () => {
    setFaceQueue(null);
    setShowFaceReview(true);
    const res = await getPendingFaceProfiles();
    if (res.success) setFaceQueue(res.data);
    else toast(res.error, 'error');
  };

  const reviewFace = async (id: string, status: 'terverifikasi' | 'ditolak') => {
    const res = await setFaceProfileStatus(id, status);
    if (!res.success) { toast(res.error, 'error'); return; }
    setFaceQueue(prev => prev?.filter(f => f.id !== id) ?? prev);
    toast(status === 'terverifikasi' ? 'Wajah disetujui.' : 'Pendaftaran ditolak.', 'success');
  };

  const handleDeleteWorker = async () => {
    if (!deleteTarget) return;
    const res = await deleteWorker(deleteTarget.id);
    if (!res.success) { setError(res.error); return; }
    setShowDeleteConfirm(false);
    setDeleteTarget(null);
    loadData();
  };

  const filtered = useMemo(() => workers.filter(w => {
    const matchSearch = !search || w.nama.toLowerCase().includes(search.toLowerCase()) || w.no_hp.includes(search) || w.id.includes(search);
    const matchZona = !filterZona || w.zona_id === filterZona;
    const matchStatus = !filterStatus || w.status === filterStatus;
    return matchSearch && matchZona && matchStatus;
  }), [workers, search, filterZona, filterStatus]);

  const total = filtered.length;
  const totalPages = Math.ceil(total / PAGE_SIZE);
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const stats = {
    total: workers.length,
    aktif: workers.filter(w => w.status === 'aktif').length,
    nonaktif: workers.filter(w => w.status === 'nonaktif').length,
    pria: workers.filter(w => w.gender === 'pria').length,
    wanita: workers.filter(w => w.gender === 'wanita').length,
  };

  const tipeMap: Record<string, string> = { tetap: 'Tetap', kontrak: 'Kontrak', harian: 'Harian' };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <p className="text-sm text-gray-400">Memuat data pekerja...</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-5">
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
          {error}
          <button onClick={() => setError(null)} className="ml-2 underline">Tutup</button>
        </div>
      )}

      {/* Mini Stats */}
      <div className="grid grid-cols-5 gap-3">
        {statFields.map(({ label, key, color }) => (
          <div key={key} className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm text-center">
            <p className="text-2xl font-bold" style={{ color }}>{stats[key as keyof typeof stats]}</p>
            <p className="text-xs text-gray-500 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-48">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
              placeholder="Cari nama, HP, atau ID..."
              className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
          </div>
          <select value={filterZona} onChange={e => { setFilterZona(e.target.value); setPage(1); }}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500">
            <option value="">Semua Zona</option>
            {zones.map(z => <option key={z.id} value={z.id}>{z.nama}</option>)}
          </select>
          <select value={filterStatus} onChange={e => { setFilterStatus(e.target.value); setPage(1); }}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500">
            <option value="">Semua Status</option>
            <option value="aktif">Aktif</option>
            <option value="nonaktif">Nonaktif</option>
          </select>
          <button
            onClick={() => downloadCsv(
              `pekerja-${new Date().toISOString().slice(0, 10)}.csv`,
              ['Nama', 'No HP', 'Jabatan', 'Zona', 'Shift', 'Tipe', 'Gender', 'Status'],
              filtered.map(w => [
                w.nama,
                w.no_hp,
                w.jabatan,
                zones.find(z => z.id === w.zona_id)?.nama || '',
                shifts.find(s => s.id === w.shift_id)?.nama || '',
                tipeMap[w.tipe] || w.tipe,
                w.gender,
                w.status,
              ]),
            )}
            disabled={filtered.length === 0}
            className="flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-40"
          >
            <Download size={15} /> Export
          </button>
          <button onClick={openFaceReview} disabled={faceQueue !== null && faceQueue.length === 0}
            className="flex items-center gap-2 px-3 py-2 border border-purple-200 text-purple-700 hover:bg-purple-50 rounded-lg text-sm font-medium disabled:opacity-40">
            Verifikasi Wajah {faceQueue?.length ? `(${faceQueue.length})` : ''}
          </button>
          <button onClick={() => { setEditUser(null); setShowForm(true); }}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium">
            <Plus size={15} /> Tambah Pekerja
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                {['No', 'Pekerja', 'ID', 'Zona', 'No HP', 'Tipe', 'Status', 'Aksi'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {paginated.map((worker, idx) => {
                const zone = zones.find(z => z.id === worker.zona_id);
                const isExpanded = expandedId === worker.id;
                return (
                  <React.Fragment key={worker.id}>
                    <tr className={`hover:bg-gray-50/50 transition-colors cursor-pointer ${isExpanded ? 'bg-green-50/30' : ''}`}
                      onClick={() => setExpandedId(isExpanded ? null : worker.id)}>
                      <td className="px-4 py-3 text-sm text-gray-400 font-mono">{(page - 1) * PAGE_SIZE + idx + 1}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 ${worker.status === 'nonaktif' ? 'bg-gray-400' : 'bg-green-600'}`}>
                            {worker.nama.slice(0, 1)}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900">{worker.nama}</p>
                            <p className="text-xs text-gray-400">{worker.jabatan}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs font-mono text-gray-500">{worker.id.toUpperCase()}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{zone?.nama?.split(' - ')[0] || '—'}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{worker.no_hp}</td>
                      <td className="px-4 py-3">
                        <Badge variant="gray">{tipeMap[worker.tipe]}</Badge>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={getStatusBadgeVariant(worker.status)} dot>
                          {worker.status === 'aktif' ? 'Aktif' : 'Nonaktif'}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                          <button onClick={() => setExpandedId(isExpanded ? null : worker.id)} title="Detail"
                            className="p-1.5 hover:bg-blue-50 rounded-lg text-gray-400 hover:text-blue-600 transition-colors">
                            <Eye size={14} />
                          </button>
                          <button onClick={() => { setEditUser(worker); setShowForm(true); }} title="Edit"
                            className="p-1.5 hover:bg-amber-50 rounded-lg text-gray-400 hover:text-amber-600 transition-colors">
                            <Edit2 size={14} />
                          </button>
                          <button onClick={() => confirmToggleStatus(worker)} title={worker.status === 'aktif' ? 'Nonaktifkan' : 'Aktifkan'} className="p-1.5 hover:bg-gray-50 rounded-lg text-gray-400 hover:text-gray-600 transition-colors">
                            <UserX size={14} />
                          </button>
                          <button onClick={() => { setResetTarget(worker); setResetPin(''); setShowResetPin(true); }} title="Reset PIN" className="p-1.5 hover:bg-purple-50 rounded-lg text-gray-400 hover:text-purple-600 transition-colors">
                            <Key size={14} />
                          </button>
                          <button onClick={() => confirmDelete(worker)} title="Hapus" className="p-1.5 hover:bg-red-50 rounded-lg text-gray-400 hover:text-red-600 transition-colors">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr key={`${worker.id}-detail`}>
                        <td colSpan={8} className="px-4 pb-4 pt-2 bg-green-50/30">
                          <WorkerDetail worker={worker} zones={zones} shifts={shifts} onEdit={() => { setEditUser(worker); setShowForm(true); }} onResetPin={() => { setResetTarget(worker); setResetPin(''); setShowResetPin(true); }} onToggleStatus={confirmToggleStatus} />
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>

        {paginated.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-400 text-sm">Tidak ada pekerja ditemukan</p>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between">
            <p className="text-xs text-gray-500">
              Menampilkan {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} dari {total} pekerja
            </p>
            <div className="flex items-center gap-1">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-40 text-gray-500">
                <ChevronLeft size={16} />
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                <button key={p} onClick={() => setPage(p)}
                  className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${
                    page === p ? 'bg-green-600 text-white' : 'hover:bg-gray-100 text-gray-600'
                  }`}>{p}</button>
              ))}
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-40 text-gray-500">
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Form Modal */}
      <Modal isOpen={showForm} onClose={() => setShowForm(false)} title={editUser ? 'Edit Pekerja' : 'Tambah Pekerja'} size="lg">
        <WorkerForm
          onClose={() => { setShowForm(false); setEditUser(null); }}
          onSubmit={handleSaveWorker}
          initial={editUser || undefined}
          zones={zones}
          shifts={shifts}
          toast={toast}
        />
      </Modal>

      {/* Konfirmasi Nonaktifkan/Aktifkan */}
      <ConfirmDialog
        isOpen={!!toggleTarget}
        onClose={() => setToggleTarget(null)}
        onConfirm={handleToggleStatus}
        title={toggleTarget?.status === 'aktif' ? 'Nonaktifkan Pekerja' : 'Aktifkan Pekerja'}
        message={toggleTarget?.status === 'aktif'
          ? `Nonaktifkan ${toggleTarget?.nama}? Worker tidak akan bisa login/check-in.`
          : `Aktifkan kembali ${toggleTarget?.nama}?`}
        confirmLabel={toggleTarget?.status === 'aktif' ? 'Nonaktifkan' : 'Aktifkan'}
        variant={toggleTarget?.status === 'aktif' ? 'danger' : 'primary'}
      />

      {/* Antrean Verifikasi Wajah */}
      <Modal isOpen={showFaceReview} onClose={() => setShowFaceReview(false)} title="Verifikasi Wajah" size="lg">
        <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
          {faceQueue === null && <p className="text-sm text-gray-400">Memuat...</p>}
          {faceQueue?.length === 0 && <p className="text-sm text-gray-400">Tidak ada pendaftaran menunggu.</p>}
          {faceQueue?.map(fp => (
            <div key={fp.id} className="border border-gray-200 rounded-xl p-3 space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-gray-900">{fp.user_nama}</p>
                <span className="text-xs text-gray-400">{fp.images.length} foto</span>
              </div>
              <div className="flex gap-2 flex-wrap">
                {fp.images.map((im, i) => (
                  <img key={i} src={im.url} alt={`wajah-${i}`} className="w-20 h-20 object-cover rounded-lg border border-gray-200" />
                ))}
              </div>
              <div className="flex gap-2 pt-1">
                <button onClick={() => void reviewFace(fp.id, 'ditolak')}
                  className="flex-1 py-2 border border-red-200 text-red-600 hover:bg-red-50 rounded-lg text-xs font-medium">Tolak</button>
                <button onClick={() => void reviewFace(fp.id, 'terverifikasi')}
                  className="flex-1 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-xs font-medium">Setujui</button>
              </div>
            </div>
          ))}
        </div>
      </Modal>

      {/* Reset PIN Modal */}
      <Modal isOpen={showResetPin} onClose={() => { setShowResetPin(false); setResetTarget(null); }} title="Reset PIN Pekerja" size="sm">
        <div className="p-5 space-y-4">
          <p className="text-sm text-gray-700">
            PIN baru untuk <span className="font-semibold">{resetTarget?.nama}</span> ({resetTarget?.no_hp}):
          </p>
          <input
            value={resetPin}
            onChange={e => setResetPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
            type="password"
            inputMode="numeric"
            maxLength={6}
            placeholder="6 digit angka"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono tracking-widest focus:outline-none focus:ring-2 focus:ring-green-500"
          />
          <div className="flex gap-2 pt-2">
            <button onClick={() => { setShowResetPin(false); setResetTarget(null); }}
              className="flex-1 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-700 hover:bg-gray-50 font-medium">
              Batal
            </button>
            <button onClick={handleResetPin} disabled={!/^\d{6}$/.test(resetPin)}
              className="flex-1 py-2.5 bg-purple-600 hover:bg-purple-700 disabled:opacity-40 text-white rounded-lg text-sm font-medium">
              Reset PIN
            </button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal isOpen={showDeleteConfirm} onClose={() => { setShowDeleteConfirm(false); setDeleteTarget(null); }} title="Hapus Pekerja" size="sm">
        <div className="p-5 space-y-4">
          <p className="text-sm text-gray-700">
            Yakin hapus pekerja <span className="font-semibold">{deleteTarget?.nama}</span>?
          </p>
          <div className="flex gap-2 pt-2">
            <button onClick={() => { setShowDeleteConfirm(false); setDeleteTarget(null); }}
              className="flex-1 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-700 hover:bg-gray-50 font-medium">
              Batal
            </button>
            <button onClick={handleDeleteWorker}
              className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium">
              Hapus
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function WorkerDetail({ worker, zones, shifts, onEdit, onResetPin, onToggleStatus }: { worker: User; zones: Zone[]; shifts: Shift[]; onEdit: () => void; onResetPin: () => void; onToggleStatus: (w: User) => void }) {
  const zone = zones.find(z => z.id === worker.zona_id);
  const shift = shifts.find(s => s.id === worker.shift_id);
  const bergabung = new Date(worker.bergabung_sejak).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <div className="bg-white rounded-xl p-4 border border-green-100 grid grid-cols-2 md:grid-cols-4 gap-4">
      {[
        { label: 'Zona Kerja', value: zone?.nama || '—' },
        { label: 'Shift', value: shift ? `${shift.nama} (${shift.jam_mulai}–${shift.jam_selesai})` : '—' },
        { label: 'Tipe Karyawan', value: { tetap: 'Tetap', kontrak: 'Kontrak', harian: 'Harian' }[worker.tipe] },
        { label: 'Bergabung Sejak', value: bergabung },
        { label: 'Absensi Online', value: worker.absensi_online ? '✓ Aktif' : '✗ Nonaktif' },
        { label: 'Gender', value: worker.gender === 'pria' ? '♂ Pria' : '♀ Wanita' },
        { label: 'No HP', value: worker.no_hp },
        { label: 'Kehadiran Bulan Ini', value: '—' },
      ].map(({ label, value }) => (
        <div key={label}>
          <p className="text-xs text-gray-400">{label}</p>
          <p className="text-sm font-medium text-gray-800 mt-0.5">{value}</p>
        </div>
      ))}
      <div className="col-span-2 md:col-span-4 flex gap-2 pt-2 border-t border-gray-100">
        <button onClick={onEdit} className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-xs font-medium">Edit Data</button>
        <button className="px-4 py-2 border border-amber-200 hover:bg-amber-50 text-amber-700 rounded-lg text-xs font-medium" onClick={onResetPin}>Reset PIN</button>
        <button className="px-4 py-2 border border-red-200 hover:bg-red-50 text-red-600 rounded-lg text-xs font-medium" onClick={() => onToggleStatus(worker)}>
          {worker.status === 'aktif' ? 'Nonaktifkan' : 'Aktifkan'}
        </button>
      </div>
    </div>
  );
}
