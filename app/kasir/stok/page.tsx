'use client';

import { useEffect, useMemo, useState } from 'react';

type Session = { role: string; nama: string; cabangId: string | null; username: string };
type Product = { id: string; nama: string; kode: string };
type Periode = 'harian' | 'bulanan' | 'tahunan';

type ProductStockUsage = { productId: string; nama: string; kode: string; masukMl: number; keluarMl: number; net: number };
type KodeStockGroup = { kode: string; produk: ProductStockUsage[]; totalMasukMl: number; totalKeluarMl: number; totalNet: number };
type Snapshot = { productId: string; yearMonth: string; stokAwal: number | null; stokAkhir: number | null };

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}
function thisMonthStr() {
  return todayStr().slice(0, 7);
}

function rangeForPeriode(periode: Periode, tanggal: string): { from: string; to: string } {
  if (periode === 'harian') return { from: tanggal, to: tanggal };
  if (periode === 'bulanan') {
    const [y, m] = tanggal.split('-').map(Number);
    const lastDay = new Date(y, m, 0).getDate();
    return { from: `${tanggal}-01`, to: `${tanggal}-${String(lastDay).padStart(2, '0')}` };
  }
  // tahunan
  return { from: `${tanggal}-01-01`, to: `${tanggal}-12-31` };
}

