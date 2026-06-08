import { useState, useRef, useEffect, useCallback } from 'react';
import { Plus, Edit2, Trash2, MapPin } from 'lucide-react';
import type { Zone } from '../../types';
import { getZones, createZone, updateZone, deleteZone } from '../../services/zones.service';
import Badge from '../ui/Badge';
import Modal from '../ui/Modal';

function ZoneMap({ zones, selectedZone, onSelectZone }: { zones: Zone[]; selectedZone: Zone | null; onSelectZone: (z: Zone) => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || zones.length === 0) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const W = canvas.width;
    const H = canvas.height;
    ctx.clearRect(0, 0, W, H);

    // Background
    const bgGrad = ctx.createLinearGradient(0, 0, W, H);
    bgGrad.addColorStop(0, '#e8f5e9');
    bgGrad.addColorStop(1, '#e3f2fd');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, W, H);

    // Grid
    ctx.strokeStyle = 'rgba(0,0,0,0.05)';
    ctx.lineWidth = 1;
    for (let x = 0; x < W; x += 30) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
    for (let y = 0; y < H; y += 30) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }

    const activeZones = zones.filter(z => z.status === 'aktif');
    if (activeZones.length === 0) return;

    const lats = activeZones.map(z => z.latitude);
    const lngs = activeZones.map(z => z.longitude);
    const minLat = Math.min(...lats), maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs), maxLng = Math.max(...lngs);

    const padding = 60;
    const latRange = maxLat - minLat || 0.002;
    const lngRange = maxLng - minLng || 0.002;

    const toX = (lng: number) => padding + ((lng - minLng) / lngRange) * (W - 2 * padding);
    const toY = (lat: number) => H - padding - ((lat - minLat) / latRange) * (H - 2 * padding);
    const toR = (r: number) => r / 111320 / latRange * (H - 2 * padding);

    activeZones.forEach(zone => {
      const cx = toX(zone.longitude);
      const cy = toY(zone.latitude);
      const r = Math.max(20, Math.min(toR(zone.radius_meter), 80));
      const isSelected = selectedZone?.id === zone.id;
      const color = zone.color || '#16A34A';

      // Outer glow
      if (isSelected) {
        ctx.shadowColor = color;
        ctx.shadowBlur = 15;
      }

      // Fill
      const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
      grad.addColorStop(0, `${color}30`);
      grad.addColorStop(1, `${color}10`);
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      // Border
      ctx.strokeStyle = color;
      ctx.lineWidth = isSelected ? 2.5 : 1.5;
      ctx.setLineDash(isSelected ? [] : [5, 4]);
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);

      // Center dot
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(cx, cy, isSelected ? 6 : 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'white';
      ctx.beginPath();
      ctx.arc(cx, cy, isSelected ? 2.5 : 1.5, 0, Math.PI * 2);
      ctx.fill();

      // Label
      ctx.fillStyle = '#111827';
      ctx.font = `${isSelected ? 'bold ' : ''}11px -apple-system, sans-serif`;
      ctx.textAlign = 'center';
      const label = zone.nama.split(' - ')[0];
      ctx.fillText(label, cx, cy - r - 6);

      // Radius label
      ctx.fillStyle = color;
      ctx.font = '9px sans-serif';
      ctx.fillText(`${zone.radius_meter}m`, cx, cy + r + 12);
    });

    // Legend
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    ctx.fillRect(8, H - 28, 90, 22);
    ctx.fillStyle = '#6B7280';
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('Klik zona untuk detail', 12, H - 13);
  }, [zones, selectedZone]);

  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const clickX = (e.clientX - rect.left) * scaleX;
    const clickY = (e.clientY - rect.top) * scaleY;

    const W = canvas.width, H = canvas.height;
    const activeZones = zones.filter(z => z.status === 'aktif');
    const lats = activeZones.map(z => z.latitude);
    const lngs = activeZones.map(z => z.longitude);
    const minLat = Math.min(...lats), maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs), maxLng = Math.max(...lngs);
    const padding = 60;
    const latRange = maxLat - minLat || 0.002;
    const lngRange = maxLng - minLng || 0.002;
    const toX = (lng: number) => padding + ((lng - minLng) / lngRange) * (W - 2 * padding);
    const toY = (lat: number) => H - padding - ((lat - minLat) / latRange) * (H - 2 * padding);
    const toR = (r: number) => r / 111320 / latRange * (H - 2 * padding);

    for (const zone of activeZones) {
      const cx = toX(zone.longitude);
      const cy = toY(zone.latitude);
      const r = Math.max(20, Math.min(toR(zone.radius_meter), 80));
      const dist = Math.sqrt((clickX - cx) ** 2 + (clickY - cy) ** 2);
      if (dist <= r) { onSelectZone(zone); return; }
    }
  };

  return (
    <canvas ref={canvasRef} width={800} height={400} className="w-full rounded-xl cursor-pointer"
      onClick={handleClick} style={{ border: '1px solid rgba(0,0,0,0.08)' }} />
  );
}

