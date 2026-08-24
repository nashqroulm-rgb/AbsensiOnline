import { useEffect, useState } from 'react';
import { Save } from 'lucide-react';
import { getAppSettings, updateAppSettings } from '../../services/settings.service';
import { invalidateAppSettingsCache } from '../../hooks/useAppSettings';
import type { AppSettings } from '../../types';
import { DEFAULT_APP_SETTINGS } from '../../types';
import { useToast } from '../ui/Toast';

// FIXPLAN T7 — halaman settings nyata di atas tabel app_settings (migrasi 009).

const NUM_FIELDS: { key: keyof AppSettings; label: string; hint: string; min: number; max: number }[] = [
  { key: 'default_zone_radius_m', label: 'Radius Zona Default (m)', hint: '1 – 10.000', min: 1, max: 10000 },
  { key: 'default_shift_tolerance_min', label: 'Toleransi Shift Default (menit)', hint: '0 – 120', min: 0, max: 120 },
  { key: 'max_file_size_mb', label: 'Ukuran File Maksimal (MB)', hint: '1 – 50', min: 1, max: 50 },
  { key: 'max_attachments_per_day', label: 'Maks Lampiran / Hari', hint: '1 – 50', min: 1, max: 50 },
  { key: 'max_photos_per_day', label: 'Maks Foto / Hari', hint: '0 – 50', min: 0, max: 50 },
  { key: 'max_docs_per_day', label: 'Maks Dokumen / Hari', hint: '0 – 50', min: 0, max: 50 },
  { key: 'gps_timeout_ms', label: 'Timeout GPS (ms)', hint: '3.000 – 60.000', min: 3000, max: 60000 },
];

export default function SettingsPage() {
  const { toast } = useToast();
  const [form, setForm] = useState<AppSettings>(DEFAULT_APP_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getAppSettings().then(res => {
      if (res.success) setForm(res.data);
      else setError(res.error);
      setLoading(false);
    });
  }, []);

  const set = (k: keyof AppSettings, v: string | number) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    const res = await updateAppSettings({
      company_name: form.company_name,
      default_zone_radius_m: Number(form.default_zone_radius_m),
      default_shift_tolerance_min: Number(form.default_shift_tolerance_min),
      max_file_size_mb: Number(form.max_file_size_mb),
      max_attachments_per_day: Number(form.max_attachments_per_day),
      max_photos_per_day: Number(form.max_photos_per_day),
      max_docs_per_day: Number(form.max_docs_per_day),
      gps_timeout_ms: Number(form.gps_timeout_ms),
    });
    setSaving(false);
    if (!res.success) { setError(res.error); return; }
    invalidateAppSettingsCache();
    toast('Pengaturan tersimpan.', 'success');
  };

  if (loading) {
    return <div className="p-6 text-sm text-gray-400">Memuat pengaturan...</div>;
  }

  return (
    <div className="p-6 space-y-5 max-w-2xl">
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-4">
        <h3 className="font-semibold text-gray-900 text-sm">Umum</h3>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Nama Perusahaan</label>
          <input value={form.company_name} onChange={e => set('company_name', e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Zona Waktu</label>
          <input value={form.timezone} disabled
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-gray-50 text-gray-500" />
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-4">
        <h3 className="font-semibold text-gray-900 text-sm">Aturan Absensi &amp; Lampiran</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {NUM_FIELDS.map(f => (
            <div key={String(f.key)}>
              <label className="block text-xs font-medium text-gray-700 mb-1">{f.label}</label>
              <input type="number" min={f.min} max={f.max} value={Number(form[f.key])}
                onChange={e => set(f.key, e.target.value === '' ? '' : Number(e.target.value))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
              <p className="text-xs text-gray-400 mt-0.5">{f.hint}</p>
            </div>
          ))}
        </div>
      </div>

      <button onClick={handleSave} disabled={saving}
        className="flex items-center gap-2 px-5 py-2.5 bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white rounded-lg text-sm font-medium">
        <Save size={15} /> {saving ? 'Menyimpan...' : 'Simpan Pengaturan'}
      </button>
    </div>
  );
}
