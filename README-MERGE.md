# BAW Group — Absensi + E-Member/Webstore (Struktur Gabungan)

Base project: `absensi-app` (Next.js 14 App Router + TypeScript). Komponen UI dari
`toko-vorie` di-stage di `_reference/` untuk diintegrasikan bertahap di fase berikutnya
(belum dipakai langsung supaya tidak mengganggu build sekarang).

## Yang sudah jadi di fase ini (struktur + skema data)

**`lib/types.ts`** — semua tipe data pusat: `Session`, `Branch`, `Employee`,
`StoreProfile`, `PricingConfig`, `Product`, `Member`, `Voucher`, `Transaction`,
`StockRecap`.

**`lib/auth.ts`** — auth di-generalisasi dari admin-only jadi 4 role:
`superadmin` (semua cabang), `admin` (per-cabang), `kasir`, `member` (login via WA).
Pakai Web Crypto (HMAC + PBKDF2), tetap Edge-compatible untuk `middleware.ts`.

**`lib/jsonbin.ts`** — data teks/master data: absensi, cabang, karyawan,
pengumuman, profil toko, harga (per-ml & botol), produk, member, voucher.
Ada migrasi otomatis dari format bin lama (`branches`/`employees` yang dulu
cuma `string[]`).

**`lib/supabase.ts`** + **`supabase-schema.sql`** — rekap transaksi & stok
disimpan relasional di Supabase (bukan storage foto). Jalankan
`supabase-schema.sql` di SQL Editor Supabase sebelum pakai.

**`lib/google-drive.ts`** — sekarang support 2 folder: `attendance` (sudah
ada) dan `products` (baru, untuk foto produk).

**`middleware.ts`** — proteksi role-aware untuk `/admin`, `/kasir`, `/member`,
dan semua API terkait.

**Auth API baru:**
- `POST /api/auth/staff-login` — login admin/kasir/superadmin (username+password)
- `POST /api/auth/member-login` — login/daftar member pakai nomor WA
- `POST /api/auth/logout` — logout semua role

**`.env.local.example`** — lengkap, semua variabel JSONBin/Drive/Supabase/Auth.

## Belum dikerjakan (fase berikutnya, sesuai urutan yang kamu pilih)

1. **Checkout/kasir** — kalkulasi ml↔harga, harga botol otomatis, form kasir,
   E-Struk, template WA member
2. **Member area** — profil, riwayat, voucher, kode referral (backend poin
   dasar sudah ada di `member-login`, UI & redeem belum)
3. **Dashboard admin** — grafik best-seller, rekap harian/bulanan/tahunan,
   import produk, tambah cabang, kelola voucher
4. Halaman `/kasir/login`, `/member/login`, `/kasir`, `/member` (belum dibuat,
   middleware sudah mengarah ke sana)

## Catatan migrasi data lama

- Bin `branches` lama (`string[]`) otomatis dikonversi ke `Branch[]` saat dibaca.
- Bin `employees` lama (`string[]` nama doang, tanpa password) **tidak bisa**
  dipakai login — perlu di-input ulang lewat panel admin baru dengan
  username+password+role+cabang.
- Set `SUPERADMIN_USERNAME` / `SUPERADMIN_PASSWORD` di `.env.local` supaya ada
  1 akun yang selalu bisa masuk untuk mulai buat akun admin/kasir lainnya.

## Referensi kode toko-vorie asli

Ada di `_reference/toko-vorie-components` dan `_reference/toko-vorie-pages`
(tidak ikut ke-build, di-exclude otomatis oleh pola `include` di `tsconfig.json`
yang cuma nangkep `.ts`/`.tsx`). Dipakai sebagai acuan pas port UI kasir/toko
di fase selanjutnya.
