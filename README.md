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
7. [Langkah 4 — Setup Supabase (Produk, Feeds, Rekap Transaksi)](#langkah-4--setup-supabase-produk-feeds-rekap-transaksi)
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

> **Perbaikan penting (baca dulu):** ditemukan bug di sistem sesi login yang
> menyebabkan checkout & login member gagal — staff/member kelihatan berhasil
> login tapi langsung ke-redirect balik ke halaman login begitu pindah halaman.
> Ini sudah diperbaiki (detail di bagian Troubleshooting). Kalau kamu upgrade
> dari versi sebelumnya, **tidak perlu setup ulang apa pun** — cukup pakai kode
> yang baru.

- **Absensi karyawan** — swafoto, keterangan kehadiran, shift otomatis, rekap & ekspor Excel.
- **Kasir (`/kasir`)** — karyawan/admin checkout pelanggan: pilih produk dari
  **katalog** (bukan ketik manual), tap produk buka detail ala e-commerce (gambar,
  deskripsi, harga/ml, tombol checkout, tombol pakai botol dengan batas ukuran
  yang bisa diatur admin), grosir/ecer, cari/daftar member baru, pakai kode
  voucher, lanjut ke WhatsApp dengan template otomatis.
- **Belanja mandiri (`/belanja`)** — pelanggan checkout sendiri tanpa kasir, alur
  yang sama (katalog → detail produk → keranjang), pilih cabang, lihat
  QRIS/DANA/SeaBank, upload bukti bayar, lanjut ke WA.
- **Feeds Bawracik (`/feeds`)** — publik, **tanpa perlu login**, bisa like &
  komentar. Postingan hanya bisa ditambah/dihapus oleh staff lewat admin.
- **Member Area (`/member`)** — login pakai nomor WA, lihat poin total (tak pernah
  reset), poin saat ini (reset tiap 10x pengisian), kode referral, riwayat belanja,
  E-Struk per transaksi (view-only).
- **Admin (`/admin/toko`)** — kelola profil toko, logo (bisa lebih dari satu),
  susunan homepage, cabang, karyawan (+ role & password), produk (manual & import
  Excel, dengan deskripsi & gambar), harga per-ml/botol (+ batas ukuran botol),
  voucher, stok (harian/bulanan/tahunan), moderasi Feeds, rekap penjualan + grafik
  best-seller (by jumlah order) + export Excel.
- **Superadmin** — semua yang admin bisa, tapi lintas-cabang (tidak terikat 1 cabang).

**Prinsip penyimpanan data:**

| Jenis data | Disimpan di |
|---|---|
| Teks/master data (profil toko, cabang, karyawan, harga, member, voucher) | **JSONBin.io** |
| Produk (katalog + deskripsi), transaksi, rekap stok, logo homepage, Feeds (post/like/komentar) | **Supabase** (database) |
| Foto (swafoto absensi — privat; foto produk & feeds — publik) | **Google Drive** |

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
3. Buat **8 bin baru** (tombol **Create Bin**), masing-masing dengan isi awal berikut,
   lalu salin **Bin ID** setiap bin ke variabel env yang sesuai:

| Bin | Isi awal | Env variable |
|---|---|---|
| Absensi | `[]` | `JSONBIN_BIN_ID_ATTENDANCE` |
| Cabang | `[]` | `JSONBIN_BIN_ID_BRANCHES` |
| Karyawan | `[]` | `JSONBIN_BIN_ID_EMPLOYEES` |
| Pengumuman | `{"text": "", "updatedAt": null}` | `JSONBIN_BIN_ID_ANNOUNCEMENT` |
| Profil Toko | `{}` | `JSONBIN_BIN_ID_STORE_PROFILE` |
| Harga | `{}` | `JSONBIN_BIN_ID_PRICING` |
| Member | `[]` | `JSONBIN_BIN_ID_MEMBERS` |
| Voucher | `[]` | `JSONBIN_BIN_ID_VOUCHERS` |

> Bin **Profil Toko** dan **Harga** boleh dibiarkan `{}` — sistem otomatis mengisi
> nilai default (harga 2k–10k per ml, botol 3-35ml=5k / 36ml ke atas=10k, maks
> botol ecer 100ml, maks botol grosir 1000ml) saat pertama kali diakses.
>
> **Produk sekarang disimpan di Supabase**, bukan JSONBin lagi — supaya bisa
> nampung deskripsi produk dan dipakai sistem katalog/cart. Lihat Langkah 4.

---

## Langkah 3 — Setup Google Drive (Foto)

Google Drive dipakai untuk **3 folder terpisah**: foto swafoto absensi, foto
produk, dan foto feeds. Aplikasi login pakai **akun Gmail kamu sendiri lewat
OAuth** (bukan Service Account), supaya tidak kena error kuota penyimpanan.

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
4. Buat folder ketiga **"Feeds BAW Group"** → salin ID-nya → `GOOGLE_DRIVE_FOLDER_ID_FEEDS`.

> Foto di folder produk & feeds otomatis di-set **publik** (siapa saja dengan link
> bisa lihat) saat diupload — beda dari foto absensi yang sengaja privat.

---

## Langkah 4 — Setup Supabase (Produk, Feeds, Rekap Transaksi)

1. Daftar/login di https://supabase.com → **New Project** → tunggu sampai selesai dibuat.
2. Buka **Project Settings → API** → salin:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **service_role key** (bukan `anon` key!) → `SUPABASE_SERVICE_KEY`
3. Buka menu **SQL Editor** → **New query** → tempel seluruh isi file
   `supabase-schema.sql` (ada di root project ini) → klik **Run**.
   Ini membuat tabel: `products` (katalog + deskripsi), `transactions`,
   `stock_recap`, `store_logos` (logo homepage), dan `feed_posts` / `feed_likes`
   / `feed_comments` (fitur Feeds).

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
- **Produk** — tambah manual (nama, deskripsi, foto, harga jual, info botol) atau
  import Excel massal (kolom wajib: Nama Parfum, Deskripsi Produk). Tap produk di
  daftar untuk edit foto/deskripsi langsung.
- **Harga** — atur tier harga per-ml, harga botol otomatis by ukuran (3-35ml=5k,
  36ml ke atas=10k secara default), dan **batas ukuran botol maksimal** untuk
  ecer vs grosir (default 100ml / 1000ml).
- **Voucher** — buat kode voucher (5 digit otomatis), tipe persen atau potongan
  nominal, aktif/nonaktifkan.
- **Stok** — input stok awal/akhir per produk, per cabang (superadmin bisa pilih
  cabang mana saja), periode harian/bulanan/tahunan.
- **Feeds** — posting foto ke Feeds Bawracik (publik), dan moderasi (hapus
  postingan yang tidak pantas, lihat jumlah like/komentar).
- **Rekap & Grafik** — total transaksi, total ml, total pendapatan, grafik
  best-seller (**berdasarkan jumlah order terbanyak**), rekap per karyawan, dan
  tombol **Export Rekap ke Excel** (3 sheet: ringkasan, best-seller, per karyawan).

Panel absensi lama masih ada di `/admin` (rekap absensi, galeri foto, ekspor Excel,
papan pengumuman) — ada tombol **"Kelola Toko →"** untuk pindah ke `/admin/toko`.

---

## Cara Pakai — Kasir/Karyawan

1. Login di `/kasir/login`.
2. **Checkout (`/kasir`)** — alur 3 langkah: **(1) Parfum** pilih grosir/ecer,
   lalu **pilih produk dari katalog** (bukan ketik nama manual) — tap produk buka
   modal detail (gambar, deskripsi, pilih harga/ml, input rupiah **atau** ml
   otomatis dikonversi) → **Checkout ke Keranjang**. Centang **Pakai Botol** kalau
   perlu (harga otomatis by ukuran, dibatasi maks sesuai tipe ecer/grosir yang
   diatur admin) → **(2) Ringkasan** cek rincian pesanan & masukkan kode voucher
   kalau ada → **(3) Member & Bayar** kalau ecer, cari member by nomor WA (kalau
   belum terdaftar, isi nama untuk daftar member baru), lalu **Checkout** → tombol
   **Lanjutkan ke WA** membuka WhatsApp dengan template pesan terisi otomatis
   (nama, tanggal, parfum, harga, pengisian ke-berapa, poin).
   > Kalau katalog kosong, kasir tidak akan bisa checkout — pastikan admin sudah
   > menambahkan produk lewat `/admin/toko` tab Produk terlebih dulu.
3. **Input Stok (`/kasir/stok`)** — catat stok awal/akhir harian/bulanan/tahunan
   untuk cabangnya sendiri.
4. **Absen (`/kasir/absen`)** — form absensi swafoto seperti sebelumnya.
5. **Ganti Password (`/akun/password`)** — ganti password sendiri kapan saja (butuh
   password lama). Khusus akun superadmin bootstrap (dari `.env.local`), ganti
   langsung di `SUPERADMIN_PASSWORD` karena akun ini bukan data karyawan biasa.

---

## Cara Pakai — Member & Customer

- **Member** login di `/member/login` cukup pakai nomor WA (member baru otomatis
  didaftarkan, bisa isi kode referral teman untuk memberi bonus 10–15 poin ke
  pengundang). Dashboard menampilkan poin total, poin saat ini, pengisian ke-berapa,
  kode referral sendiri, riwayat belanja, dan E-Struk per transaksi (tap untuk
  lihat detail, view-only).
- **Customer/tamu** tanpa akun bisa langsung checkout di `/belanja`: pilih cabang
  pengisian, grosir/ecer, **pilih produk dari katalog** (tap untuk lihat
  gambar/deskripsi, atur harga/ml & jumlah, checkout ke keranjang), lihat
  QRIS/DANA/SeaBank, upload bukti bayar (opsional, untuk dikirim manual lewat WA),
  lalu lanjut ke WA.
- **Feeds (`/feeds`)** — siapa saja bisa buka tanpa login, like postingan (disimpan
  per-device lewat kode anonim di browser, atau per-nomor-WA kalau sedang login
  member) dan tulis komentar (cukup isi nama).

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
  page.tsx                 → Home (profil toko + galeri logo + section custom)
  belanja/page.tsx         → Etalase (katalog) + checkout mandiri customer
  feeds/page.tsx           → Feeds Bawracik (publik, like & komentar)
  akun/password/page.tsx   → Ganti password (staff yang sudah login)
  admin/
    login/page.tsx         → Login admin (form lama, tetap jalan)
    page.tsx               → Panel absensi (rekap, foto, ekspor, pengumuman)
    toko/page.tsx           → Dashboard toko (profil/homepage/cabang/karyawan/produk/harga/voucher/stok/feeds/rekap)
  kasir/
    login/page.tsx         → Login staff (admin/kasir/superadmin)
    page.tsx               → POS checkout kasir (katalog → keranjang → bayar)
    absen/page.tsx         → Form absensi (dipindah dari root)
    stok/page.tsx          → Input stok utk kasir cabang sendiri
  member/
    login/page.tsx         → Login member via nomor WA
    page.tsx               → Dashboard member
  api/                     → semua API route (lihat kode masing-masing untuk detail)
lib/
  types.ts                 → semua tipe data pusat
  auth.ts                  → sesi (btoa/atob, aman di Edge & Node) & password hashing
  jsonbin.ts               → akses JSONBin (teks/master data — TANPA produk)
  supabase.ts              → akses Supabase (produk, transaksi, rekap stok, logo, feeds)
  google-drive.ts          → upload/list foto (3 folder: attendance, products, feeds)
  calc.ts                  → kalkulasi ml↔rupiah, harga botol (+batas maks), poin, diskon voucher
  wa-template.ts           → generate pesan & link WhatsApp
middleware.ts              → proteksi role-aware untuk semua halaman & API staff
supabase-schema.sql        → jalankan ini di Supabase SQL Editor
_reference/                → kode asli toko-vorie (acuan desain, tidak ikut build)
```

---

## Fitur yang Masih Belum Ada

| Fitur | Keterangan |
|---|---|
| Rating produk/transaksi (RatingModal) | Ada di kode referensi `_reference/toko-vorie-components`, belum diintegrasikan — sifatnya opsional. |
| Print struk fisik | E-Struk sengaja dibuat view-only (bukan print), sesuai permintaan awal. |
| Redeem poin jadi produk/diskon otomatis | Poin & pengisian ke-10 sudah dihitung & ditampilkan, tapi belum ada tombol "tukar poin" otomatis di kasir — saat ini masih perlu ditangani manual oleh kasir. |

---

## Troubleshooting

| Masalah | Penyebab & Solusi |
|---|---|
| **Sudah login tapi ke-redirect balik ke halaman login** (kasir/admin/member) | Ini bug yang sudah diperbaiki (encoding sesi tidak kompatibel dengan Edge Runtime). Pastikan kamu pakai kode versi terbaru — kalau masih terjadi setelah update, hapus cookies browser dan login ulang. |
| Kasir/customer tidak bisa checkout, katalog kosong | Produk sekarang wajib diambil dari katalog (bukan ketik manual) — tambahkan produk dulu di `/admin/toko` tab **Produk**, minimal 1. |
| Admin tidak bisa pilih produk di tab Stok | Sama seperti di atas — tab Stok mengambil daftar dari katalog produk, jadi harus ada produk dulu. |
| Foto gagal upload, error `storageQuotaExceeded` | Pastikan pakai setup **OAuth** (Langkah 3), bukan Service Account. |
| Foto gagal upload, error `insufficient permissions` / `File not found` | Folder Drive dan akun yang di-authorize di OAuth Playground harus akun Gmail yang sama. |
| Error `Gagal refresh token Google Drive` | Cek ulang `GOOGLE_OAUTH_CLIENT_ID` / `SECRET` / `REFRESH_TOKEN`. Kalau akses sudah dicabut manual, ulangi Langkah 3c. |
| Tidak bisa login staff sama sekali | Cek `SUPERADMIN_USERNAME` / `SUPERADMIN_PASSWORD` di `.env.local` sudah diisi dan sama persis (huruf besar/kecil berpengaruh). |
| Tambah karyawan gagal, "Cabang wajib dipilih" | Buat cabang dulu di tab **Cabang** sebelum menambah karyawan/admin baru. |
| Transaksi tidak masuk / error simpan transaksi | Cek `NEXT_PUBLIC_SUPABASE_URL` & `SUPABASE_SERVICE_KEY` benar, dan `supabase-schema.sql` (versi terbaru, dengan tabel `products`) sudah dijalankan di SQL Editor. |
| Produk tidak muncul di katalog setelah import Excel | Cek nama kolom di file Excel persis **Nama Parfum** dan **Deskripsi Produk** (huruf besar/kecil bebas, tapi ejaan harus sama). Baris dengan nama yang sudah ada sebelumnya otomatis dilewati. |
| Voucher selalu invalid | Pastikan voucher berstatus aktif (`aktif: true`) di tab Voucher, belum expired, dan (kalau dicek per-member) belum pernah dipakai member yang sama. |
| Poin member tidak bertambah | Pastikan transaksi dilakukan dengan tipe **ecer** (grosir tidak dihitung poin/member) dan nomor WA member terisi benar saat checkout. |
| Upload logo/QRIS/foto produk/feeds gagal | Butuh setup Google Drive OAuth yang sama seperti Langkah 3, plus folder terkait (`GOOGLE_DRIVE_FOLDER_ID_PRODUCTS` / `GOOGLE_DRIVE_FOLDER_ID_FEEDS`) sudah diisi. Cek juga akun yang login di OAuth Playground bukan akun Workspace yang membatasi share publik. |
| Ganti password gagal, "akun ini login lewat SUPERADMIN..." | Itu bukan bug — akun superadmin dari `.env.local` memang tidak tersimpan sebagai data karyawan, jadi tidak bisa ganti lewat form. Ubah `SUPERADMIN_PASSWORD` di `.env.local` (dan redeploy kalau di Vercel). |
| Like/komentar Feeds tidak tersimpan | Pastikan tabel `feed_posts`/`feed_likes`/`feed_comments` sudah dibuat (jalankan ulang `supabase-schema.sql` kalau baru upgrade dari versi sebelumnya). |
| Kamera absensi tidak bisa dibuka | Browser mewajibkan HTTPS untuk akses kamera (kecuali di `localhost`). Setelah deploy ke Vercel otomatis HTTPS. |
| Data lama hilang setelah ganti Bin ID | Bin ID JSONBin menyimpan data masing-masing secara terpisah — jangan ganti-ganti Bin ID di `.env.local` setelah data mulai terisi. |
