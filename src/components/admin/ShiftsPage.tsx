import { useState, useEffect, useCallback } from 'react';
import { Plus, Edit2, Trash2 } from 'lucide-react';
import type { Shift } from '../../types';
import { getShifts, createShift, updateShift, deleteShift } from '../../services/shifts.service';
import Badge from '../ui/Badge';
import Modal from '../ui/Modal';
import { useToast } from '../ui/Toast';

function ShiftForm({
  onClose,
  onSubmit,
  initial,
  toast,
}: {
  onClose: () => void;
  onSubmit: (shift: Omit<Shift, 'id'> & { id?: string }) => void;
  initial?: Partial<Shift>;
  toast: (msg: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
}) {
  const [form, setForm] = useState({
    nama: initial?.nama || '',
    jam_mulai: initial?.jam_mulai || '07:00',
    jam_selesai: initial?.jam_selesai || '15:00',
    toleransi_menit: initial?.toleransi_menit?.toString() || '15',
    ikon: initial?.ikon || '🌅',
    status: initial?.status || 'aktif',
    hari_kerja: initial?.hari_kerja || ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat'],
  });

  const hariOptions = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'];
  const ikonOptions = ['🌅', '☀️', '🌙', '🏢', '⭐', '🔆'];

  const toggleHari = (hari: string) => {
    setForm(f => ({
      ...f,
      hari_kerja: f.hari_kerja.includes(hari) ? f.hari_kerja.filter(h => h !== hari) : [...f.hari_kerja, hari]
    }));
  };

  const calcJamKerja = () => {
    const [sh, sm] = form.jam_mulai.split(':').map(Number);
    const [eh, em] = form.jam_selesai.split(':').map(Number);
    let diff = (eh * 60 + em) - (sh * 60 + sm);
    if (diff < 0) diff += 24 * 60;
    return `${Math.floor(diff / 60)}j ${diff % 60}m`;
  };

  return (
    <div className="p-5 space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <label className="block text-xs font-medium text-gray-700 mb-1">Nama Shift *</label>
          <input value={form.nama} onChange={e => setForm(f => ({ ...f, nama: e.target.value }))}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" placeholder="Nama shift" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Jam Mulai</label>
          <input type="time" value={form.jam_mulai} onChange={e => setForm(f => ({ ...f, jam_mulai: e.target.value }))}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Jam Selesai</label>
          <input type="time" value={form.jam_selesai} onChange={e => setForm(f => ({ ...f, jam_selesai: e.target.value }))}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Toleransi (menit)</label>
          <input type="number" value={form.toleransi_menit} onChange={e => setForm(f => ({ ...f, toleransi_menit: e.target.value }))} min="0" max="60"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Ikon</label>
          <div className="flex gap-2 flex-wrap">
            {ikonOptions.map(ikon => (
              <button key={ikon} onClick={() => setForm(f => ({ ...f, ikon }))}
                className={`w-9 h-9 rounded-lg text-xl flex items-center justify-center transition-colors ${form.ikon === ikon ? 'bg-green-100 ring-2 ring-green-500' : 'bg-gray-50 hover:bg-gray-100'}`}>
                {ikon}
              </button>
            ))}
          </div>
        </div>
        <div className="col-span-2">
          <label className="block text-xs font-medium text-gray-700 mb-2">Hari Kerja</label>
          <div className="flex gap-2 flex-wrap">
            {hariOptions.map(hari => (
              <button key={hari} onClick={() => toggleHari(hari)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                  form.hari_kerja.includes(hari) ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}>{hari.slice(0, 3)}</button>
            ))}
          </div>
        </div>
        <div className="col-span-2 p-3 bg-blue-50 rounded-lg text-sm text-blue-700">
          <span className="font-medium">Total jam kerja: </span>{calcJamKerja()}
        </div>
      </div>
      <div className="flex gap-2 pt-2">
        <button onClick={onClose} className="flex-1 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-700 hover:bg-gray-50 font-medium">Batal</button>
        <button
          onClick={() => {
            if (!form.nama.trim()) return;
            const toleransi = parseInt(form.toleransi_menit, 10);
            if (isNaN(toleransi) || toleransi < 0 || toleransi > 120) { toast('Toleransi harus antara 0 dan 120 menit', 'warning'); return; }
            onSubmit({
              id: initial?.id,
              nama: form.nama.trim(),
              jam_mulai: form.jam_mulai,
              jam_selesai: form.jam_selesai,
              toleransi_menit: toleransi,
              ikon: form.ikon,
              status: form.status as Shift['status'],
              hari_kerja: form.hari_kerja,
            });
          }}
          className="flex-1 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium"
        >
          {initial ? 'Simpan Perubahan' : 'Tambah Shift'}
        </button>
      </div>
    </div>
  );
}

export default function ShiftsPage() {
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editShift, setEditShift] = useState<Shift | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Shift | null>(null);
  const { toast } = useToast();

  const loadShifts = useCallback(async () => {
    setLoading(true);
    setError(null);
    const result = await getShifts();
    if (result.success) setShifts(result.data);
    else setError(result.error);
    setLoading(false);
  }, []);

  useEffect(() => { loadShifts(); }, [loadShifts]);

  const handleSaveShift = async (payload: Omit<Shift, 'id'> & { id?: string }) => {
    const { id, ...shiftData } = payload;
    const result = id
      ? await updateShift(id, shiftData)
      : await createShift(shiftData);
    if (result.success) {
      await loadShifts();
      setShowForm(false);
      setEditShift(null);
    } else {
      toast(result.error, 'error');
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    const result = await deleteShift(deleteTarget.id);
    if (result.success) {
      setDeleteTarget(null);
      await loadShifts();
    } else {
      toast(result.error, 'error');
    }
  };

  const calcHours = (start: string, end: string) => {
    const [sh, sm] = start.split(':').map(Number);
    const [eh, em] = end.split(':').map(Number);
    let diff = (eh * 60 + em) - (sh * 60 + sm);
    if (diff < 0) diff += 24 * 60;
    return `${Math.floor(diff / 60)}j ${diff % 60}m`;
  };

  return (
    <div className="p-6 space-y-5">
      {/* Pengaturan Umum */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { label: 'Hari Kerja', value: 'Senin – Jumat', sub: '5 hari/minggu', icon: '📅' },
          { label: 'Jam Kerja Standar', value: '8 jam/hari', sub: 'Sesuai regulasi', icon: '⏱️' },
          { label: 'Jam Istirahat', value: '1 jam/hari', sub: '12:00 – 13:00', icon: '☕' },
        ].map(card => (
          <div key={card.label} className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm flex items-center gap-3">
            <span className="text-2xl">{card.icon}</span>
            <div>
              <p className="text-xs text-gray-500">{card.label}</p>
              <p className="font-semibold text-gray-900 text-sm">{card.value}</p>
              <p className="text-xs text-gray-400">{card.sub}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-gray-900">
          Daftar Shift ({shifts.length})
          {loading && <span className="ml-2 text-xs text-gray-400">Memuat...</span>}
        </h2>
        <button onClick={() => { setEditShift(null); setShowForm(true); }}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium">
          <Plus size={15} /> Tambah Shift
        </button>
      </div>

      {error && <div className="p-3 bg-red-50 text-red-700 text-sm rounded-lg">{error}</div>}

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                {['Shift', 'Waktu', 'Jam Kerja', 'Toleransi', 'Hari Kerja', 'Status', 'Aksi'].map(h => (
                  <th key={h} className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {shifts.map(shift => (
                <tr key={shift.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 bg-gray-50 rounded-xl flex items-center justify-center text-xl">{shift.ikon}</div>
                      <span className="font-medium text-gray-900 text-sm">{shift.nama}</span>
                    </div>
                  </td>
                  <td className="px-5 py-4 text-sm text-gray-700 font-mono">{shift.jam_mulai} – {shift.jam_selesai}</td>
                  <td className="px-5 py-4 text-sm text-gray-600">{calcHours(shift.jam_mulai, shift.jam_selesai)}</td>
                  <td className="px-5 py-4 text-sm text-gray-600">{shift.toleransi_menit} menit</td>
                  <td className="px-5 py-4">
                    <div className="flex gap-1 flex-wrap max-w-[200px]">
                      {['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'].map((d, i) => {
                        const days = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'];
                        const active = shift.hari_kerja.includes(days[i]);
                        return (
                          <span key={d} className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400'}`}>{d}</span>
                        );
                      })}
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <Badge variant={shift.status === 'aktif' ? 'green' : 'gray'} dot>
                      {shift.status === 'aktif' ? 'Aktif' : 'Nonaktif'}
                    </Badge>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-1">
                      <button onClick={() => { setEditShift(shift); setShowForm(true); }}
                        className="p-1.5 hover:bg-amber-50 rounded-lg text-gray-400 hover:text-amber-600 transition-colors">
                        <Edit2 size={14} />
                      </button>
                      <button onClick={() => setDeleteTarget(shift)}
                        className="p-1.5 hover:bg-red-50 rounded-lg text-gray-400 hover:text-red-600 transition-colors">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Modal isOpen={showForm} onClose={() => setShowForm(false)} title={editShift ? 'Edit Shift' : 'Tambah Shift'} size="lg">
        <ShiftForm
          onClose={() => { setShowForm(false); setEditShift(null); }}
          onSubmit={handleSaveShift}
          initial={editShift || undefined}
          toast={toast}
        />
      </Modal>

      <Modal isOpen={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Hapus Shift" size="sm">
        <div className="p-5 space-y-4">
          <p className="text-sm text-gray-700">Yakin hapus shift <strong>{deleteTarget?.nama}</strong>?</p>
          <div className="flex gap-2">
            <button onClick={() => setDeleteTarget(null)} className="flex-1 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-700 hover:bg-gray-50 font-medium">Batal</button>
            <button onClick={handleDelete} className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium">Hapus</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