const ZONE_COLORS = ['#16A34A', '#2563EB', '#D97706', '#7C3AED', '#DC2626', '#0891B2'];

function ZoneForm({
  onClose,
  onSubmit,
  initial,
}: {
  onClose: () => void;
  onSubmit: (zone: Omit<Zone, 'id'> & { id?: string }) => void;
  initial?: Partial<Zone>;
}) {
  const [form, setForm] = useState({
    nama: initial?.nama || '',
    deskripsi: initial?.deskripsi || '',
    latitude: initial?.latitude?.toString() || '-6.2088',
    longitude: initial?.longitude?.toString() || '106.8456',
    radius_meter: initial?.radius_meter?.toString() || '150',
    status: initial?.status || 'aktif',
  });
  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  return (
    <div className="p-5 space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <label className="block text-xs font-medium text-gray-700 mb-1">Nama Zona *</label>
          <input value={form.nama} onChange={e => set('nama', e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" placeholder="Nama zona" />
        </div>
        <div className="col-span-2">
          <label className="block text-xs font-medium text-gray-700 mb-1">Deskripsi</label>
          <input value={form.deskripsi} onChange={e => set('deskripsi', e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" placeholder="Deskripsi zona" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Latitude</label>
          <input value={form.latitude} onChange={e => set('latitude', e.target.value)} type="number" step="0.0001"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Longitude</label>
          <input value={form.longitude} onChange={e => set('longitude', e.target.value)} type="number" step="0.0001"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Radius (meter)</label>
          <input value={form.radius_meter} onChange={e => set('radius_meter', e.target.value)} type="number" min="10" max="1000"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Status</label>
          <select value={form.status} onChange={e => set('status', e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500">
            <option value="aktif">Aktif</option>
            <option value="nonaktif">Nonaktif</option>
          </select>
        </div>
        <div className="col-span-2 p-3 bg-blue-50 rounded-lg text-xs text-blue-700">
          💡 Tip: Pin lokasi pada peta interaktif untuk mengisi koordinat secara otomatis (fitur di versi produksi)
        </div>
      </div>
      <div className="flex gap-2 pt-2">
        <button onClick={onClose} className="flex-1 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-700 hover:bg-gray-50 font-medium">Batal</button>
        <button
          onClick={() => {
            if (!form.nama.trim()) return;
            const lat = parseFloat(form.latitude);
            const lng = parseFloat(form.longitude);
            const radius = parseInt(form.radius_meter, 10);
            if (isNaN(lat) || lat < -90 || lat > 90) { alert('Latitude harus antara -90 dan 90'); return; }
            if (isNaN(lng) || lng < -180 || lng > 180) { alert('Longitude harus antara -180 dan 180'); return; }
            if (isNaN(radius) || radius <= 0 || radius > 10000) { alert('Radius harus antara 1 dan 10.000 meter'); return; }
            onSubmit({
              id: initial?.id,
              nama: form.nama.trim(),
              deskripsi: form.deskripsi.trim(),
              latitude: lat,
              longitude: lng,
              radius_meter: radius,
              status: form.status as Zone['status'],
              color: initial?.color || ZONE_COLORS[Math.floor(Math.random() * ZONE_COLORS.length)],
            });
          }}
          className="flex-1 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium"
        >
          {initial ? 'Simpan Perubahan' : 'Tambah Zona'}
        </button>
      </div>
    </div>
  );
}

export default function ZonesPage() {
  const [zones, setZones] = useState<Zone[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedZone, setSelectedZone] = useState<Zone | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editZone, setEditZone] = useState<Zone | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Zone | null>(null);

  const loadZones = useCallback(async () => {
    setLoading(true);
    setError(null);
    const result = await getZones();
    if (result.success) setZones(result.data);
    else setError(result.error);
    setLoading(false);
  }, []);

  useEffect(() => { loadZones(); }, [loadZones]);

  const handleSaveZone = async (payload: Omit<Zone, 'id'> & { id?: string }) => {
    const result = payload.id
      ? await updateZone(payload.id, payload)
      : await createZone(payload);
    if (result.success) {
      await loadZones();
      setShowForm(false);
      setEditZone(null);
    } else {
      alert(result.error);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    const result = await deleteZone(deleteTarget.id);
    if (result.success) {
      setDeleteTarget(null);
      setSelectedZone(null);
      await loadZones();
    } else {
      alert(result.error);
    }
  };

  return (
    <div className="p-6 space-y-5">
      {/* Map */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900">
            Peta Zona Kerja
            {loading && <span className="ml-2 text-xs text-gray-400">Memuat...</span>}
          </h3>
          <div className="flex gap-2 flex-wrap">
            {zones.filter(z => z.status === 'aktif').map(z => (
              <button key={z.id} onClick={() => setSelectedZone(selectedZone?.id === z.id ? null : z)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors border ${
                  selectedZone?.id === z.id ? 'text-white border-transparent' : 'bg-white border-gray-200 text-gray-600'
                }`} style={selectedZone?.id === z.id ? { background: z.color, borderColor: z.color } : {}}>
                <span className="w-2 h-2 rounded-full" style={{ background: z.color }} />
                {z.nama.split(' - ')[0]}
              </button>
            ))}
          </div>
        </div>
        <ZoneMap zones={zones} selectedZone={selectedZone} onSelectZone={(z) => setSelectedZone(z)} />
        {selectedZone && (
          <div className="mt-3 p-3 bg-gray-50 rounded-lg flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full" style={{ background: selectedZone.color }} />
              <div>
                <p className="text-sm font-medium text-gray-900">{selectedZone.nama}</p>
                <p className="text-xs text-gray-500">{selectedZone.deskripsi} · Radius: {selectedZone.radius_meter}m</p>
              </div>
            </div>
            <button onClick={() => setSelectedZone(null)} className="text-xs text-gray-400 hover:text-gray-600">✕</button>
          </div>
        )}
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-gray-900">Daftar Zona ({zones.length})</h2>
        <button onClick={() => { setEditZone(null); setShowForm(true); }}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium">
          <Plus size={15} /> Tambah Zona
        </button>
      </div>

      {error && <div className="p-3 bg-red-50 text-red-700 text-sm rounded-lg">{error}</div>}

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                {['Zona', 'Deskripsi', 'Koordinat', 'Radius', 'Status', 'Aksi'].map(h => (
                  <th key={h} className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {zones.map(zone => (
                <tr key={zone.id}
                  onClick={() => setSelectedZone(selectedZone?.id === zone.id ? null : zone)}
                  className={`hover:bg-gray-50/50 transition-colors cursor-pointer ${selectedZone?.id === zone.id ? 'bg-green-50/30' : ''}`}>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: zone.color }} />
                      <div className="flex items-center gap-2">
                        <MapPin size={14} className="text-gray-400" />
                        <span className="font-medium text-gray-900 text-sm">{zone.nama}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-sm text-gray-600 max-w-[200px] truncate">{zone.deskripsi}</td>
                  <td className="px-5 py-3 text-xs font-mono text-gray-500">
                    {zone.latitude.toFixed(4)}, {zone.longitude.toFixed(4)}
                  </td>
                  <td className="px-5 py-3 text-sm text-gray-700 font-medium">{zone.radius_meter}m</td>
                  <td className="px-5 py-3">
                    <Badge variant={zone.status === 'aktif' ? 'green' : 'gray'} dot>
                      {zone.status === 'aktif' ? 'Aktif' : 'Nonaktif'}
                    </Badge>
                  </td>
                  <td className="px-5 py-3" onClick={e => e.stopPropagation()}>
                    <div className="flex items-center gap-1">
                      <button onClick={() => { setEditZone(zone); setShowForm(true); }}
                        className="p-1.5 hover:bg-amber-50 rounded-lg text-gray-400 hover:text-amber-600 transition-colors">
                        <Edit2 size={14} />
                      </button>
                      <button onClick={() => setDeleteTarget(zone)}
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

      <Modal isOpen={showForm} onClose={() => setShowForm(false)} title={editZone ? 'Edit Zona' : 'Tambah Zona'} size="lg">
        <ZoneForm
          onClose={() => { setShowForm(false); setEditZone(null); }}
          onSubmit={handleSaveZone}
          initial={editZone || undefined}
        />
      </Modal>

      <Modal isOpen={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Hapus Zona" size="sm">
        <div className="p-5 space-y-4">
          <p className="text-sm text-gray-700">Yakin hapus zona <strong>{deleteTarget?.nama}</strong>?</p>
          <div className="flex gap-2">
            <button onClick={() => setDeleteTarget(null)} className="flex-1 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-700 hover:bg-gray-50 font-medium">Batal</button>
            <button onClick={handleDelete} className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium">Hapus</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
