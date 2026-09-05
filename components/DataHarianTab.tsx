'use client';

import { useEffect, useState } from 'react';
import OutingStockTab from './OutingStockTab';

type Session = { role: string; nama: string; cabangId: string | null; username: string };
type Product = { id: string; nama: string; kode: string; kategori?: string; isBotol?: boolean };
type DailyRow = { namaParfum: string; kode: string; ml: number; hargaPerMl: number; harga: number };
type DailySection = { rows: DailyRow[]; totalMl: number; totalHarga: number };
type DailyData = {
  tanggal: string;
  namaKaryawan: string | null;
  refill: DailySection;
  botol: DailySection;
  series: DailySection;
  grandTotalMl: number;
  grandTotalHarga: number;
  jumlahTransaksi: number;
};

const KATEGORI_OPTIONS = ['biasa', 'premium', 'sultan', 'series'] as const;

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function SectionTable({ title, section }: { title: string; section: DailySection }) {
  return (
    <div className="rounded-lg border border-ink/10 p-3">
      <h3 className="font-display text-xs font-semibold text-ink">{title}</h3>
      {section.rows.length === 0 ? (
        <p className="mt-2 text-xs text-ink/40">Belum ada penjualan {title.toLowerCase()} hari ini.</p>
      ) : (
        <table className="mt-2 w-full text-xs">
          <thead>
            <tr className="text-left text-ink/40">
              <th className="pb-1 font-normal">Nama Parfum</th>
              <th className="pb-1 font-normal">Produk</th>
              <th className="pb-1 text-right font-normal">ML</th>
              <th className="pb-1 text-right font-normal">Per ML</th>
              <th className="pb-1 text-right font-normal">Harga</th>
            </tr>
          </thead>
          <tbody>
            {section.rows.map((r, i) => (
              <tr key={i} className="border-t border-ink/5">
                <td className="py-1 text-ink">{r.namaParfum}</td>
                <td className="py-1 text-ink/60">{r.kode}</td>
                <td className="py-1 text-right text-ink/60">{r.ml.toLocaleString('id-ID')}</td>
                <td className="py-1 text-right text-ink/60">{r.hargaPerMl.toLocaleString('id-ID')}</td>
                <td className="py-1 text-right text-ink">{r.harga.toLocaleString('id-ID')}</td>
              </tr>
            ))}
            <tr className="border-t border-ink/15 font-semibold text-ink">
              <td className="py-1" colSpan={2}>
                TOTAL
              </td>
              <td className="py-1 text-right">{section.totalMl.toLocaleString('id-ID')}</td>
              <td className="py-1" />
              <td className="py-1 text-right">{section.totalHarga.toLocaleString('id-ID')}</td>
            </tr>
          </tbody>
        </table>
      )}
    </div>
  );
}

