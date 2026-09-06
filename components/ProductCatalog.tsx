'use client';

import { useState } from 'react';
import { driveImageUrl } from '@/lib/drive-url';

export type CatalogProduct = {
  id: string;
  nama: string;
  kode: string;
  kategori?: string;
  deskripsi?: string;
  isBotol?: boolean;
  hargaJual?: number;
  imageDriveId?: string;
};

const KATEGORI_OPTIONS = ['biasa', 'premium', 'sultan', 'series'] as const;

export default function ProductCatalog({
  products,
  stockMap,
  stockMode,
  hargaHint,
  onSelectProduct,
  onAddNewProduct,
}: {
  products: CatalogProduct[];
  /** sisa stok per productId — customer cuma butuh tau ada/habis, kasir butuh angka pastinya */
  stockMap?: Record<string, number | undefined>;
  stockMode: 'customer' | 'kasir';
  /** teks kecil harga per produk, mis. "mulai Rp2.000/ml" — opsional */
  hargaHint?: (p: CatalogProduct) => string;
  onSelectProduct: (p: CatalogProduct) => void;
  /** Kalau diisi (mode kasir): tampilkan tombol "+ Tambah produk baru" saat
   * produk yang dicari tidak ketemu, dipanggil dengan teks pencarian
   * sebagai nama awal. Tidak dipakai di katalog customer. */
  onAddNewProduct?: (namaAwal: string) => void;
}) {
  const [cari, setCari] = useState('');
  const [kategori, setKategori] = useState('');

  const filtered = products.filter((p) => {
    const matchCari = cari.trim()
      ? p.nama.toLowerCase().includes(cari.trim().toLowerCase()) || p.kode.toLowerCase().includes(cari.trim().toLowerCase())
      : true;
    const matchKategori = kategori ? p.kategori === kategori : true;
    return matchCari && matchKategori;
  });

  return (
    <div>
      <input
        value={cari}
        onChange={(e) => setCari(e.target.value)}
        placeholder="Cari nama/kode produk..."
        className="w-full rounded-lg border border-ink/15 bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-accent"
      />
      <div className="mt-2 flex flex-wrap gap-1.5">
        <button
          onClick={() => setKategori('')}
          className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${
            kategori === '' ? 'bg-accent text-white' : 'bg-paper text-ink/60'
          }`}
        >
          Semua
        </button>
        {KATEGORI_OPTIONS.map((k) => (
          <button
            key={k}
            onClick={() => setKategori(k)}
            className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${
              kategori === k ? 'bg-accent text-white' : 'bg-paper text-ink/60'
            }`}
          >
            {k}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="mt-3 space-y-2">
          <p className="text-sm text-ink/50">
            {products.length === 0 ? 'Belum ada produk di katalog.' : 'Tidak ada produk yang cocok.'}
          </p>
          {onAddNewProduct && cari.trim() && (
            <button
              onClick={() => onAddNewProduct(cari.trim())}
              className="w-full rounded-lg border border-dashed border-accent/50 py-2 text-xs font-semibold text-accent"
            >
              + Tambah "{cari.trim()}" sebagai produk baru
            </button>
          )}
        </div>
      ) : (
        <>
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {filtered.map((p) => {
            const img = driveImageUrl(p.imageDriveId);
            const sisa = stockMap ? stockMap[p.id] : undefined;
            const habis = sisa !== undefined && sisa <= 0;
            return (
              <button
                key={p.id}
                onClick={() => onSelectProduct(p)}
                disabled={habis}
                className="ticket flex flex-col overflow-hidden p-0 text-left transition hover:-translate-y-0.5 disabled:opacity-50"
              >
                <div className="aspect-square w-full bg-paper">
                  {img ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={img} alt={p.nama} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full items-center justify-center text-2xl">🧴</div>
                  )}
                </div>
                <div className="p-2.5">
                  <p className="line-clamp-1 text-sm font-semibold text-ink">{p.nama}</p>
                  <p className="mt-0.5 line-clamp-2 text-xs text-ink/50">
                    {p.deskripsi || (p.isBotol ? 'Parfum isi ulang' : 'Produk')}
                  </p>
                  {hargaHint && <p className="mt-1.5 text-xs font-semibold text-accent">{hargaHint(p)}</p>}
                  {sisa !== undefined && stockMode === 'kasir' && (
                    <p className={`mt-1 text-[10px] font-semibold ${habis ? 'text-danger' : 'text-ink/40'}`}>
                      Sisa stok: {habis ? 'Habis' : `${sisa.toLocaleString('id-ID')} ml`}
                    </p>
                  )}
                  {sisa !== undefined && stockMode === 'customer' && (
                    <p className={`mt-1 text-[10px] font-semibold ${habis ? 'text-danger' : 'text-accent'}`}>
                      {habis ? 'Stok Habis' : 'Stok Tersedia'}
                    </p>
                  )}
                </div>
              </button>
            );
          })}
        </div>
        {onAddNewProduct && (
          <button
            onClick={() => onAddNewProduct(cari.trim())}
            className="mt-2 w-full rounded-lg border border-dashed border-ink/15 py-1.5 text-xs text-ink/50"
          >
            Produk yang dicari tidak ada di sini? + Tambah baru
          </button>
        )}
        </>
      )}
    </div>
  );
}
