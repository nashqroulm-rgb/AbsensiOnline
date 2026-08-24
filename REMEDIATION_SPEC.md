# REMEDIATION_SPEC — Spesifikasi Perbaikan Pasca-Analisis

> **Versi:** 1.0 · **Tanggal:** 2026-06-12  
> **Konteks:** MVP Supabase sudah jalan; fokus perbaikan celah fungsional & konsistensi data.

---

## 1. Tujuan

Membuat fitur yang **sudah tampil di UI benar-benar berfungsi**, menerapkan **aturan bisnis yang sudah bisa dikonfigurasi admin**, dan memperbaiki **keandalan data** (profil, status terlambat, filter laporan).

**Bukan scope:** redesign UI besar, fitur baru di luar analisis (kecuali disebutkan di TASKS).

---

## 2. Masalah yang Harus Diselesaikan

### P0 — Menyesatkan pengguna (harus diperbaiki)

| ID | Masalah | Perilaku yang diharapkan |
|----|---------|------------------------|
| P0-1 | Banner offline "tersimpan lokal" tanpa penyimpanan | Check-in/out offline masuk antrian lokal; auto-kirim saat online **ATAU** hapus pesan menyesatkan (keputusan produk) |
| P0-2 | Filter tanggal Kehadiran admin tidak jalan | Tabel hanya tampilkan record tanggal yang dipilih |
| P0-3 | Override status admin tidak simpan | Admin ubah status + catatan → tersimpan di `attendances` |
| P0-4 | Filter bulan/tahun Laporan tidak jalan | Data & judul sesuai bulan/tahun dipilih |
| P0-5 | Angka tren (+5%) palsu di Laporan | Hapus atau ganti data nyata |

### P1 — Aturan bisnis tidak ditegakkan

| ID | Masalah | Perilaku yang diharapkan |
|----|---------|------------------------|
| P1-1 | `absensi_online = false` diabaikan | Pekerja dengan absensi online mati tidak bisa check-in; pesan jelas |
| P1-2 | `hari_kerja` shift diabaikan | Check-in ditolak di hari di luar jadwal shift |
| P1-3 | Status terlambat hitung ganda | Satu sumber kebenaran: database (`derive_attendance_status`) |

### P2 — Keandalan & kebersihan

| ID | Masalah | Perilaku yang diharapkan |
|----|---------|------------------------|
| P2-1 | Profil user tidak lengkap setelah refresh | Setelah login/refresh, profil diambil dari tabel `users` |
| P2-2 | Tidak ada batas 1 check-in/hari di DB | Unique partial index: 1 record check-in per user per hari kalender |
| P2-3 | Export tombol kosong | Tunda ke fase berikutnya (butuh keputusan format) |
| P2-4 | Settings placeholder | Tunda ke fase berikutnya (butuh keputusan isi) |
| P2-5 | Sisa mock (`absensi_app_store`, Leaflet) | Bersihkan dead code |

---

## 3. Keputusan Produk (Butuh Konfirmasi User)

| Topik | Opsi A | Opsi B | Default jika tidak dijawab |
|-------|--------|--------|---------------------------|
| Offline | Implementasi antrian penuh | Hapus banner & wajib online | Implementasi antrian (sudah ada di DESIGN lama) |
| Check-out GPS | Wajib dalam zona | Bebas dari mana saja | Tetap bebas (status quo) |
| PIN pekerja baru | Admin input PIN saat buat | Generate acak / SMS | Tetap 1234 sementara + catatan di TASKS |
| Export | Excel dulu | PDF dulu | Tunda (P2) |
| Check-out zona | — | — | Lihat baris Check-out GPS |

---

## 4. Kriteria Selesai (Acceptance)

- [ ] Pekerja offline: check-in masuk antrian & tersinkron saat online, **atau** tidak ada klaim "tersimpan lokal" tanpa bukti
- [ ] Filter tanggal Kehadiran memfilter tabel
- [ ] Override status admin persist ke database
- [ ] Laporan bulan/tahun/zona konsisten dengan filter UI
- [ ] Tidak ada angka tren hardcoded
- [ ] Pekerja `absensi_online=false` diblokir check-in
- [ ] Check-in di hari libur shift diblokir
- [ ] Status terlambat dari trigger DB, bukan duplikasi client
- [ ] Refresh halaman: profil worker/admin lengkap dari `users`
- [ ] `npm run build` sukses

---

## 5. Environment & Database

Tidak ada env baru. Migration baru: `008_remediation.sql` (trigger status, unique check-in per hari).