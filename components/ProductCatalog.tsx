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
  onRestock,
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
  /** Kalau diisi (mode kasir): tampilkan tombol "+ Tambah Stok" di SETIAP
   * produk (bukan cuma pas habis) — karyawan input berapa ml mau ditambah
   * sendiri, dipanggil dengan (productId, ml) dan HARUS resolve setelah
   * stok berhasil ditambah biar sisa stok ke-refresh. Sengaja tidak
   * digantung pada kondisi habis lagi: stok in dari karyawan harus langsung
   * jadi stok jual kapan pun, bukan cuma dibolehkan pas kepepet 0. */
  onRestock?: (productId: string, ml: number) => Promise<void>;
}) {
  const [cari, setCari] = useState('');
  const [kategori, setKategori] = useState('');
  const [restockingId, setRestockingId] = useState<string | null>(null);
  const [restockMl, setRestockMl] = useState('');
  const [restockSubmitting, setRestockSubmitting] = useState(false);
  const [restockError, setRestockError] = useState<string | null>(null);

  async function submitRestock(productId: string) {
    if (!onRestock) return;
    const ml = Number(restockMl);
    if (!ml || ml <= 0) return setRestockError('Isi jumlah ml dulu.');
    setRestockSubmitting(true);
    setRestockError(null);
    try {
      await onRestock(productId, ml);
      setRestockingId(null);
      setRestockMl('');
    } catch (err: any) {
      setRestockError(err.message || 'Gagal menambah stok.');
    } finally {
      setRestockSubmitting(false);
    }
  }

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
            // Dulu cuma nyala kalau `habis` — sekarang selalu nyala di mode
            // kasir biar karyawan bisa nambah stok kapan aja, gak cuma pas
            // stoknya udah 0 (biar gak ada lagi jeda "stok numpuk" nunggu
            // admin input resmi sebelum bisa dijual).
            const bisaTopup = stockMode === 'kasir' && !!onRestock;
            const sedangRestock = restockingId === p.id;
            return (
              <div
                key={p.id}
                className="ticket flex flex-col overflow-hidden p-0 text-left transition hover:-translate-y-0.5"
              >
                <button
                  onClick={() => onSelectProduct(p)}
                  disabled={habis}
                  className="flex flex-col text-left disabled:opacity-50"
                >
                  <div className="aspect-square w-full bg-paper">
                    {img ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={img} alt={p.nama} className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full items-center justify-center text-2xl">🧴</div>
                    )}
                  </div>
                  <div className="p-2.5 pb-1">
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

                {bisaTopup && !sedangRestock && (
                  <button
                    onClick={() => {
                      setRestockingId(p.id);
                      setRestockMl('');
                      setRestockError(null);
                    }}
                    className="mx-2.5 mb-2.5 rounded-lg border border-dashed border-accent/50 py-1.5 text-[11px] font-semibold text-accent"
                  >
                    + Tambah Stok
                  </button>
                )}
                {bisaTopup && sedangRestock && (
                  <div className="mx-2.5 mb-2.5 space-y-1.5">
                    <input
                      type="number"
                      autoFocus
                      value={restockMl}
                      onChange={(e) => setRestockMl(e.target.value)}
                      placeholder="ml"
                      className="w-full rounded-lg border border-accent/40 px-2 py-1 text-xs outline-none"
                    />
                    {restockError && <p className="text-[10px] text-danger">{restockError}</p>}
                    <div className="flex gap-1">
                      <button
                        onClick={() => setRestockingId(null)}
                        className="flex-1 rounded-lg border border-ink/15 py-1 text-[10px] text-ink/50"
                      >
                        Batal
                      </button>
                      <button
                        onClick={() => submitRestock(p.id)}
                        disabled={restockSubmitting}
                        className="flex-1 rounded-lg bg-accent py-1 text-[10px] font-semibold text-white disabled:opacity-50"
                      >
                        {restockSubmitting ? '...' : 'Simpan'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
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