export default function StokKasirPage() {
  const [session, setSession] = useState<Session | null>(null);
  const [products, setProducts] = useState<Product[]>([]);

  // ---- Input stok masuk (KG) ----
  const [productId, setProductId] = useState('');
  const [kg, setKg] = useState('');
  const [tanggalMasuk, setTanggalMasuk] = useState(todayStr());
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // ---- Rekap ----
  const [periode, setPeriode] = useState<Periode>('harian');
  const [periodeKey, setPeriodeKey] = useState(todayStr());
  const [groups, setGroups] = useState<KodeStockGroup[]>([]);
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [loadingRecap, setLoadingRecap] = useState(true);

  // ---- Stok awal/akhir (bulanan saja) ----
  const [snapshotProductId, setSnapshotProductId] = useState('');
  const [stokAwal, setStokAwal] = useState('');
  const [stokAkhir, setStokAkhir] = useState('');
  const [savingSnapshot, setSavingSnapshot] = useState(false);
  const [snapshotMsg, setSnapshotMsg] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/auth/me').then((r) => r.json()).then((d) => setSession(d.session));
    fetch('/api/products').then((r) => r.json()).then((d) => setProducts(d.products || []));
  }, []);

  function loadRecap() {
    setLoadingRecap(true);
    const { from, to } = rangeForPeriode(periode, periodeKey);
    fetch(`/api/stock-summary?from=${from}&to=${to}`)
      .then((r) => r.json())
      .then((d) => {
        setGroups(d.groups || []);
        setSnapshots(d.snapshots || []);
      })
      .finally(() => setLoadingRecap(false));
  }
  useEffect(loadRecap, [periode, periodeKey]);

  function handlePeriodeChange(p: Periode) {
    setPeriode(p);
    setPeriodeKey(p === 'harian' ? todayStr() : p === 'bulanan' ? thisMonthStr() : String(new Date().getFullYear()));
  }

  const mlPreview = useMemo(() => {
    const n = Number(kg);
    return n > 0 ? n * 1000 : 0;
  }, [kg]);

  async function submitMasuk() {
    setError(null);
    setMsg(null);
    if (!productId) return setError('Pilih produk dulu.');
    if (!kg || Number(kg) <= 0) return setError('Isi jumlah KG yang masuk.');
    setSubmitting(true);
    try {
      const res = await fetch('/api/stock-movements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId, kg: Number(kg), tanggal: tanggalMasuk }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal menyimpan stok masuk');
      setMsg(`Stok masuk tersimpan: ${kg} kg (${mlPreview} ml).`);
      setKg('');
      loadRecap();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function submitSnapshot() {
    setSnapshotMsg(null);
    if (!snapshotProductId) return setSnapshotMsg('Pilih produk dulu.');
    if (stokAwal === '' && stokAkhir === '') return setSnapshotMsg('Isi stok awal atau stok akhir.');
    setSavingSnapshot(true);
    try {
      const res = await fetch('/api/stock-snapshot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: snapshotProductId,
          yearMonth: periode === 'bulanan' ? periodeKey : thisMonthStr(),
          stokAwal: stokAwal === '' ? undefined : Number(stokAwal),
          stokAkhir: stokAkhir === '' ? undefined : Number(stokAkhir),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal menyimpan stok awal/akhir');
      setSnapshotMsg('Stok awal/akhir tersimpan.');
      setStokAwal('');
      setStokAkhir('');
      loadRecap();
    } catch (err: any) {
      setSnapshotMsg(err.message);
    } finally {
      setSavingSnapshot(false);
    }
  }

  function snapshotFor(productId: string) {
    return snapshots.find((s) => s.productId === productId);
  }

  return (
    <main className="mx-auto max-w-md space-y-4 px-4 py-6">
      <h1 className="font-display text-lg font-semibold text-ink">Stok Cabang</h1>
      <p className="-mt-2 text-xs text-ink/50">
        Input stok baru datang dalam KG — sistem otomatis mengonversi ke ML (1 kg = 1000 ml). Stok berkurang otomatis
        mengikuti penjualan harian, bulanan, dan tahunan.
      </p>

      {/* ---- Input stok masuk ---- */}
      <div className="ticket space-y-3 p-4">
        <h2 className="font-display text-sm font-semibold text-ink">Input Stok Masuk</h2>
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
          <label className="mb-1 block text-xs font-medium text-ink/60">Tanggal Masuk</label>
          <input
            type="date"
            value={tanggalMasuk}
            onChange={(e) => setTanggalMasuk(e.target.value)}
            className="w-full rounded-lg border border-ink/15 px-3 py-2 text-sm outline-none focus:border-accent"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-ink/60">Jumlah (KG)</label>
          <input
            type="number"
            step="0.01"
            value={kg}
            onChange={(e) => setKg(e.target.value)}
            placeholder="mis. 1"
            className="w-full rounded-lg border border-ink/15 px-3 py-2 text-sm outline-none focus:border-accent"
          />
          {mlPreview > 0 && <p className="mt-1 text-[11px] text-ink/40">= {mlPreview.toLocaleString('id-ID')} ml</p>}
        </div>
        {error && <p className="text-xs text-danger">{error}</p>}
        {msg && <p className="text-xs text-accent">{msg}</p>}
        <button
          onClick={submitMasuk}
          disabled={submitting}
          className="w-full rounded-lg bg-accent py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          {submitting ? 'Menyimpan...' : 'Simpan Stok Masuk'}
        </button>
      </div>

      {/* ---- Pilih periode rekap ---- */}
      <div className="ticket space-y-3 p-4">
        <h2 className="font-display text-sm font-semibold text-ink">Rekap Stok</h2>
        <div className="flex gap-2">
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
        {periode === 'harian' && (
          <input
            type="date"
            value={periodeKey}
            onChange={(e) => setPeriodeKey(e.target.value)}
            className="w-full rounded-lg border border-ink/15 px-3 py-2 text-sm outline-none focus:border-accent"
          />
        )}
        {periode === 'bulanan' && (
          <input
            type="month"
            value={periodeKey}
            onChange={(e) => setPeriodeKey(e.target.value)}
            className="w-full rounded-lg border border-ink/15 px-3 py-2 text-sm outline-none focus:border-accent"
          />
        )}
        {periode === 'tahunan' && (
          <input
            type="number"
            value={periodeKey}
            onChange={(e) => setPeriodeKey(e.target.value)}
            placeholder="mis. 2026"
            className="w-full rounded-lg border border-ink/15 px-3 py-2 text-sm outline-none focus:border-accent"
          />
        )}

        {loadingRecap && <p className="text-xs text-ink/50">Memuat...</p>}
        {!loadingRecap && groups.length === 0 && (
          <p className="text-xs text-ink/40">Belum ada pergerakan stok (masuk/keluar) di periode ini.</p>
        )}

        {!loadingRecap &&
          groups.map((g) => (
            <div key={g.kode} className="rounded-lg border border-ink/10 p-3">
              <div className="flex items-center justify-between">
                <span className="font-display text-xs font-semibold text-ink">Kode: {g.kode}</span>
                <span className={`text-xs font-semibold ${g.totalNet < 0 ? 'text-danger' : 'text-accent'}`}>
                  Net {g.totalNet.toLocaleString('id-ID')} ml
                </span>
              </div>
              <table className="mt-2 w-full text-xs">
                <thead>
                  <tr className="text-left text-ink/40">
                    <th className="pb-1 font-normal">Nama Parfum</th>
                    <th className="pb-1 text-right font-normal">IN (ml)</th>
                    <th className="pb-1 text-right font-normal">OUT (ml)</th>
                  </tr>
                </thead>
                <tbody>
                  {g.produk.map((p) => {
                    const snap = snapshotFor(p.productId);
                    return (
                      <tr key={p.productId} className="border-t border-ink/5">
                        <td className="py-1 text-ink">{p.nama}</td>
                        <td className="py-1 text-right text-accent">+{p.masukMl.toLocaleString('id-ID')}</td>
                        <td className="py-1 text-right text-danger">-{p.keluarMl.toLocaleString('id-ID')}</td>
                        {periode !== 'harian' && snap && (snap.stokAwal !== null || snap.stokAkhir !== null) && (
                          <td className="py-1 text-right text-[10px] text-ink/40">
                            awal {snap.stokAwal ?? '-'} / akhir {snap.stokAkhir ?? '-'}
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ))}
      </div>

      {/* ---- Stok awal/akhir (bulanan) ---- */}
      {periode === 'bulanan' && (
        <div className="ticket space-y-3 p-4">
          <h2 className="font-display text-sm font-semibold text-ink">Stok Awal / Stok Akhir Bulan Ini</h2>
          <p className="-mt-1 text-[11px] text-ink/40">
            Opsional — dipakai untuk cek selisih/minus stok fisik. Stok awal boleh diisi kapan saja di awal bulan,
            stok akhir boleh diisi kapan saja di akhir bulan.
          </p>
          <select
            value={snapshotProductId}
            onChange={(e) => setSnapshotProductId(e.target.value)}
            className="w-full rounded-lg border border-ink/15 px-3 py-2 text-sm outline-none focus:border-accent"
          >
            <option value="">Pilih produk</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nama} ({p.kode})
              </option>
            ))}
          </select>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-ink/60">Stok Awal (ml)</label>
              <input
                type="number"
                value={stokAwal}
                onChange={(e) => setStokAwal(e.target.value)}
                className="w-full rounded-lg border border-ink/15 px-3 py-2 text-sm outline-none focus:border-accent"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-ink/60">Stok Akhir (ml)</label>
              <input
                type="number"
                value={stokAkhir}
                onChange={(e) => setStokAkhir(e.target.value)}
                className="w-full rounded-lg border border-ink/15 px-3 py-2 text-sm outline-none focus:border-accent"
              />
            </div>
          </div>
          {snapshotMsg && <p className="text-xs text-accent">{snapshotMsg}</p>}
          <button
            onClick={submitSnapshot}
            disabled={savingSnapshot}
            className="w-full rounded-lg bg-ink/90 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            {savingSnapshot ? 'Menyimpan...' : 'Simpan Stok Awal/Akhir'}
          </button>
        </div>
      )}
    </main>
  );
}
