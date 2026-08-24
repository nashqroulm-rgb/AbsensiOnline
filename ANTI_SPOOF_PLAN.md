# ANTI_SPOOF_PLAN — Anti-Pemalsuan Lokasi & Identitas

> **Versi:** 1.0 · **Status:** AKTIF · **Prasyarat:** FIXPLAN.md (v1.1+) sudah tereksekusi
>
> Konteks produk: aplikasi berjalan di **Android (di-wrap Capacitor)** dan **iOS (PWA murni, tidak dinative-kan)**. Fitur andalan = absensi lokasi; user tidak boleh bisa memalsukan posisi/identitasnya. Kendala anggaran: **tanpa layanan cloud berbayar**.

---

## 0. Realitas (baca dulu, jangan skip)

| Tingkat penipu | Cara | Ditutup oleh |
|---|---|---|
| L1 | Request langsung / console / edit payload | Radius server-side (A3) |
| L2 | Override geolocation browser (devtools/extensi/emulator) | Deteksi anomali (A4–A5) + selfie identitas (B) |
| L3 | Mock location OS-level Android | Flag mock-provider native (**hanya Fase C**, Android) |
| L4 | Perangkat root + framework injeksi | Play Integrity (**Fase C**); iOS: tidak tersedia |

**Janji yang realistis:** L1 ditolak mutlak; L2 gagal *dan tertangkap*; L3/L4 hanya tertutup di Android via Fase C; **iOS menerima risiko residu sedang** (dokumentasikan di §6-D14).

**Fakta EXIF (kenapa ide "baca metadata lokasi foto" dibuang):**
- iOS Safari menghapus seluruh EXIF saat upload (WebKit bug 207088, sejak iOS 13)
- Android Chrome juga menghapus tag GPS (scoped-storage, Chromium issue 40721166)
- Dan EXIF = data self-reported, bisa ditulis palsu pakai alat exif mana pun
- Konsekuensi: **selfie WAJIB diambil di dalam alur check-in** (terikat waktu + GPS dari kanal yang sama), bukan upload bebas

## 1. Arsitektur Sinyal (defense-in-depth)

| ID | Sinyal | Fase | Android | iOS |
|----|--------|------|---------|-----|
| S1 | Radius vs zona dihitung server | A | ✅ | ✅ |
| S2 | Plausibility accuracy GPS | A | ✅ | ✅ |
| S3 | Impossible-travel antar absensi | A | ✅ | ✅ |
| S4 | Pola koordinat repeat/statik | A | ✅ | ✅ |
| S5 | Selfie → identitas vs referensi | B | ✅ | ✅ |
| S6 | Mock-flag + Play Integrity | C | ✅ | ❌ |
| S7 | Antrean review admin | A+B | ✅ | ✅ |

Setiap absensi menyimpan **`spoof_risk` (rendah/sedang/tinggi) + `spoof_reasons`** — keputusan akhir selalu bisa direview manusia.

---

## 2. Fase A — Validasi Lokasi Server (langsung, gratis, kedua platform)

### A1 — Skema & payload accuracy *(migrasi 016)*

```sql
ALTER TABLE public.attendances
  ADD COLUMN IF NOT EXISTS accuracy_in  integer,
  ADD COLUMN IF NOT EXISTS accuracy_out integer,
  ADD COLUMN IF NOT EXISTS spoof_risk   text NOT NULL DEFAULT 'belum_dinilai'
    CHECK (spoof_risk IN ('belum_dinilai','rendah','sedang','tinggi')),
  ADD COLUMN IF NOT EXISTS spoof_reasons text[] NOT NULL DEFAULT '{}';
```

- **File:** `src/services/attendance.service.ts` — `CheckInPayload += accuracy?: number`; insert kolomnya. Checkout idem (`accuracy_out`).
- **File:** `src/components/pwa/HomeTab.tsx` — `userPos.accuracy` sudah ada; ikutkan di payload (check-in & checkout via `resolvePosition` yang kini mengembalikan `{lat,lng,accuracy}`).
- **Terima:** record baru terisi accuracy; record lama tetap null (tidak error).

### A2 — Radius server-side (D3-A) *(gabung migrasi 016)*

