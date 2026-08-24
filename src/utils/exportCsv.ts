// FIXPLAN T4 — Export CSV client-side. Separator ';' agar Excel-ID langsung
// membaca kolom; BOM agar karakter non-ASCII aman.

export function downloadCsv(
  filename: string,
  headers: string[],
  rows: (string | number | null)[][],
): void {
  const esc = (v: string | number | null) => {
    const s = v == null ? '' : String(v);
    return /[",;\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = [headers.map(esc).join(';'), ...rows.map(r => r.map(esc).join(';'))].join('\r\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}
