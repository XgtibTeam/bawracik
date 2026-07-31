#!/usr/bin/env bash
# ============================================================
# cleanup-before-deploy.sh — BAW Group project
#
# Membersihkan 2 jenis masalah yang barusan bikin build gagal, SEBELUM
# kamu deploy lagi:
#
#   1) File "nyasar" hasil auto-save/duplikat dari editor — polanya nama
#      file asli + garis bawah + angka panjang (timestamp), contoh:
#        app/api/pricing/route_1784907962810.ts
#      File ini ikut ke-typecheck pas `next build` walau nggak pernah
#      benar-benar dipakai sebagai route, jadi bikin build gagal kalau
#      isinya beda/ketinggalan dari file aslinya.
#
#   2) Halaman yang ke-duplikat karena pindah ke route group, misalnya
#      app/belanja/page.tsx (lama) vs app/(store)/belanja/page.tsx (baru)
#      -> keduanya resolve ke URL yang sama, Next.js nolak build.
#
# CARA PAKAI:
#   1. Taruh file ini di root folder project (sejajar dengan package.json)
#   2. jalankan:  bash cleanup-before-deploy.sh
#   3. Baca laporan yang muncul, lalu commit & deploy seperti biasa.
#
# Defaultnya file HANYA DIPINDAH ke folder .trash-cleanup/ (bukan
# dihapus permanen), jadi aman kalau ternyata ada yang salah deteksi —
# tinggal cek isi .trash-cleanup/ lalu hapus foldernya kalau memang
# sudah tidak dibutuhkan.
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

# ---------- 3) Ringkasan ----------
echo "============================================================"
if [ "$FOUND" -eq 0 ] && [ "$DUPES_FOUND" -eq 0 ]; then
  echo "✅ Project sudah bersih, tidak ada yang dipindah. Aman untuk build/deploy."
  rmdir "$TRASH" 2>/dev/null || true
else
  echo "🧹 Selesai. File yang bermasalah dipindah ke: $TRASH/"
  echo "   (bukan dihapus permanen — cek dulu isinya kalau ragu, baru hapus foldernya)"
  echo "   Setelah ini, jalankan build lokal dulu buat mastiin:"
  echo "     npm run build"
fi
echo "============================================================"