// Form tambah produk sendiri oleh karyawan — duplikat dicek DALAM SATU KODE
// yang sama saja (server yang memutuskan lewat /api/products, di sini
// cuma menampilkan pesannya). Nama yang mirip (mis. "VS Scandalous" vs
// "Scandalous") di kode yang sama akan ditolak server dengan pesan jelas.
function TambahProdukForm({ onAdded }: { onAdded: () => void }) {
  const [nama, setNama] = useState('');
  const [kode, setKode] = useState('');
  const [kategori, setKategori] = useState<(typeof KATEGORI_OPTIONS)[number]>('biasa');
  const [isBotol, setIsBotol] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState<{ type: 'ok' | 'error'; text: string } | null>(null);

  async function submit() {
    setMsg(null);
    if (!nama.trim()) return setMsg({ type: 'error', text: 'Nama produk wajib diisi.' });
    if (!kode.trim()) return setMsg({ type: 'error', text: 'Kode produk wajib diisi (mis. R, Pr, Db, Dk).' });
    setSubmitting(true);
    try {
      const res = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nama: nama.trim(), kode: kode.trim(), kategori, isBotol }),
      });
      const data = await res.json();
      if (res.status === 409) {
        // Produk serupa sudah ada di kode yang sama -> skip, kasih peringatan.
        setMsg({ type: 'error', text: data.error });
        return;
      }
      if (!res.ok) throw new Error(data.error || 'Gagal menambah produk');
      setMsg({ type: 'ok', text: `Produk "${data.product.nama}" berhasil ditambahkan.` });
      setNama('');
      setKode('');
      onAdded();
    } catch (err: any) {
      setMsg({ type: 'error', text: err.message });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="ticket space-y-2 p-4">
      <h2 className="font-display text-sm font-semibold text-ink">+ Tambah Produk Baru</h2>
      <p className="-mt-1 text-[11px] text-ink/40">
        Kalau nama parfum sudah ada di kode produk yang sama, sistem akan menolak & kasih peringatan (jadi tidak perlu
        khawatir dobel) — kode lain tetap boleh punya nama yang mirip.
      </p>
      <input
        value={nama}
        onChange={(e) => setNama(e.target.value)}
        placeholder="Nama parfum, mis. VS Scandalous"
        className="w-full rounded-lg border border-ink/15 px-3 py-2 text-sm outline-none focus:border-accent"
      />
      <input
        value={kode}
        onChange={(e) => setKode(e.target.value)}
        placeholder="Kode produk, mis. Pr / R / Db / Dk"
        className="w-full rounded-lg border border-ink/15 px-3 py-2 text-sm outline-none focus:border-accent"
      />
      <div className="flex gap-2">
        <select
          value={kategori}
          onChange={(e) => setKategori(e.target.value as any)}
          className="flex-1 rounded-lg border border-ink/15 px-3 py-2 text-sm outline-none focus:border-accent capitalize"
        >
          {KATEGORI_OPTIONS.map((k) => (
            <option key={k} value={k} className="capitalize">
              {k}
            </option>
          ))}
        </select>
        <label className="flex items-center gap-2 rounded-lg border border-ink/15 px-3 py-2 text-sm text-ink/70">
          <input type="checkbox" checked={isBotol} onChange={(e) => setIsBotol(e.target.checked)} />
          Botol
        </label>
      </div>
      {msg && <p className={`text-xs ${msg.type === 'ok' ? 'text-accent' : 'text-danger'}`}>{msg.text}</p>}
      <button
        onClick={submit}
        disabled={submitting}
        className="w-full rounded-lg bg-ink/90 py-2 text-sm font-semibold text-white disabled:opacity-50"
      >
        {submitting ? 'Menyimpan...' : 'Tambah Produk'}
      </button>
    </div>
  );
}

export default function DataHarianTab({ session, products }: { session: Session | null; products: Product[] }) {
  const [innerTab, setInnerTab] = useState<'penjualan' | 'outing'>('penjualan');
  const [tanggal, setTanggal] = useState(todayStr());
  const [data, setData] = useState<DailyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  function load() {
    setLoading(true);
    fetch(`/api/reports/daily?tanggal=${tanggal}`)
      .then((r) => r.json())
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }
  useEffect(load, [tanggal, refreshKey]);

  return (
    <div className="space-y-4">
      <div className="ticket flex gap-2 p-3">
        {(
          [
            ['penjualan', 'Penjualan Saya'],
            ['outing', 'Outing Stock'],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setInnerTab(key)}
            className={`flex-1 rounded-lg py-2 text-xs font-semibold ${
              innerTab === key ? 'bg-accent text-white' : 'bg-paper text-ink/60'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {innerTab === 'penjualan' && (
        <>
          <TambahProdukForm onAdded={() => setRefreshKey((k) => k + 1)} />

          <div className="ticket space-y-3 p-4">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-sm font-semibold text-ink">Data Harian — Penjualan Saya</h2>
              <input
                type="date"
                value={tanggal}
                onChange={(e) => setTanggal(e.target.value)}
                className="rounded-lg border border-ink/15 px-2 py-1.5 text-xs outline-none focus:border-accent"
              />
            </div>
            <p className="-mt-1 text-[11px] text-ink/40">
              Tabel mengikuti format rekap manual: REFILL / BOTOL / SERIES, kolom Nama Parfum, Produk (kode), ML, Per
              ML, dan Harga.
            </p>

            {loading && <p className="text-xs text-ink/50">Memuat...</p>}
            {!loading && data && (
              <>
                <SectionTable title="Refill" section={data.refill} />
                <SectionTable title="Botol" section={data.botol} />
                <SectionTable title="Series" section={data.series} />
                <div className="flex items-center justify-between rounded-lg bg-paper px-3 py-2 text-sm font-semibold text-ink">
                  <span>Total Keseluruhan ({data.jumlahTransaksi} transaksi)</span>
                  <span>
                    {data.grandTotalMl.toLocaleString('id-ID')} ml — Rp{data.grandTotalHarga.toLocaleString('id-ID')}
                  </span>
                </div>
              </>
            )}
          </div>
        </>
      )}

      {innerTab === 'outing' && (
        <OutingStockTab
          mode="karyawan"
          products={products}
          currentUsername={session?.username}
          cabangId={session?.cabangId ?? undefined}
        />
      )}
    </div>
  );
}