```sql
CREATE OR REPLACE FUNCTION public.is_within_zone(
  p_lat double precision, p_lng double precision,
  p_zone uuid, p_accuracy integer DEFAULT NULL)
RETURNS boolean LANGUAGE sql STABLE AS $$
  SELECT z.id IS NOT NULL AND (
    6371000 * 2 * atan2(
      sqrt(pow(sin(radians(p_lat - z.latitude)/2), 2) +
           cos(radians(z.latitude)) * cos(radians(p_lat)) *
           pow(sin(radians(p_lng - z.longitude)/2), 2)),
      sqrt(1 - pow(sin(radians(p_lat - z.latitude)/2), 2) +
           cos(radians(z.latitude)) * cos(radians(p_lat)) *
           pow(sin(radians(p_lng - z.longitude)/2), 2))
    ) <= z.radius_meter + GREATEST(COALESCE(p_accuracy, 100), 100)
  )
  FROM public.zones z WHERE z.id = p_zone;
$$;
```

- Hook ke `validate_attendance_insert` (013): jika zona aktif & koordinat ada → tolak bila `NOT is_within_zone(...)`.
- **Ceiling (ponytail):** toleransi = max(accuracy, 100 m) — GPS indoor sering meleset; 100 m floor mencegah false-reject. Kalibrasi nanti dari data nyata.
- **Terima:** INSERT dengan koordinat 10 km dari zona → ditolak; koordinat dalam zona+toleransi → lolos.

### A3 — Plausibility accuracy *(trigger yang sama)*

- `accuracy_in` < 1 ATAU > 500 → tolak (mock sering melaporkan 0 m sempurna; GPS indoor buruk biasanya >500 m).
- **Terima:** accuracy=0 → ditolak dengan pesan jelas.

### A4 — Impossible-travel *(fn `check_impossible_travel`, dipanggil trigger insert)*

- Bandingkan `(lat,lng)` dengan absensi terakhir user yang lain (hari sebelumnya / check-in hari ini sebelumnya):
  `speed_kmh = jarak_m / max(selisih_jam, 1/60)`; jika > 150 km/jam → `spoof_reasons += 'perjalanan mustahil'`, risk min. 'tinggi' (jangan tolak keras — jam device bisa salah; tandai untuk review).
- **Terima:** dua check-in Jakarta→Bandung beda 1 jam → baris kedua risk=tinggi.

### A5 — Pola koordinat statik *(fn `check_static_pattern`)*

- Ambil 3 check-in terakhir user (hari berbeda). Jika jarak ketiganya satu sama lain < 2 m → `reasons += 'koordinat statik'`, risk min. 'sedang'.
- **Ceiling:** pekerja yang benar-benar masuk lewat gerbang yang sama bisa kena false-positive — karena itu *flag*, bukan tolakan.
- **Terima:** replay titik identik 3 hari → risk sedang + reason tercatat.

### A6 — UI risiko

- `AttendancePage`: badge warna pada kolom Status (hijau/kuning/merah) + filter dropdown `spoof_risk` + tooltip reasons.
- `Dashboard`: kartu "Risiko Tinggi Hari Ini".
- **Terima:** admin bisa memfilter semua absensi risk=tinggi bulan ini.

---

## 3. Fase B — Selfie Identitas (solusi GRATIS, tanpa cloud berbayar)

### 3.0 Keputusan arsitektur: kenapa jalurnya begini

- Pencocokan wajah **wajib server-side** (client-side = bisa dibypass, bukan verifikasi).
- Cloud berbayar dilarang → jalur gratis: **Supabase Edge Function + Transformers.js v3** (resmi support Deno; ONNX/WASM; batas platform: **memori 256MB, bundle 20MB, CPU-time ketat**).
- Model: deteksi wajah + embedding (MobileFaceNet/ArcFace varian ONNX terkuantisasi **≤15MB**) dimuat runtime dari Hugging Face CDN (tidak ikut bundle).
- **Risiko teknis nyata**: CPU-time Edge Function untuk inferensi vision terbatas (laporan komunitas: workload embedding cepat mentok). Maka:

### 3.1 Tangga implementasi (fallback ladder)

| Rung | Isi | Risiko |
|------|-----|--------|
| **B1 (MVP, pasti jalan)** | Selfie wajib tiap check-in → simpan → **antrean verifikasi admin** (banding visual dgn referensi). Absensi berstatus `menunggu_verifikasi` sampai admin OK/tandai palsu | Nol risiko teknis; beban admin manual |
| **B2.0 SPIKE** | Buktikan edge fn `verify-face` jalan dalam limit: 1 gambar 112×112, model quantized, warm-cache antar invocation. Ukur durasi & memori aktual. **Go/no-go decision eksplisit** | Jika gagal → bertahan di B1, B2 ditunda tanpa memblokir apa pun |
| **B2 (otomatis)** | `verify-face`: download ref+probe (Cloudinary URL publik), detect 1 wajah, embedding, cos-similarity vs referensi → `selfie_score`. Threshold dikalibrasi dari spike (±30 pasang uji asli/foto-layar) | Tergantung hasil spike |

