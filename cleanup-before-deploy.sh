#!/usr/bin/env bash
# ============================================================
# cleanup-before-deploy.sh — BAW Group project
#
# Membersihkan file bermasalah/sampah SEBELUM kamu deploy:
#
#   1) File "nyasar" hasil auto-save/duplikat dari editor — polanya nama
#      file asli + garis bawah + angka panjang (timestamp), contoh:
#        app/api/pricing/route_1784907962810.ts
#      File ini ikut ke-typecheck pas `next build` walau nggak pernah
#      benar-benar dipakai sebagai route, jadi bikin build gagal kalau
#      isinya beda/ketinggalan dari file aslinya.
#      -> dipindah ke .trash-cleanup/ (di-review dulu)
#
#   2) Halaman yang ke-duplikat karena pindah ke route group, misalnya
#      app/belanja/page.tsx (lama) vs app/(store)/belanja/page.tsx (baru)
#      -> keduanya resolve ke URL yang sama, Next.js nolak build.
#      -> dipindah ke .trash-cleanup/ (di-review dulu)
#
#   3) Sampah OS/editor yang nggak pernah punya alasan buat ada di source
#      code: .DS_Store, Thumbs.db, file swap vim (.swp/.swo), backup editor
#      (.orig/.bak/~) -> DIHAPUS PERMANEN langsung, nggak perlu di-review.
#
#   4) File "Copy"/duplikat ala editor: "nama (1).tsx", "nama - Copy.tsx"
#      -> dipindah ke .trash-cleanup/ (di-review dulu, siapa tau memang
#      sengaja ada 2 file mirip)
#
# CARA PAKAI:
#   1. Taruh file ini di root folder project (sejajar dengan package.json)
#   2. jalankan:  bash cleanup-before-deploy.sh
#   3. Baca laporan yang muncul, lalu commit & deploy seperti biasa.
#
# Kategori 1, 2, dan 4 HANYA DIPINDAH ke folder .trash-cleanup/ (bukan
# dihapus permanen), jadi aman kalau ternyata ada yang salah deteksi —
# tinggal cek isi .trash-cleanup/ lalu hapus foldernya kalau memang
# sudah tidak dibutuhkan. Kategori 3 dihapus permanen karena memang
# tidak mungkin ada gunanya (bukan hasil kerjaan siapa pun).
# ============================================================

set -uo pipefail

if [ ! -f "package.json" ]; then
  echo "❌ Jalankan script ini dari root folder project (sejajar package.json)."
  exit 1
fi

TRASH=".trash-cleanup/$(date +%Y%m%d-%H%M%S)"
mkdir -p "$TRASH"
FOUND=0

echo "🔍 Mencari file nyasar (nama_ANGKAPANJANG.ext) di app/, lib/, components/, middleware.ts ..."
echo

# ---------- 1) File dengan suffix angka panjang (timestamp) ----------
# Pola: sesuatu_<10+ digit>.ts/tsx/js/jsx, mis. route_1784907962810.ts
while IFS= read -r -d '' f; do
  dir=$(dirname "$f")
  base=$(basename "$f")
  ext="${base##*.}"
  # nama tanpa suffix _<angka>, mis: route_1784907962810.ts -> route.ts
  canonical_base=$(echo "$base" | sed -E 's/_[0-9]{6,}\.([a-zA-Z0-9]+)$/.\1/')
  canonical="$dir/$canonical_base"

  if [ "$canonical_base" != "$base" ]; then
    FOUND=$((FOUND+1))
    echo "⚠️  Ditemukan file mencurigakan:"
    echo "    $f"
    if [ -f "$canonical" ]; then
      echo "    -> ada versi 'asli'-nya: $canonical (dipertahankan)"
      echo "    -> memindahkan yang nyasar ke $TRASH/"
      mkdir -p "$TRASH/$dir"
      mv "$f" "$TRASH/$f"
    else
      echo "    -> TIDAK ada versi tanpa suffix di folder yang sama."
      echo "    -> file ini TIDAK dipindah otomatis, cek manual dulu (mungkin ini satu-satunya salinan yang valid)."
    fi
    echo
  fi
