# REMEDIATION_TASKS — Daftar Task Perbaikan

> Urutan eksekusi. Centang `[x]` saat selesai.

---

## Fase A — Dokumentasi & Keputusan

| ID | Task | Status | Depends |
|----|------|--------|---------|
| A01 | Tulis REMEDIATION_SPEC.md | [x] | — |
| A02 | Tulis REMEDIATION_DESIGN.md | [x] | A01 |
| A03 | Tulis REMEDIATION_TASKS.md | [x] | A02 |
| A04 | Konfirmasi user: offline / checkout GPS / PIN | [x] | A03 |

---

## Fase B — P0 Fungsional (prioritas tinggi)

| ID | Task | File | Kriteria selesai | Status |
|----|------|------|------------------|--------|
| B01 | Profil lengkap setelah login/refresh | `useAuth.ts` | `zona_id`, `shift_id`, `absensi_online` terisi dari DB | [x] |
| B02 | Filter tanggal Kehadiran | `AttendancePage.tsx` | Ganti tanggal → tabel berubah | [x] |
| B03 | Simpan override status | `attendance.service.ts`, `AttendancePage.tsx` | Ubah status → reload → persist | [x] |
| B04 | Laporan ikut bulan/tahun/zona | `reports.service.ts`, `ReportsPage.tsx` | Ganti filter → data berubah | [x] |
| B05 | Hapus tren palsu | `ReportsPage.tsx` | Tidak ada +5% hardcoded | [x] |
| B06 | Offline queue terhubung | `HomeTab.tsx`, `offlineQueue.ts` | Offline check-in masuk queue; online flush | [x] |

---

## Fase C — P1 Aturan bisnis & data

| ID | Task | File | Kriteria selesai | Status |
|----|------|------|------------------|--------|
| C01 | Blokir jika absensi_online=false | `HomeTab.tsx` | Toggle mati → tidak bisa check-in | [x] |
| C02 | Blokir di luar hari_kerja | `HomeTab.tsx` | Hari libur shift → tidak bisa check-in | [x] |
| C03 | Trigger status terlambat di DB | `008_remediation.sql`, `attendance.service.ts` | Status dari DB function | [x] |
| C04 | Unique 1 check-in/hari | `008_remediation.sql` | Duplikat ditolak DB | [x] |

---

## Fase D — P2 Penyempurnaan (tunda / opsional)

| ID | Task | Catatan | Status |
|----|------|---------|--------|
| D01 | Export PDF (Excel ditunda) | ReportsPage + AttendancePage | [x] |
| D02 | Halaman Settings admin | app_settings + SettingsPage | [x] |
| D03 | Hapus dependency Leaflet | `package.json` | [ ] |
| D04 | Update Agents.md | Hapus referensi mockData | [x] |
| D05 | Hapus console.log attachments | `attachments.service.ts` | [x] |
| D06 | Check-out wajib GPS zona | User pilih A — dibatalkan | [-] |

---

## Fase E — Verifikasi

| ID | Task | Kriteria | Status |
|----|------|----------|--------|
| E01 | `npm run build` | Exit 0 | [x] |
| E02 | `graphify update .` | Graph terbarui | [ ] |

---

## Urutan eksekusi hari ini

```
B01 → B02 → B03 → B04 → B05 → C01 → C02 → C03 → B06 → C04 → E01
```

(B06 offline mengikuti asumsi default: implementasi antrian penuh)

---

## Fase F — Lanjutan (2026-06-12)

| ID | Task | Status |
|----|------|--------|
| F1 | Push migration 008 + 009 ke Supabase remote | [x] |
| F2 | PIN admin isi + Reset PIN pekerja | [x] |
| F3 | Export PDF Laporan & Kehadiran | [x] |
| F4 | Settings admin + wire ke PWA/Zona/Shift | [x] |
| F5 | Deploy admin-user function + build | [x] |