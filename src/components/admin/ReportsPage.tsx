import { useState, useEffect, useMemo } from 'react';
import { Download, FileSpreadsheet } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { getMonthlyReport } from '../../services/reports.service';
import { getAttendances } from '../../services/attendance.service';
import { getZones } from '../../services/zones.service';
import type { MonthlyReport, Attendance, Zone } from '../../types';
import Badge from '../ui/Badge';
import { downloadCsv } from '../../utils/exportCsv';

export default function ReportsPage() {
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [filterZona, setFilterZona] = useState('');
  const [zones, setZones] = useState<Zone[]>([]);
  const [attendances, setAttendances] = useState<Attendance[]>([]);
  const [monthlyReport, setMonthlyReport] = useState<MonthlyReport[]>([]);

  useEffect(() => {
    const loadData = async () => {
      // FIXPLAN T3: periode + zona benar-benar dikirim ke server
      const [reportResult, attResult, zoneResult] = await Promise.all([
        getMonthlyReport(year, month, filterZona || undefined),
        getAttendances(),
        getZones(),
      ]);
      if (reportResult.success) setMonthlyReport(reportResult.data);
      if (attResult.success) setAttendances(attResult.data);
      if (zoneResult.success) setZones(zoneResult.data);
    };
    loadData();
  }, [year, month, filterZona]);

  /** FIXPLAN B05/T5: ringkasan diturunkan dari data yang sama — tanpa angka palsu. */
  const summary = useMemo(() => ({
    totalHadir: monthlyReport.reduce((a, r) => a + r.hadir, 0),
    avgKehadiran: monthlyReport.length > 0
      ? Math.round(monthlyReport.reduce((a, r) => a + r.persentase_kehadiran, 0) / monthlyReport.length)
      : 0,
    totalTerlambat: monthlyReport.reduce((a, r) => a + r.terlambat, 0),
    totalAbsen: monthlyReport.reduce((a, r) => a + r.absen, 0),
  }), [monthlyReport]);

  const exportRekap = () => downloadCsv(
    `rekap-${year}-${String(month).padStart(2, '0')}.csv`,
    ['No', 'Nama', 'Zona', 'Hadir', 'Terlambat', 'Izin', 'Absen', 'Libur', 'Total HK', '% Kehadiran'],
    monthlyReport.map((r, i) => [i + 1, r.nama, r.zona, r.hadir, r.terlambat, r.izin, r.absen, r.libur, r.total_hari_kerja, r.persentase_kehadiran]),
  );

  const zoneBarData = (() => {
    const zoneMap = new Map(zones.map(z => [z.id, z.nama]));
    const zoneStats = new Map<string, { hadir: number; terlambat: number; absen: number; total: number }>();

    for (const att of attendances) {
      const zonaName = zoneMap.get(att.zona_id) || '—';
      if (!zoneStats.has(zonaName)) zoneStats.set(zonaName, { hadir: 0, terlambat: 0, absen: 0, total: 0 });
      const s = zoneStats.get(zonaName)!;
      s.total++;
      if (att.status === 'hadir') s.hadir++;
      else if (att.status === 'terlambat') s.terlambat++;
      else if (att.status === 'absen') s.absen++;
    }

    return Array.from(zoneStats.entries()).map(([zona, s]) => ({
      zona: zonaNameSplit(zona),
      hadir: s.total > 0 ? Math.round((s.hadir / s.total) * 100) : 0,
      terlambat: s.total > 0 ? Math.round((s.terlambat / s.total) * 100) : 0,
      absen: s.total > 0 ? Math.round((s.absen / s.total) * 100) : 0,
    }));
  })();

  function zonaNameSplit(nama: string): string {
    return nama.split(' - ')[0] || nama;
  }

  const months = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];

  const getKinerjaBadge = (pct: number) => {
    if (pct >= 95) return { variant: 'green' as const, label: 'Sangat Baik' };
    if (pct >= 85) return { variant: 'blue' as const, label: 'Baik' };
    if (pct >= 75) return { variant: 'amber' as const, label: 'Cukup' };
    return { variant: 'red' as const, label: 'Perlu Perhatian' };
  };

  return (
    <div className="p-6 space-y-6">
      {/* Filter Bar */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
        <div className="flex flex-wrap gap-3 items-center">
          <div className="flex items-center gap-2">
            <select value={month} onChange={e => setMonth(Number(e.target.value))}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500">
              {months.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
            </select>
            <select value={year} onChange={e => setYear(Number(e.target.value))}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500">
              {[2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
            </select>
            <select value={filterZona} onChange={e => setFilterZona(e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500">
              <option value="">Semua Zona</option>
              {zones.map(z => <option key={z.id} value={z.id}>{z.nama}</option>)}
            </select>
          </div>
          <div className="flex gap-2 ml-auto">
            <button onClick={exportRekap} disabled={monthlyReport.length === 0}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white rounded-lg text-sm font-medium">
              <FileSpreadsheet size={15} /> Export CSV
            </button>
          </div>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Hari Hadir', value: summary.totalHadir, icon: '📅', color: '#16A34A' },
          { label: 'Rata-rata Kehadiran', value: `${summary.avgKehadiran}%`, icon: '📊', color: '#2563EB' },
          { label: 'Total Terlambat', value: summary.totalTerlambat, icon: '⏰', color: '#D97706' },
          { label: 'Total Absen', value: summary.totalAbsen, icon: '❌', color: '#DC2626' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
            <span className="text-2xl">{s.icon}</span>
            <p className="text-2xl font-bold mt-2" style={{ color: s.color }}>{s.value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Zone Bar Chart */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
        <h3 className="font-semibold text-gray-900 text-sm mb-4">Perbandingan Kehadiran Antar Zona (%)</h3>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={zoneBarData} barSize={20} barGap={4}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
            <XAxis dataKey="zona" tick={{ fontSize: 12, fill: '#6B7280' }} axisLine={false} tickLine={false} />
            <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: '#6B7280' }} axisLine={false} tickLine={false} tickFormatter={v => `${v}%`} />
            <Tooltip formatter={(v, n) => [`${v}%`, n]} contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 12 }} />
            <Legend iconType="circle" iconSize={8} formatter={(v) => <span className="text-xs text-gray-600">{v}</span>} />
            <Bar dataKey="hadir" name="Hadir" fill="#16A34A" radius={[4, 4, 0, 0]} />
            <Bar dataKey="terlambat" name="Terlambat" fill="#D97706" radius={[4, 4, 0, 0]} />
            <Bar dataKey="absen" name="Absen" fill="#DC2626" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Monthly Report Table */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="font-semibold text-gray-900 text-sm">
            Rekap Kehadiran — {months[month - 1]} {year}
          </h3>
          <button onClick={exportRekap} disabled={monthlyReport.length === 0}
            className="flex items-center gap-2 text-xs text-gray-500 hover:text-gray-700 disabled:opacity-40">
            <Download size={13} /> Download CSV
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                {['No', 'Nama', 'Zona', 'Hadir', 'Terlambat', 'Izin', 'Absen', 'Libur', 'Total HK', '% Kehadiran', 'Kinerja'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {monthlyReport.map((rec, idx) => {
                const kinerja = getKinerjaBadge(rec.persentase_kehadiran);
                return (
                  <tr key={rec.user_id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-4 py-3 text-sm text-gray-400 font-mono">{idx + 1}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 bg-green-600 rounded-full flex items-center justify-center text-white text-xs font-bold">{rec.nama.slice(0, 1)}</div>
                        <span className="text-sm font-medium text-gray-900">{rec.nama}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{rec.zona}</td>
                    <td className="px-4 py-3 text-sm font-semibold text-green-600">{rec.hadir}</td>
                    <td className="px-4 py-3 text-sm font-semibold text-amber-600">{rec.terlambat}</td>
                    <td className="px-4 py-3 text-sm font-semibold text-blue-600">{rec.izin}</td>
                    <td className="px-4 py-3 text-sm font-semibold text-red-600">{rec.absen}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">{rec.libur}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{rec.total_hari_kerja}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 bg-gray-100 rounded-full max-w-16">
                          <div className={`h-full rounded-full ${
                            rec.persentase_kehadiran >= 95 ? 'bg-green-500' :
                            rec.persentase_kehadiran >= 85 ? 'bg-blue-500' :
                            rec.persentase_kehadiran >= 75 ? 'bg-amber-500' : 'bg-red-500'
                          }`} style={{ width: `${rec.persentase_kehadiran}%` }} />
                        </div>
                        <span className="text-sm font-bold text-gray-700">{rec.persentase_kehadiran}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={kinerja.variant}>{kinerja.label}</Badge>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="bg-gray-50 border-t border-gray-200">
                <td colSpan={3} className="px-4 py-3 text-xs font-semibold text-gray-700 uppercase">Total / Rata-rata</td>
                <td className="px-4 py-3 text-sm font-bold text-green-600">{summary.totalHadir}</td>
                <td className="px-4 py-3 text-sm font-bold text-amber-600">{summary.totalTerlambat}</td>
                <td className="px-4 py-3 text-sm font-bold text-blue-600">{monthlyReport.reduce((a, r) => a + r.izin, 0)}</td>
                <td className="px-4 py-3 text-sm font-bold text-red-600">{summary.totalAbsen}</td>
                <td colSpan={2} />
                <td className="px-4 py-3 text-sm font-bold text-gray-700">{summary.avgKehadiran}%</td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}
