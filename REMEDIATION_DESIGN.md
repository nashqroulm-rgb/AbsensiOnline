# REMEDIATION_DESIGN — Desain Perbaikan

> Pendamping: `REMEDIATION_SPEC.md` · `REMEDIATION_TASKS.md`

---

## 1. Prinsip

1. **Jangan bohong ke pengguna** — UI claim harus match perilaku kode.
2. **Satu jalur data** — status terlambat & profil user dari database, bukan tebak-tebakan di browser.
3. **Perubahan kecil, dampak besar** — utamakan perbaikan file yang sudah ada.

---

## 2. Arsitektur Setelah Perbaikan

```
Login / Refresh
  → supabase.auth.getSession()
  → fetch users WHERE id = auth.uid()   ← BARU: profil lengkap
  → setUser(fullProfile)

Check-in (PWA)
  → validasi: absensi_online, hari_kerja, GPS, zona
  → if online: submitCheckIn() → DB trigger set status
  → if offline: addToQueue() + state lokal optimistik

Online event
  → flushQueue() → submitCheckIn/Out untuk tiap item pending

Admin Kehadiran
  → filter tanggal di client (match checkin_at date)
  → updateAttendanceStatus(id, status, catatan) → Supabase update

Laporan
  → getMonthlyReport({ month, year, zonaId? })
  → ReportsPage reload saat filter berubah
```

---

## 3. Keputusan Desain per Area

### 3.1 Profil user (P2-1)

**Masalah:** `useAuth` membangun user dari `user_metadata` yang hanya berisi `nama`, `no_hp`, `role`.

**Solusi:** Helper `fetchUserProfile(userId)` query `users` table. Dipanggil di:
- `getSession` callback
- `onAuthStateChange`
- Setelah `login` sukses (tetap pakai hasil RPC/login, lalu refresh dari DB untuk konsistensi)

**Fallback:** Jika query gagal, pakai metadata minimal + tampilkan error di console (tidak logout).

---

### 3.2 Status terlambat (P1-3)

**Masalah:** Client hitung di `submitCheckIn`; DB punya `derive_attendance_status` tapi tidak dipakai.

**Solusi:**
- Migration `008`: trigger `BEFORE INSERT` pada `attendances` → set `status` via `derive_attendance_status(checkin_at, shift_id)` jika `checkin_at` tidak null.
- Hapus perhitungan status di `attendance.service.ts` `submitCheckIn` — kirim status default `'hadir'` atau biarkan DB trigger override.

---

### 3.3 Aturan check-in (P1-1, P1-2)

**Lokasi:** `HomeTab.tsx` — sebelum enable tombol check-in.

```typescript
// absensi_online
if (worker && !worker.absensi_online) → blockCheckIn('Absensi online dinonaktifkan admin.')

// hari_kerja
const hari = ['Minggu','Senin',...][new Date().getDay()]
if (shift && shift.hari_kerja.length && !shift.hari_kerja.includes(hari)) → block
```

`checkInAllowed` = GPS in range **AND** absensi_online **AND** hari kerja valid.

---

### 3.4 Offline queue (P0-1)

**Lokasi:** `HomeTab.tsx` + `offlineQueue.ts` (sudah ada).

| Aksi | Online | Offline |
|------|--------|---------|
| Check-in | `submitCheckIn` langsung | `addToQueue({ type:'checkin', payload })` + set state lokal |
| Check-out | `submitCheckOut` | `addToQueue({ type:'checkout', payload })` |
| Upload lampiran | tetap butuh online | toast warning (sudah ada) |

**Saat `window.online`:** panggil `flushQueue()`, refresh `getTodayAttendance`.

**Hapus:** `setTimeout` 2 detik yang palsu di `pendingSync` effect.

---

### 3.5 Admin Kehadiran (P0-2, P0-3)

**Filter tanggal:** Tambah `matchDate` di `useMemo` filtered — bandingkan `checkin_at`/`client_timestamp` date part dengan `filterDate`.

**Override:** Service baru:

```typescript
updateAttendanceStatus(id, { status, catatan? })
  → supabase.from('attendances').update({ status, catatan }).eq('id', id)
```

Modal Simpan → panggil service → refresh list → toast.

---

### 3.6 Laporan (P0-4, P0-5)

**Service:** `getMonthlyReport({ month, year, zonaId? })` — filter `checkin_at` range bulan tersebut.

**ReportsPage:**
- `useEffect` dependency: `[month, year, filterZona]`
- Filter zona: filter array hasil di client atau tambah param ke query
- Hapus array trend hardcoded di summary cards

**Grafik zona:** Filter `attendances` ke bulan terpilih (bukan semua data).

---

### 3.7 Database: satu check-in per hari (P2-2)

```sql
CREATE UNIQUE INDEX idx_attendances_one_per_day
  ON attendances (user_id, ((checkin_at AT TIME ZONE 'Asia/Jakarta')::date))
  WHERE checkin_at IS NOT NULL;
```

Client: tangani error duplicate dengan pesan ramah.

---

## 4. File yang Berubah (Ringkas)

| File | Perubahan |
|------|-----------|
| `src/hooks/useAuth.ts` | fetch profil dari DB |
| `src/services/attendance.service.ts` | hapus status client; tambah `updateAttendanceStatus` |
| `src/services/reports.service.ts` | param month/year/zona |
| `src/components/pwa/HomeTab.tsx` | aturan bisnis + offline queue |
| `src/components/admin/AttendancePage.tsx` | filter tanggal + override simpan |
| `src/components/admin/ReportsPage.tsx` | filter hidup + hapus trend palsu |
| `supabase/migrations/008_remediation.sql` | trigger status + unique index |
| `src/hooks/useAuth.ts` | hapus `absensi_app_store` cleanup (opsional tetap) |

---

## 5. Risiko & Mitigasi

| Risiko | Mitigasi |
|--------|----------|
| Trigger status bentrok dengan insert client | BEFORE INSERT selalu override |
| Unique index gagal di data lama duplikat | Migration cek duplikat dulu atau partial index hanya forward |
| Offline queue payload tidak match type | Reuse `CheckInPayload` types yang sama |