### 3.2 Skema *(migrasi 017)*

```sql
CREATE TABLE public.face_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES public.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'menunggu'
    CHECK (status IN ('menunggu','terverifikasi','ditolak')),
  images JSONB NOT NULL DEFAULT '[]',      -- [{url, created_at}]
  embedding JSONB,                          -- [float...] hasil B2
  verified_by UUID REFERENCES public.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.face_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "face_select_own_or_admin" ON public.face_profiles FOR SELECT
  TO authenticated USING (user_id = auth.uid() OR public.is_admin());
CREATE POLICY "face_insert_own" ON public.face_profiles FOR INSERT
  TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "face_update_admin" ON public.face_profiles FOR UPDATE
  TO authenticated USING (public.is_admin());

ALTER TABLE public.attendances
  ADD COLUMN IF NOT EXISTS selfie_url  text,
  ADD COLUMN IF NOT EXISTS selfie_status text NOT NULL DEFAULT 'tidak_ada'
    CHECK (selfie_status IN ('tidak_ada','menunggu','cocok','ragu','gagal')),
  ADD COLUMN IF NOT EXISTS selfie_score numeric;
-- RLS attendances sudah ada (insert_own/update_own) — kolom baru ikut policy lama.
```

### 3.3 Alur enrolment (pendaftaran wajah)

1. `ProfileTab` → tombol "Daftar Wajah" → capture 3 selfie (input `capture="user"`).
2. Upload Cloudinary folder `absensi/face/{userId}/` (unsigned preset sudah ada).
3. Insert `face_profiles {status:'menunggu', images:[...]}`.
4. Admin: UI review sederhana (grid foto + Setujui/Tolak) — pola `AttachmentModal`.
5. Disetujui → `status='terverifikasi'` (+ embedding dihitung B2 bila aktif).
- **Terima:** worker belum enrol → check-in tetap jalan TANPA selfie-gate (grace period), tapi banner ajakan enrol; setelah enrol terverifikasi → selfie wajib.

### 3.4 Alur check-in dengan selfie

1. GPS ok (S1–S4) → tombol check-in aktif → **langkah 2: capture selfie** (satu alur, tak bisa di-skip bila sudah enrol).
2. Upload selfie → insert attendance dengan `selfie_url` + `selfie_status='menunggu'`.
3. B1: admin menilai di antrean review → `cocok` / `ragu` / `gagal` (+ alasan). `gagal` → absensi ditandai & notif admin; **tidak auto-delete** (jejak audit).
4. B2: edge fn `verify-face` mengisi score/status otomatis; `ragu|gagal` → antrean review sama.
- **Soft-block default (D11):** gagal verifikasi TIDAK menghapus absensi — ia menjadi temuan yang harus diputuskan admin. Hard-block bisa diaktifkan belakangan.

### 3.5 Anggaran kuota gratis (estimasi @50 pekerja, 2×/hari)

| Sumber daya | Paket gratis | Estimasi pakai | Aman? |
|---|---|---|---|
| Edge fn invocations (verify/enrol) | 500K/bln | ±3.1K/bln (+spike) | ✅ |
| Cloudinary storage/bandwidth | ±25 kredit | selfie 100KB × 3.1K/bln ≈ 0.3GB | ✅ |
| Postgres rows | 500MB | ribuan baris kecil | ✅ |
| GitHub Actions CI | gratis publik | trivial | ✅ |

---

## 4. Fase C — Android Capacitor Hardening (gratis)

> Prinsip: wrapper **menambah** lapisan (S6), tidak mengubah kode web. iOS tidak ikut fase ini (risiko residu §6-D14).

