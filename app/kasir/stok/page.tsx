'use client';

import { useEffect, useState } from 'react';

type Session = { role: string; nama: string; cabangId: string | null; username: string };
type Product = { id: string; nama: string; kode: string };
type Periode = 'harian' | 'bulanan' | 'tahunan';
type StockRecap = {
  id: string;
  cabangId: string;
  productId: string;
  periode: Periode;
  tanggal: string;
  stokAwal: number;
  stokAkhir: number;
  createdBy: string;
  createdAt: string;
};

const now = new Date();
const todayStr = now.toISOString().slice(0, 10); // YYYY-MM-DD
const thisMonthStr = todayStr.slice(0, 7); // YYYY-MM
const thisYearStr = String(now.getFullYear());

export default function KasirStokPage() {
  const [session, setSession] = useState<Session | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [recap, setRecap] = useState<StockRecap[]>([]);
  const [loadingRecap, setLoadingRecap] = useState(true);

  const [periode, setPeriode] = useState<Periode>('harian');
  const [tanggal, setTanggal] = useState(todayStr);
  const [productId, setProductId] = useState('');
  const [stokAwal, setStokAwal] = useState('');
  const [stokAkhir, setStokAkhir] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/auth/me').then((r) => r.json()).then((d) => setSession(d.session));
    fetch('/api/products').then((r) => r.json()).then((d) => setProducts(d.products || []));
  }, []);

  function loadRecap() {
    if (!session?.cabangId) return;
    setLoadingRecap(true);
    fetch(`/api/stock-recap?cabangId=${session.cabangId}&periode=${periode}`)
      .then((r) => r.json())
      .then((d) => setRecap(d.recap || []))
      .finally(() => setLoadingRecap(false));
  }

  useEffect(loadRecap, [session, periode]);

  function handlePeriodeChange(p: Periode) {
    setPeriode(p);
    setTanggal(p === 'harian' ? todayStr : p === 'bulanan' ? thisMonthStr : thisYearStr);
  }

  async function submit() {
    setError(null);
    setMsg(null);
    if (!session?.cabangId) {
      setError('Cabang tidak diketahui, login ulang.');
      return;
    }
    if (!productId) {
      setError('Pilih produk dulu.');
      return;
    }
    if (stokAwal === '' || stokAkhir === '') {
      setError('Isi stok awal dan stok akhir.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/stock-recap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cabangId: session.cabangId,
          productId,
          periode,
          tanggal,
          stokAwal: Number(stokAwal),
          stokAkhir: Number(stokAkhir),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal menyimpan rekap stok');
      setMsg('Rekap stok tersimpan.');
      setStokAwal('');
      setStokAkhir('');
      loadRecap();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  function namaProduk(id: string) {
    return products.find((p) => p.id === id)?.nama || id;
  }

  return (
    <main className="mx-auto max-w-md px-4 py-6 pb-24">
      <div className="flex items-center justify-between">
        <p className="text-xs uppercase tracking-widest text-accent">Kasir · {session?.nama}</p>
        <a href="/kasir" className="text-xs text-accent underline">
          ← Checkout
        </a>
      </div>
      <h1 className="mt-1 font-display text-2xl font-semibold text-ink">Input Stok</h1>

      <div className="ticket mt-4 flex gap-2 p-3">
        {(['harian', 'bulanan', 'tahunan'] as const).map((p) => (
          <button
            key={p}
            onClick={() => handlePeriodeChange(p)}
            className={`flex-1 rounded-lg py-2 text-xs font-semibold capitalize ${
              periode === p ? 'bg-accent text-white' : 'bg-paper text-ink/60'
            }`}
          >
            {p}
          </button>
        ))}
      </div>

      <div className="ticket mt-4 space-y-3 p-4">
        <div>
          <label className="mb-1 block text-xs font-medium text-ink/60">Produk</label>
          <select
            value={productId}
            onChange={(e) => setProductId(e.target.value)}
            className="w-full rounded-lg border border-ink/15 px-3 py-2 text-sm outline-none focus:border-accent"
          >
            <option value="">Pilih produk</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nama} ({p.kode})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-ink/60">
            {periode === 'harian' ? 'Tanggal' : periode === 'bulanan' ? 'Bulan' : 'Tahun'}
          </label>
          {periode === 'harian' && (
            <input
              type="date"
              value={tanggal}
              onChange={(e) => setTanggal(e.target.value)}
              className="w-full rounded-lg border border-ink/15 px-3 py-2 text-sm outline-none focus:border-accent"
            />
          )}
          {periode === 'bulanan' && (
            <input
              type="month"
              value={tanggal}
              onChange={(e) => setTanggal(e.target.value)}
              className="w-full rounded-lg border border-ink/15 px-3 py-2 text-sm outline-none focus:border-accent"
            />
          )}
          {periode === 'tahunan' && (
            <input
              type="number"
              value={tanggal}
              onChange={(e) => setTanggal(e.target.value)}
              placeholder="mis. 2026"
              className="w-full rounded-lg border border-ink/15 px-3 py-2 text-sm outline-none focus:border-accent"
            />
          )}
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="mb-1 block text-xs font-medium text-ink/60">Stok Awal</label>
            <input
              type="number"
              value={stokAwal}
              onChange={(e) => setStokAwal(e.target.value)}
              className="w-full rounded-lg border border-ink/15 px-3 py-2 text-sm outline-none focus:border-accent"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-ink/60">Stok Akhir</label>
            <input
              type="number"
              value={stokAkhir}
              onChange={(e) => setStokAkhir(e.target.value)}
              className="w-full rounded-lg border border-ink/15 px-3 py-2 text-sm outline-none focus:border-accent"
            />
          </div>
        </div>

        {error && <p className="text-sm text-danger">{error}</p>}
        {msg && <p className="text-sm text-accent">{msg}</p>}

        <button
          onClick={submit}
          disabled={submitting}
          className="w-full rounded-card bg-accent px-4 py-3 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
        >
          {submitting ? 'Menyimpan...' : 'Simpan Rekap Stok'}
        </button>
      </div>

      <div className="ticket mt-4 p-4">
        <h2 className="font-display text-sm font-semibold text-ink">
          Riwayat Rekap ({periode})
        </h2>
        {loadingRecap && <p className="mt-2 text-xs text-ink/50">Memuat...</p>}
        {!loadingRecap && recap.length === 0 && (
          <p className="mt-2 text-xs text-ink/40">Belum ada rekap untuk periode ini.</p>
        )}
        <ul className="mt-2 divide-y divide-ink/10 text-sm">
          {recap.map((r) => (
            <li key={r.id} className="py-2">
              <div className="flex justify-between">
                <span className="font-medium text-ink">{namaProduk(r.productId)}</span>
                <span className="text-ink/50">{r.tanggal}</span>
              </div>
              <div className="mt-0.5 flex justify-between text-xs text-ink/60">
                <span>
                  Awal: {r.stokAwal} → Akhir: {r.stokAkhir} (terpakai {r.stokAwal - r.stokAkhir})
                </span>
                <span>oleh {r.createdBy}</span>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
}
