'use client';

import { useEffect, useState } from 'react';

type Product = { id: string; nama: string; kode: string };
type OutingItem = {
  id: string;
  productId: string;
  namaProduk: string;
  kodeProduk: string;
  ml: number;
  tanggal: string;
  keterangan?: string;
  namaStaff: string;
  createdBy: string;
};

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

// Dipakai di dua tempat: tab "Data Harian" karyawan (mode="karyawan", cuma
// lihat/hapus catatan sendiri) dan tab "Rekap" admin (mode="admin", lihat
// semua staff di cabang itu, atau semua cabang kalau superadmin & pilih
// cabang lewat prop cabangId). Sengaja TIDAK bergantung pada penjualan —
// staff bisa input produk keluar kapan saja & pilih tanggal manapun,
// termasuk tanggal yang sudah lewat (susulan shift malam yang lupa input).
export default function OutingStockTab({
  mode,
  products,
  currentUsername,
  cabangId,
}: {
  mode: 'karyawan' | 'admin';
  products: Product[];
  currentUsername?: string;
  cabangId?: string;
}) {
  const [items, setItems] = useState<OutingItem[]>([]);
  const [loading, setLoading] = useState(true);

  const [productId, setProductId] = useState('');
  const [ml, setMl] = useState('');
  const [tanggal, setTanggal] = useState(todayStr());
  const [keterangan, setKeterangan] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState<{ type: 'ok' | 'error'; text: string } | null>(null);

  // Filter tanggal buat daftar riwayat (default: bulan berjalan)
  const [filterFrom, setFilterFrom] = useState(`${todayStr().slice(0, 7)}-01`);
  const [filterTo, setFilterTo] = useState(todayStr());

  function loadItems() {
    setLoading(true);
    const params = new URLSearchParams({ from: filterFrom, to: filterTo });
    if (mode === 'karyawan') params.set('mine', '1');
    if (cabangId) params.set('cabangId', cabangId);
    fetch(`/api/outing-stock?${params.toString()}`)
      .then((r) => r.json())
      .then((d) => setItems(Array.isArray(d.items) ? d.items : []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }
  useEffect(loadItems, [filterFrom, filterTo, cabangId, mode]);

  async function submit() {
    setMsg(null);
    if (!productId) return setMsg({ type: 'error', text: 'Pilih produk dulu.' });
    if (!ml || Number(ml) <= 0) return setMsg({ type: 'error', text: 'Isi jumlah ml yang keluar.' });
    setSubmitting(true);
    try {
      const res = await fetch('/api/outing-stock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId, ml: Number(ml), tanggal, keterangan, cabangId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal menyimpan');
      setMsg({ type: 'ok', text: 'Outing stock tersimpan.' });
      setProductId('');
      setMl('');
      setKeterangan('');
      loadItems();
    } catch (err: any) {
      setMsg({ type: 'error', text: err.message });
    } finally {
      setSubmitting(false);
    }
  }

  async function hapus(id: string) {
    if (!confirm('Hapus catatan outing stock ini?')) return;
    try {
      const res = await fetch('/api/outing-stock', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal menghapus');
      loadItems();
    } catch (err: any) {
      alert(err.message);
    }
  }

  const totalMl = items.reduce((s, i) => s + i.ml, 0);

  return (
    <div className="space-y-4">
      <div className="ticket space-y-3 p-4">
        <h2 className="font-display text-sm font-semibold text-ink">Input Outing Stock</h2>
        <p className="-mt-1 text-[11px] text-ink/40">
          Produk yang keluar TANPA transaksi penjualan (mis. testing customer, tumpah/rusak, atau susulan input shift
          malam yang lupa dicatat). Tanggal bebas dipilih — tidak harus hari ini.
        </p>
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
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="mb-1 block text-xs font-medium text-ink/60">Jumlah (ml)</label>
            <input
              type="number"
              value={ml}
              onChange={(e) => setMl(e.target.value)}
              placeholder="mis. 10"
              className="w-full rounded-lg border border-ink/15 px-3 py-2 text-sm outline-none focus:border-accent"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-ink/60">Tanggal</label>
            <input
              type="date"
              value={tanggal}
              onChange={(e) => setTanggal(e.target.value)}
              className="w-full rounded-lg border border-ink/15 px-3 py-2 text-sm outline-none focus:border-accent"
            />
          </div>
        </div>
        <input
          value={keterangan}
          onChange={(e) => setKeterangan(e.target.value)}
          placeholder="Keterangan (opsional) — mis. testing, tumpah"
          className="w-full rounded-lg border border-ink/15 px-3 py-2 text-sm outline-none focus:border-accent"
        />
        {msg && <p className={`text-xs ${msg.type === 'ok' ? 'text-accent' : 'text-danger'}`}>{msg.text}</p>}
        <button
          onClick={submit}
          disabled={submitting}
          className="w-full rounded-lg bg-accent py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          {submitting ? 'Menyimpan...' : 'Simpan Outing Stock'}
        </button>
      </div>

      <div className="ticket space-y-3 p-4">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-sm font-semibold text-ink">
            Riwayat {mode === 'karyawan' ? 'Saya' : 'Semua Staff'}
          </h2>
          <span className="text-xs font-semibold text-ink/60">Total {totalMl.toLocaleString('id-ID')} ml</span>
        </div>
        <div className="flex gap-2">
          <input
            type="date"
            value={filterFrom}
            onChange={(e) => setFilterFrom(e.target.value)}
            className="flex-1 rounded-lg border border-ink/15 px-2 py-1.5 text-xs outline-none focus:border-accent"
          />
          <input
            type="date"
            value={filterTo}
            onChange={(e) => setFilterTo(e.target.value)}
            className="flex-1 rounded-lg border border-ink/15 px-2 py-1.5 text-xs outline-none focus:border-accent"
          />
        </div>

        {loading && <p className="text-xs text-ink/50">Memuat...</p>}
        {!loading && items.length === 0 && <p className="text-xs text-ink/40">Belum ada catatan di periode ini.</p>}

        {!loading && items.length > 0 && (
          <ul className="divide-y divide-ink/10 text-sm">
            {items.map((it) => (
              <li key={it.id} className="flex items-center justify-between py-2">
                <div>
                  <p className="text-ink">
                    {it.namaProduk} <span className="text-ink/40">({it.kodeProduk})</span>
                  </p>
                  <p className="text-[11px] text-ink/40">
                    {it.tanggal} · {it.ml.toLocaleString('id-ID')} ml
                    {mode === 'admin' ? ` · ${it.namaStaff}` : ''}
                    {it.keterangan ? ` · ${it.keterangan}` : ''}
                  </p>
                </div>
                {(mode === 'admin' || it.createdBy === currentUsername) && (
                  <button onClick={() => hapus(it.id)} className="text-xs text-danger underline">
                    Hapus
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