done < <(find app lib components middleware.ts -type f \
    \( -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" \) \
    -regextype posix-extended -regex '.*_[0-9]{6,}\.(ts|tsx|js|jsx)$' -print0 2>/dev/null)

if [ "$FOUND" -eq 0 ]; then
  echo "✅ Tidak ada file nyasar dengan pola nama_angka ditemukan."
fi
echo

# ---------- 2) Halaman duplikat akibat pindah ke route group ----------
# Cek tiap app/(xxx)/**/page.tsx, lihat apakah ada padanan tanpa
# route group di path yang sama (app/**/page.tsx) yang resolve ke URL sama.
echo "🔍 Mencari halaman page.tsx yang dobel karena route group ( ) ..."
echo

DUPES_FOUND=0
while IFS= read -r -d '' grouped; do
  # ambil path setelah route group dihapus, mis:
  # app/(store)/belanja/page.tsx -> app/belanja/page.tsx
  stripped=$(echo "$grouped" | sed -E 's#/\([^/]+\)/#/#')
  if [ "$stripped" != "$grouped" ] && [ -f "$stripped" ]; then
    DUPES_FOUND=$((DUPES_FOUND+1))
    echo "⚠️  Route ganda terdeteksi (dua-duanya resolve ke URL yang sama):"
    echo "    Baru : $grouped"
    echo "    Lama : $stripped"
    echo "    -> memindahkan yang LAMA ke $TRASH/ (yang di dalam route group dipertahankan)"
    dir=$(dirname "$stripped")
    mkdir -p "$TRASH/$dir"
    mv "$stripped" "$TRASH/$stripped"
    # hapus folder lama kalau jadi kosong
    rmdir --ignore-fail-on-non-empty "$dir" 2>/dev/null || true
    echo
  fi
done < <(find app -type f -path "*/(*)/*page.tsx" -print0 2>/dev/null)

if [ "$DUPES_FOUND" -eq 0 ]; then
  echo "✅ Tidak ada halaman dobel akibat route group ( ) ditemukan."
fi
echo

# ---------- 3) Sampah OS/editor — AMAN DIHAPUS PERMANEN ----------
# File-file ini nggak pernah punya alasan buat ada di source code (bukan
# hasil kerjaan siapa-siapa, cuma noise dari OS/editor) — jadi beda dari
# kategori di atas, yang ini langsung DIHAPUS PERMANEN, bukan dipindah ke
# trash. Termasuk: .DS_Store, Thumbs.db, file swap vim (.swp/.swo), file
# backup editor (~ di akhir nama, .orig, .bak).
echo "🔍 Mencari sampah OS/editor (.DS_Store, Thumbs.db, .swp, ~backup) ..."
echo

JUNK_FOUND=0
while IFS= read -r -d '' f; do
  JUNK_FOUND=$((JUNK_FOUND+1))
  echo "🗑️  Menghapus permanen: $f"
  rm -f -- "$f"
done < <(find . \
    -path ./node_modules -prune -o \
    -path ./.next -prune -o \
    -path ./.git -prune -o \
    -path ./.trash-cleanup -prune -o \
    -type f \( \
      -name ".DS_Store" -o \
      -name "Thumbs.db" -o \
      -name "*.swp" -o \
      -name "*.swo" -o \
      -name "*.orig" -o \
      -name "*.bak" -o \
      -name "*~" \
    \) -print0 2>/dev/null)

if [ "$JUNK_FOUND" -eq 0 ]; then
  echo "✅ Tidak ada sampah OS/editor ditemukan."
else
  echo "✅ $JUNK_FOUND file sampah OS/editor dihapus permanen (tidak perlu di-review, ini bukan hasil kerjaan siapa pun)."
fi
echo

# ---------- 4) File "Copy"/duplikat hasil download-ulang editor ----------
# Pola umum kalau kamu drag-drop file yang sama 2x ke folder yang sama, atau
# save-as tanpa sengaja: "nama (1).tsx", "nama - Copy.tsx", "nama copy.ts".
# Ini MASIH dipindah ke trash dulu (bukan dihapus permanen) karena ada
# kemungkinan kecil memang sengaja ada 2 file mirip.
echo "🔍 Mencari file 'Copy'/duplikat ala editor (nama (1).ext, nama - Copy.ext) ..."
echo

COPY_FOUND=0
while IFS= read -r -d '' f; do
  COPY_FOUND=$((COPY_FOUND+1))
  dir=$(dirname "$f")
  echo "⚠️  Kemungkinan file duplikat: $f"
  echo "    -> memindahkan ke $TRASH/"
  mkdir -p "$TRASH/$dir"
  mv "$f" "$TRASH/$f"
  echo
done < <(find app lib components -type f \
    -regextype posix-extended \
    -regex '.*( \([0-9]+\)| - [Cc]opy| [Cc]opy)\.(ts|tsx|js|jsx|css)$' \
    -print0 2>/dev/null)

if [ "$COPY_FOUND" -eq 0 ]; then
  echo "✅ Tidak ada file 'Copy'/duplikat ala editor ditemukan."
fi
echo

# ---------- 5) Ringkasan ----------
echo "============================================================"
if [ "$FOUND" -eq 0 ] && [ "$DUPES_FOUND" -eq 0 ] && [ "$JUNK_FOUND" -eq 0 ] && [ "$COPY_FOUND" -eq 0 ]; then
  echo "✅ Project sudah bersih, tidak ada yang dipindah/dihapus. Aman untuk build/deploy."
  rmdir "$TRASH" 2>/dev/null || true
else
  if [ "$FOUND" -gt 0 ] || [ "$DUPES_FOUND" -gt 0 ] || [ "$COPY_FOUND" -gt 0 ]; then
    echo "🧹 File yang PERLU DI-REVIEW dipindah ke: $TRASH/"
    echo "   (bukan dihapus permanen — cek dulu isinya kalau ragu, baru hapus foldernya)"
  fi
  if [ "$JUNK_FOUND" -gt 0 ]; then
    echo "🗑️  $JUNK_FOUND sampah OS/editor sudah dihapus permanen (tidak perlu di-review)."
  fi
  echo "   Setelah ini, jalankan build lokal dulu buat mastiin:"
  echo "     npm run build"
fi
echo "============================================================"
