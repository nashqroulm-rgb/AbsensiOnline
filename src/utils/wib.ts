// FIXPLAN U1 — Satu sumber kebenaran tanggal/waktu Asia/Jakarta (WIB, UTC+7).
// Tanpa dependency; semua boundary tanggal aplikasi wajib lewat sini.

const WIB_OFFSET_MS = 7 * 60 * 60 * 1000;

interface WibParts { y: number; m: number; d: number; dow: number }

function wibParts(input: string | Date): WibParts {
  const d = typeof input === 'string' ? new Date(input) : input;
  const s = new Date(d.getTime() + WIB_OFFSET_MS);
  return { y: s.getUTCFullYear(), m: s.getUTCMonth() + 1, d: s.getUTCDate(), dow: s.getUTCDay() };
}

/** 'YYYY-MM-DD' menurut kalender WIB. */
export function wibDateOf(input: string | Date): string {
  const p = wibParts(input);
  return `${p.y}-${String(p.m).padStart(2, '0')}-${String(p.d).padStart(2, '0')}`;
}

/** Tanggal hari ini di WIB, 'YYYY-MM-DD'. */
export function wibToday(): string {
  return wibDateOf(new Date());
}

const DAY_SHORT = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'] as const;

/** Nama hari pendek (Min/Sen/../Sab) menurut WIB — kanonik utk shifts.hari_kerja. */
export function wibDayName(input: string | Date): string {
  return DAY_SHORT[wibParts(input).dow];
}

/** Rentang UTC [start, end) untuk satu tanggal kalender WIB 'YYYY-MM-DD'. */
export function wibDayRange(dateStr: string): { start: string; end: string } {
  const startMs = Date.parse(`${dateStr}T00:00:00+07:00`);
  return { start: new Date(startMs).toISOString(), end: new Date(startMs + 86_400_000).toISOString() };
}

/** Rentang UTC [start, end) untuk satu bulan kalender WIB. */
export function wibMonthRange(year: number, month1to12: number): { start: string; end: string } {
  const startMs = Date.UTC(year, month1to12 - 1, 1) - WIB_OFFSET_MS;
  const endMs = Date.UTC(year, month1to12, 1) - WIB_OFFSET_MS;
  return { start: new Date(startMs).toISOString(), end: new Date(endMs).toISOString() };
}