| Task | Isi | Terima |
|------|-----|--------|
| C1 | Scaffold Capacitor di repo (`npx cap add android`), target web build yang sama; WebView load dist | `npx cap open android` → apk debug terpasang & app jalan |
| C2 | Ganti geolocation ke `@capacitor/geolocation` (native fused provider) **+ cek mock**: plugin kecil/community `mock-location-check` → kirim `mock_suspected:boolean` ke payload; server: true → `risk=tinggi` reason 'mock provider' | Aktifkan fake-GPS di device uji → flag terbaca & absensi ditandai |
| C3 | **Play Integrity API** (standard request — gratis, kuota harian cukup): client minta token → edge fn `verify-integrity` dekripsi/validasi verdict `MEETS_DEVICE_INTEGRITY` (pakai lib google di Deno atau endpoint verify) → simpan hasil per absensi; verdict gagal → risk tinggi | Device non-certified/rooted → verdict gagal → terdeteksi |
| C4 | Distribusi: APK release signed → sideload via link/QR + panduan instal untuk pekerja; versioning update | 5 pekerja uji berhasil install & absen normal |

Catatan: C3 butuh project Firebase/Google Cloud console (gratis) untuk applicationId binding.

## 5. Liveness & "Deteksi Latar" (roadmap — bukan MVP)

- **Latar foto sebagai syarat: dibuang** (D12). Selain EXIF mati, "background check" gampang diloloskan (ganti ruangan/print backdrop) dan rawan false-positive.
- Penggantinya yang lebih kuat: identitas wajah (B) — menyerang pertanyaan "siapa orangnya", bukan "dimana latarnya".
- **Liveness-lite** (fase lanjutan B3, gratis): challenge aktif di UI — "kedip / putar kepala" dengan sampling beberapa frame; bypassable oleh penyerang mahir tapi menaikkan biaya penipuan kasual. Dokumentasikan ceiling-nya.

## 6. Keputusan yang Diminta

| ID | Pertanyaan | Rekomendasi |
|----|-----------|-------------|
| D11 | Gagal/di ragukan wajah: soft-block (tandai + review) atau hard-block (tolak absensi)? | Soft-block dulu 1 bulan, evaluasi false-rate |
| D12 | Resmi menghapus "deteksi latar" dari requirement, diganti identitas+liveness-lite? | Ya |
| D13 | Jalankan B1 sekarang & spike B2 setelahnya, atau tunda semua Fase B sampai spike selesai? | B1 sekarang; spike menyusul |
| D14 | Catat resmi risiko residu iOS (geolocation override browser) sebagai accepted-risk sampai ada resource native-iOS? | Ya |

## 7. Urutan Eksekusi & Checklist

```
Fase A (A1→A6, satu migrasi 016 + edit client/UI)  ── 1 sesi
Fase B1 (migrasi 017 + enrolment UI + antrean review) ── 1–2 sesi   ← D13
Spike B2.0 (poc edge fn inferensi + kalibrasi threshold) ── ½–1 sesi
Fase B2 (wire verify-face bila spike lolos)         ── 1 sesi
Fase C (C1→C4, jalur Android)                       ── 2–3 sesi (butuh device uji)
```

**Checklist**

**Fase A**
- [x] A1 kolom accuracy/risk + payload client (migrasi 016; HomeTab kirim accuracy check-in & checkout)
- [x] A2 radius server (`is_within_zone` + hook trigger 013)
- [x] A3 plausibility accuracy (<1 / >500 → tolak)
- [x] A4 impossible-travel (>150 km/jam → risk tinggi)
- [x] A5 static-pattern (3 hari titik <2m → risk sedang)
- [x] A6 UI badge risiko + filter (AttendancePage) + kartu "Risiko Spoofing" (Dashboard)
  - *Migrasi 016 TERAPPLY; verifikasi REST: kolom spoof/accuracy hidup, anon tetap kosong (2026-08)*

**Fase B**
- [x] B1 enrolment + capture selfie + antrean review admin (migrasi 017; face.service; ProfileTab "Verifikasi Wajah"; HomeTab gerbang selfie saat check-in; WorkersPage modal antrean) — *migrasi 017 TERAPPLY; face_profiles terverifikasi via REST (2026-08)*
- [ ] Spike B2.0 go/no-go (bukti durasi/memori) · [ ] B2 verify-face + threshold terkalibrasi
- [x] D11=soft-block · D12=latar dihapus · D13=B1 dulu · D14=iOS accepted-risk (disetujui user, sesi ini)

**Fase C**
- [ ] C1 scaffold · [ ] C2 geo native + mock flag · [ ] C3 Play Integrity · [ ] C4 distribusi APK

**Verifikasi silang akhir**
- [ ] Uji penyerangan L1 (curl koordinat jauh) → ditolak · [ ] Uji L2 (override geo browser) → lolos TAPI risk tinggi/reason tercatat · [ ] Uji foto-foto vs wajah asli (B) · [ ] Android: fake GPS → flag terbaca (C)
