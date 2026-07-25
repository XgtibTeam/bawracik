# BAW Group — Absensi + E-Member/Webstore Parfum

Sistem gabungan untuk **Biang Aroma X Me.Racik Parfum** (BAW Group): absensi karyawan,
kasir/checkout isi ulang parfum dengan sistem poin member, webstore publik, dan
dashboard admin multi-cabang.

---

## Daftar Isi

1. [Ringkasan Sistem](#1-ringkasan-sistem)
2. [Peta Role & Halaman](#2-peta-role--halaman)
3. [Yang Perlu Disiapkan](#3-yang-perlu-disiapkan)
4. [Langkah 1 — Install Project](#langkah-1--install-project)
5. [Langkah 2 — Buat Bin JSONBin.io](#langkah-2--buat-bin-jsonbinio)
6. [Langkah 3 — Setup Google Drive (Foto)](#langkah-3--setup-google-drive-foto)
7. [Langkah 4 — Setup Supabase (Rekap Transaksi)](#langkah-4--setup-supabase-rekap-transaksi)
8. [Langkah 5 — Isi File `.env.local`](#langkah-5--isi-file-envlocal)
9. [Langkah 6 — Jalankan Website](#langkah-6--jalankan-website)
10. [Langkah 7 — Setup Awal (Bootstrap)](#langkah-7--setup-awal-bootstrap)
11. [Cara Pakai — Superadmin & Admin](#cara-pakai--superadmin--admin)
12. [Cara Pakai — Kasir/Karyawan](#cara-pakai--kasirkaryawan)
13. [Cara Pakai — Member & Customer](#cara-pakai--member--customer)
14. [Deploy ke Vercel](#deploy-ke-vercel)
15. [Struktur Folder](#struktur-folder)
16. [Fitur yang Masih Belum Ada](#fitur-yang-masih-belum-ada)
17. [Troubleshooting](#troubleshooting)

---

## 1. Ringkasan Sistem

- **Absensi karyawan** — swafoto + pilih cabang (nama otomatis dari akun yang login),
  shift & keterlambatan terdeteksi otomatis, rekap & ekspor Excel.
- **Kasir (`/kasir`)** — karyawan/admin checkout pelanggan: input ml atau rupiah (auto
  konversi), harga per-ml, biaya botol otomatis by ukuran, grosir/ecer, cari/daftar
  member baru, pakai kode voucher, lanjut ke WhatsApp dengan template otomatis.
- **Belanja mandiri (`/belanja`)** — pelanggan checkout sendiri tanpa kasir: pilih cabang,
  isi pesanan, lihat QRIS/DANA/SeaBank, upload bukti bayar, lanjut ke WA.
- **Member Area (`/member`)** — login pakai nomor WA. Tampilan app dengan bottom
  navigation: **Beranda** (feed foto ala Instagram — foto ke Google Drive, deskripsi
  & lokasi ke Supabase), **Voucher** (lihat & salin kode voucher aktif + progres poin),
  **Undang Teman** (bagikan kode referral via WhatsApp, lihat jumlah teman bergabung),
  **Profil** (edit nama, badge tier member, poin total/saat ini, riwayat belanja,
  E-Struk per transaksi view-only).
- **Admin (`/admin/toko`)** — kelola profil toko, cabang, karyawan (+ role & password),
  produk (manual & import Excel), harga per-ml/botol, voucher, stok (harian/
  bulanan/tahunan), rekap penjualan + grafik best-seller.
- **Superadmin** — semua yang admin bisa, tapi lintas-cabang (tidak terikat 1 cabang).
- **UI app-like** — semua halaman staff/member/publik pakai bottom navigation bar
  dengan ikon linear (bukan menu atas seperti versi lama), font Plus Jakarta Sans.

**Prinsip penyimpanan data:**

| Jenis data | Disimpan di |
|---|---|
| Teks/master data (profil toko, cabang, karyawan, member, voucher) | **JSONBin.io** |
| Produk, harga per-ml/botol, transaksi, rekap stok, feed member | **Supabase** (database) |
| Foto (swafoto absensi, foto produk, foto feed member) | **Google Drive** |

> Produk & harga pindah dari JSONBin ke Supabase supaya bentuk datanya selalu
> terjamin (kolom tabel, bukan JSON bebas) — versi lama pernah "berubah bentuk"
> di JSONBin dan menyebabkan error di client. Jumlah bin JSONBin yang perlu
> dibuat pun berkurang dari 9 jadi 7 (lihat Langkah 2).

---

## 2. Peta Role & Halaman

| Role | Login di | Halaman utama | Bisa akses |
|---|---|---|---|
| **Superadmin** | `/kasir/login` (atau `/admin/login`) | `/admin/toko` | Semua cabang |
| **Admin** (per cabang) | `/kasir/login` (atau `/admin/login`) | `/admin/toko` | Cabangnya sendiri |
| **Kasir/Karyawan** | `/kasir/login` | `/kasir` | Checkout & absen di cabangnya |
| **Member** | `/member/login` (nomor WA) | `/member` | Profil & riwayat sendiri |
| **Customer/tamu** | tidak perlu login | `/` , `/belanja` | Lihat profil toko & checkout mandiri |

> Catatan: `/admin/login` dan `/kasir/login` sama-sama memanggil endpoint staff
> login yang sama — perbedaannya cuma halaman tujuan setelah login. Admin/superadmin
> otomatis diarahkan bisa buka `/admin/toko`, kasir diarahkan ke `/kasir`.

---

## 3. Yang Perlu Disiapkan

- Node.js versi 18 atau lebih baru ([nodejs.org](https://nodejs.org))
- Akun [JSONBin.io](https://jsonbin.io) (gratis)
- Akun Google Gmail (untuk penyimpanan foto lewat Google Drive OAuth)
- Akun [Supabase](https://supabase.com) (gratis, untuk rekap transaksi)
- (Opsional) Akun [Vercel](https://vercel.com) kalau mau deploy online

---

## Langkah 1 — Install Project

```bash
cd baw-group-merged
npm install
cp .env.local.example .env.local
```

Semua isian env akan dijelaskan di langkah-langkah berikut, lalu ditulis ke `.env.local`.

---

## Langkah 2 — Buat Bin JSONBin.io

1. Daftar/login di https://jsonbin.io
2. Buka menu **API Keys** → salin **Master Key** → ini untuk `JSONBIN_API_KEY`.
3. Buat **7 bin baru** (tombol **Create Bin**), masing-masing dengan isi awal berikut,
   lalu salin **Bin ID** setiap bin ke variabel env yang sesuai:

| Bin | Isi awal | Env variable |
|---|---|---|
| Absensi | `[]` | `JSONBIN_BIN_ID_ATTENDANCE` |
| Cabang | `[]` | `JSONBIN_BIN_ID_BRANCHES` |
| Karyawan | `[]` | `JSONBIN_BIN_ID_EMPLOYEES` |
| Pengumuman | `{"text": "", "updatedAt": null}` | `JSONBIN_BIN_ID_ANNOUNCEMENT` |
| Profil Toko | `{}` | `JSONBIN_BIN_ID_STORE_PROFILE` |
| Member | `[]` | `JSONBIN_BIN_ID_MEMBERS` |
| Voucher | `[]` | `JSONBIN_BIN_ID_VOUCHERS` |

> Bin **Profil Toko** boleh dibiarkan `{}` — sistem otomatis mengisi nilai default
> saat pertama kali diakses.
>
> ⚠️ **Produk** dan **Harga** TIDAK lagi disimpan di JSONBin — sekarang ada di
> Supabase (tabel `products` & `pricing_config`, lihat Langkah 4) karena bin lama
> pernah "berubah bentuk" jadi bukan array dan menyebabkan error di client
> (`x.find`/`x.map is not a function`). Kalau kamu masih punya env
> `JSONBIN_BIN_ID_PRICING`/`JSONBIN_BIN_ID_PRODUCTS` dari setup lama, boleh
> dihapus — sudah tidak dipakai kode.

---

## Langkah 3 — Setup Google Drive (Foto)

Google Drive dipakai untuk **2 folder terpisah**: foto swafoto absensi, dan foto
produk. Aplikasi login pakai **akun Gmail kamu sendiri lewat OAuth** (bukan Service
Account), supaya tidak kena error kuota penyimpanan.

### a. Buat Project & Aktifkan Google Drive API

1. Buka https://console.cloud.google.com/ → login pakai akun Gmail kamu.
2. Dropdown project di atas → **New Project** → beri nama (mis. `baw-group`) → **Create**.
3. Di kotak pencarian atas, ketik **"Google Drive API"** → buka → klik **Enable**.

### b. Buat OAuth Client ID

1. **APIs & Services** → **OAuth consent screen** → pilih **External** → **Create**.
   Isi nama app & email kamu → **Save and Continue** sampai selesai (boleh skip
   bagian scope/test user detail).
   Di bagian **Test users**, tambahkan email Gmail kamu sendiri.
2. **APIs & Services** → **Credentials** → **+ Create Credentials** → **OAuth client ID**.
3. **Application type: Desktop app** → beri nama bebas → **Create**.
4. Salin **Client ID** → `GOOGLE_OAUTH_CLIENT_ID`, dan **Client secret** → `GOOGLE_OAUTH_CLIENT_SECRET`.

### c. Ambil Refresh Token

1. Buka https://developers.google.com/oauthplayground
2. Klik ⚙️ (kanan atas) → centang **"Use your own OAuth credentials"** → isi Client
   ID & Secret dari langkah b → **Close**.
3. Panel kiri → cari **Drive API v3** → centang scope `https://www.googleapis.com/auth/drive`.
4. Klik **Authorize APIs** → login dengan akun Gmail kamu → kalau ada peringatan
   "Google hasn't verified this app", klik **Advanced** → **Go to (nama app) (unsafe)** → **Allow**.
5. Kembali ke Playground, klik **Exchange authorization code for tokens**.
6. Salin **Refresh token** → `GOOGLE_OAUTH_REFRESH_TOKEN`.

> Refresh token ini permanen (tidak expired), jadi cukup sekali di awal.

### d. Buat 3 Folder Drive

1. Buka https://drive.google.com dengan akun yang sama seperti langkah c.
2. Buat folder **"Absensi BAW Group"** → buka folder → salin ID dari URL
   (`.../folders/<ID_INI>`) → `GOOGLE_DRIVE_FOLDER_ID`.
3. Buat folder kedua **"Produk BAW Group"** → salin ID-nya → `GOOGLE_DRIVE_FOLDER_ID_PRODUCTS`.
4. Buat folder ketiga **"Feed Member BAW Group"** → salin ID-nya →
   `GOOGLE_DRIVE_FOLDER_ID_FEED` (dipakai fitur feed di Member Area).

---

## Langkah 4 — Setup Supabase (Rekap, Produk, Harga, Feed)

1. Daftar/login di https://supabase.com → **New Project** → tunggu sampai selesai dibuat.
2. Buka **Project Settings → API** → salin:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **service_role key** (bukan `anon` key!) → `SUPABASE_SERVICE_KEY`
3. Buka menu **SQL Editor** → **New query** → tempel seluruh isi file
   `supabase-schema.sql` (ada di root project ini) → klik **Run**.
   Ini membuat 5 tabel: `transactions`, `stock_recap`, `products`, `pricing_config`,
   dan `feed_posts`.

> Kalau project Supabase kamu sudah ada dari versi lama (cuma `transactions` &
> `stock_recap`), tetap jalankan ulang file `supabase-schema.sql` yang baru —
> semua perintahnya pakai `create table if not exists`, jadi aman dijalankan
> ulang dan otomatis menambahkan tabel yang belum ada.

> Pakai `service_role key`, bukan `anon key` — karena semua akses ke Supabase
> dilakukan dari server (API routes), bukan langsung dari browser.

---

## Langkah 5 — Isi File `.env.local`

Buka `.env.local`, isi semua variabel yang sudah dikumpulkan dari Langkah 2–4,
ditambah:

```bash
# String acak panjang, generate dengan: openssl rand -hex 32
SESSION_SECRET=isi_string_acak_panjang

# Akun superadmin awal (WAJIB diisi untuk login pertama kali)
SUPERADMIN_USERNAME=admin
SUPERADMIN_PASSWORD=ganti_dengan_password_kuat

# Nomor WA default toko (fallback kalau cabang belum diisi nomor WA sendiri)
WA_DEFAULT_NUMBER=628xxxxxxxxxx
```

---

## Langkah 6 — Jalankan Website

```bash
npm run dev
```

Buka http://localhost:3000 — akan tampil halaman Home (profil toko).

---

## Langkah 7 — Setup Awal (Bootstrap)

Urutan yang disarankan setelah pertama kali jalan:

1. **Login superadmin** — buka `/kasir/login`, masuk pakai `SUPERADMIN_USERNAME` /
   `SUPERADMIN_PASSWORD` dari `.env.local` → otomatis bisa akses `/admin/toko`.
2. **Isi Profil Toko** (tab **Profil Toko**) — nama toko, deskripsi, logo, medsos,
   info pembayaran (QRIS/DANA/SeaBank).
3. **Tambah Cabang** (tab **Cabang**) — minimal 1 cabang dulu.
4. **Tambah Karyawan/Admin** (tab **Karyawan**) — buat akun admin per-cabang dan/atau
   kasir, masing-masing dengan username, password, role, dan cabang.
5. **Atur Harga** (tab **Harga**) — cek/ubah tier harga per-ml dan harga botol
   (default sudah terisi 2k–10k dan 5k/10k).
6. **Tambah/Import Produk** (tab **Produk**) — manual satu-satu, atau import Excel
   sekaligus (kolom: Nama Parfum, Kode, Harga jual, link gambar, Ukuran Botol).
7. Setelah itu, akun admin/kasir per-cabang sudah bisa login sendiri di `/kasir/login`.

---

## Cara Pakai — Superadmin & Admin

Semua di `/admin/toko`, terbagi jadi tab:

- **Profil Toko** — edit nama, deskripsi, logo, medsos, info pembayaran. Logo & gambar
  QRIS bisa **upload file langsung** (otomatis tersimpan ke folder Google Drive
  `products` dan langsung dapat link publik), atau tempel link manual.
- **Cabang** — tambah/hapus cabang (nama, alamat, nomor WA CS cabang).
- **Karyawan** — tambah/hapus akun admin/kasir. Admin cabang hanya bisa kelola
  karyawan cabangnya sendiri; superadmin bisa semua cabang.
- **Susun Homepage** — tambah section ke halaman Home (`/`): banner (gambar +
  judul), teks bebas, gambar polos, atau promo (judul + isi). Urutan bisa diatur
  naik/turun, tampil persis urutan itu di homepage publik.
- **Produk** — tambah manual (termasuk upload foto produk) atau import Excel massal.
- **Harga** — atur tier harga per-ml & harga botol otomatis by ukuran.
- **Voucher** — buat kode voucher (5 digit otomatis), tipe persen atau potongan
  nominal, aktif/nonaktifkan.
- **Stok** — input stok awal/akhir per produk, per cabang (superadmin bisa pilih
  cabang mana saja), periode harian/bulanan/tahunan.
- **Rekap & Grafik** — total transaksi, total ml, total pendapatan, grafik
  best-seller (berdasarkan ml terjual), dan rekap per karyawan.

Panel absensi lama masih ada di `/admin` (rekap absensi, galeri foto, ekspor Excel,
papan pengumuman) — ada tombol **"Kelola Toko →"** untuk pindah ke `/admin/toko`.

---

## Cara Pakai — Kasir/Karyawan

1. Login di `/kasir/login`.
2. **Checkout (`/kasir`)** — alur 3 langkah: **(1) Parfum** pilih grosir/ecer,
   tambah parfum ke keranjang (pilih harga/ml, input rupiah **atau** ml otomatis
   dikonversi), centang **Pakai Botol** kalau perlu (harga otomatis by ukuran) →
   **(2) Ringkasan** cek rincian pesanan & masukkan kode voucher kalau ada →
   **(3) Member & Bayar** kalau ecer, cari member by nomor WA (kalau belum
   terdaftar, isi nama untuk daftar member baru), lalu **Checkout** → tombol
   **Lanjutkan ke WA** membuka WhatsApp dengan template pesan terisi otomatis
   (nama, tanggal, parfum, harga, pengisian ke-berapa, poin).
3. **Input Stok (`/kasir/stok`)** — catat stok awal/akhir harian/bulanan/tahunan
   untuk cabangnya sendiri.
4. **Absen (`/kasir/absen`)** — tinggal pilih cabang + swafoto + kirim (nama otomatis
   dari akun yang login). Shift (Pagi/Siang) & status terlambat terdeteksi otomatis
   dari jam kirim. Ada opsi "Bukan hadir?" kalau mau lapor Sakit/Izin/Lembur/Lainnya.
5. **Ganti Password (`/akun/password`)** — ganti password sendiri kapan saja (butuh
   password lama). Khusus akun superadmin bootstrap (dari `.env.local`), ganti
   langsung di `SUPERADMIN_PASSWORD` karena akun ini bukan data karyawan biasa.

---

## Cara Pakai — Member & Customer

- **Member** login di `/member/login` cukup pakai nomor WA (member baru otomatis
  didaftarkan, bisa isi kode referral teman untuk memberi bonus 10–15 poin ke
  pengundang). Setelah login, navigasi lewat bottom nav:
  - **Beranda** — feed foto ala Instagram: posting foto momen isi ulang (kamera
    langsung, bukan upload galeri), tulis deskripsi, pilih lokasi dari daftar
    cabang **atau** deteksi otomatis lewat GPS. Bisa like postingan member lain,
    dan hapus postingan sendiri.
  - **Voucher** — lihat progres poin/pengisian ke-berapa, dan daftar kode voucher
    aktif yang bisa disalin lalu dipakai saat checkout di `/kasir` atau `/belanja`.
  - **Undang Teman** — kode referral sendiri, tombol bagikan ke WhatsApp, dan
    jumlah teman yang sudah bergabung lewat kode itu.
  - **Profil** — edit nama, badge tier (Bronze/Silver/Gold/Platinum berdasar poin
    total), ringkasan poin, riwayat belanja & E-Struk per transaksi (tap untuk
    lihat detail, view-only), tombol keluar.
- **Customer/tamu** tanpa akun bisa langsung checkout di `/belanja`: pilih cabang
  pengisian, grosir/ecer, isi pesanan, lihat QRIS/DANA/SeaBank, upload bukti bayar
  (opsional, untuk dikirim manual lewat WA), lalu lanjut ke WA.

---

## Deploy ke Vercel

1. Push project ini ke repo GitHub/GitLab.
2. Buka https://vercel.com → **Add New Project** → import repo tersebut.
3. Di bagian **Environment Variables**, masukkan semua variabel yang ada di
   `.env.local` (satu per satu, sama persis nama & isinya).
4. Klik **Deploy**. Setelah selesai, website bisa diakses lewat domain `*.vercel.app`
   (otomatis HTTPS, jadi kamera untuk swafoto absensi juga akan berfungsi).

---

## Struktur Folder

```
app/
  (store)/                → route group publik (URL tetap "/" & "/belanja")
    layout.tsx             → bottom nav publik (Home/Belanja/Member/Karyawan)
    page.tsx                → Home (profil toko)
    belanja/page.tsx        → Etalase + checkout mandiri customer
  admin/
    login/page.tsx         → Login admin (form lama, tetap jalan)
    page.tsx               → Panel absensi (rekap, foto, ekspor, pengumuman)
    toko/page.tsx           → Dashboard toko (profil/cabang/karyawan/produk/harga/voucher/stok/rekap)
  kasir/
    layout.tsx              → bottom nav kasir (Absen/Kasir/Stok/Akun)
    login/page.tsx         → Login staff (admin/kasir/superadmin)
    page.tsx               → POS checkout kasir
    absen/page.tsx         → Absensi (nama dari sesi login, shift auto-detect)
    stok/page.tsx           → Input stok utk kasir cabang sendiri
  akun/
    layout.tsx              → pakai bottom nav kasir juga
    password/page.tsx       → ganti password
  member/
    layout.tsx              → bottom nav member (Beranda/Voucher/Undang/Profil)
    login/page.tsx         → Login member via nomor WA
    page.tsx               → Beranda = Feed ala Instagram
    voucher/page.tsx        → Voucher aktif + progres poin
    undang/page.tsx         → Kode referral & ajak teman
    profil/page.tsx         → Profil, riwayat, E-Struk, logout
  api/                     → semua API route (lihat kode masing-masing untuk detail)
  error.tsx                → error boundary global (halaman "Ada yang tidak beres")
  global-error.tsx         → error boundary tingkat root layout
components/
  BottomNav.tsx             → komponen nav bawah generik (dipakai 3 shell di bawah)
  PublicShell.tsx / KasirShell.tsx / MemberShell.tsx → pembungkus tiap section
  CameraCapture.tsx         → swafoto (dipakai absensi & feed member)
lib/
  types.ts                 → semua tipe data pusat
  auth.ts                  → sesi & password hashing (Web Crypto, Edge-compatible)
  jsonbin.ts               → akses JSONBin (teks/master data — TANPA produk/harga)
  supabase.ts              → akses Supabase (produk, harga, transaksi, rekap stok, feed)
  google-drive.ts          → upload/list foto (3 folder: attendance, products, feed)
  calc.ts                  → kalkulasi ml↔rupiah, harga botol, poin, diskon voucher
  wa-template.ts           → generate pesan & link WhatsApp
middleware.ts              → proteksi role-aware untuk semua halaman & API staff
supabase-schema.sql        → jalankan ini di Supabase SQL Editor
_reference/                → kode asli toko-vorie (acuan desain, tidak ikut build)
```

---

## Fitur yang Masih Belum Ada

Semua item dari list sebelumnya sudah beres. Sisa yang lebih ke arah "boleh
ditambah nanti" (bukan diminta eksplisit di awal):

| Fitur | Keterangan |
|---|---|
| Rating produk/transaksi (RatingModal) | Ada di kode referensi `_reference/toko-vorie-components`, belum diintegrasikan — sifatnya opsional. |
| Print struk fisik | E-Struk sengaja dibuat view-only (bukan print), sesuai permintaan awal. |


---

## Troubleshooting

| Masalah | Penyebab & Solusi |
|---|---|
| Foto gagal upload, error `storageQuotaExceeded` | Pastikan pakai setup **OAuth** (Langkah 3), bukan Service Account. |
| Foto gagal upload, error `insufficient permissions` / `File not found` | Folder Drive dan akun yang di-authorize di OAuth Playground harus akun Gmail yang sama. |
| Error `Gagal refresh token Google Drive` | Cek ulang `GOOGLE_OAUTH_CLIENT_ID` / `SECRET` / `REFRESH_TOKEN`. Kalau akses sudah dicabut manual, ulangi Langkah 3c. |
| Tidak bisa login staff sama sekali | Cek `SUPERADMIN_USERNAME` / `SUPERADMIN_PASSWORD` di `.env.local` sudah diisi dan sama persis (huruf besar/kecil berpengaruh). |
| Tambah karyawan gagal, "Cabang wajib dipilih" | Buat cabang dulu di tab **Cabang** sebelum menambah karyawan/admin baru. |
| Transaksi tidak masuk / error simpan transaksi | Cek `NEXT_PUBLIC_SUPABASE_URL` & `SUPABASE_SERVICE_KEY` benar, dan `supabase-schema.sql` sudah dijalankan di SQL Editor. |
| Voucher selalu invalid | Pastikan voucher berstatus aktif (`aktif: true`) di tab Voucher, belum expired, dan (kalau dicek per-member) belum pernah dipakai member yang sama. |
| Poin member tidak bertambah | Pastikan transaksi dilakukan dengan tipe **ecer** (grosir tidak dihitung poin/member) dan nomor WA member terisi benar saat checkout. |
| Upload logo/QRIS/foto produk gagal | Butuh setup Google Drive OAuth yang sama seperti Langkah 3, plus `GOOGLE_DRIVE_FOLDER_ID_PRODUCTS` sudah diisi. Cek juga akun yang login di OAuth Playground bukan akun Workspace yang membatasi share publik. |
| Posting foto di Member Area (feed) gagal | Pastikan `GOOGLE_DRIVE_FOLDER_ID_FEED` sudah dibuat & diisi di env (folder ke-3, terpisah dari attendance/products), dan tabel `feed_posts` sudah ada (jalankan ulang `supabase-schema.sql`). |
| Ganti password gagal, "akun ini login lewat SUPERADMIN..." | Itu bukan bug — akun superadmin dari `.env.local` memang tidak tersimpan sebagai data karyawan, jadi tidak bisa ganti lewat form. Ubah `SUPERADMIN_PASSWORD` di `.env.local` (dan redeploy kalau di Vercel). |
| Kamera absensi tidak bisa dibuka | Browser mewajibkan HTTPS untuk akses kamera (kecuali di `localhost`). Setelah deploy ke Vercel otomatis HTTPS. |
| Produk/harga kosong padahal dulu sudah diisi | Produk & harga sekarang disimpan di Supabase (tabel `products`, `pricing_config`), bukan JSONBin lagi — data lama di bin JSONBin **tidak otomatis ikut pindah**. Input ulang lewat tab Produk/Harga di `/admin/toko`, atau import ulang lewat Excel di tab Produk. |
| Data lama hilang setelah ganti Bin ID | Bin ID JSONBin menyimpan data masing-masing secara terpisah — jangan ganti-ganti Bin ID di `.env.local` setelah data mulai terisi. |
