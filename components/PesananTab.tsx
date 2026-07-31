'use client';

import { useEffect, useState } from 'react';
import { driveImageUrl } from '@/lib/drive-url';

type PesananItem = { namaParfum: string; ml: number; hargaPerMl: number; ukuranBotolMl?: number; subtotal: number };
type Pesanan = {
  id: string;
  cabangId: string;
  items: PesananItem[];
  totalMl: number;
  totalHarga: number;
  tipe: 'grosir' | 'ecer';
  memberWa?: string;
  memberNama?: string;
  voucherCode?: string;
  buktiBayarUrl?: string;
  status: 'pending' | 'diterima' | 'selesai' | 'dihapus';
  createdAt: string;
};

export default function PesananTab() {
  const [list, setList] = useState<Pesanan[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'pending' | 'diterima' | 'selesai'>('pending');

  function load() {
    setLoading(true);
    fetch(`/api/pesanan?status=${filter}`)
      .then((r) => r.json())
      .then((d) => setList(d.pesanan || []))
      .finally(() => setLoading(false));
  }
  useEffect(load, [filter]);

  async function act(id: string, action: 'acc' | 'selesai' | 'hapus') {
    if (action === 'hapus' && !confirm('Yakin hapus pesanan ini? Tidak akan tercatat sebagai transaksi apa pun.')) return;
    setBusyId(id);
    setError(null);
    try {
      const res = await fetch('/api/pesanan', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, action }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal memproses pesanan');
      load();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-3">
      <div className="ticket flex gap-2 p-3">
        {(['pending', 'diterima', 'selesai'] as const).map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`flex-1 rounded-lg py-2 text-xs font-semibold capitalize ${
              filter === s ? 'bg-accent text-white' : 'bg-paper text-ink/60'
            }`}
          >
            {s === 'pending' ? 'Menunggu' : s === 'diterima' ? 'Diterima' : 'Selesai'}
          </button>
        ))}
      </div>

      {error && <p className="text-xs text-danger">{error}</p>}
      {loading && <p className="text-xs text-ink/50">Memuat...</p>}
      {!loading && list.length === 0 && (
        <p className="text-xs text-ink/40">Belum ada pesanan self-checkout di status ini.</p>
      )}

      {list.map((p) => (
        <div key={p.id} className="ticket space-y-2 p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wide text-ink/50">
              {new Date(p.createdAt).toLocaleString('id-ID')}
            </span>
            <span className="rounded-full bg-accentSoft px-2 py-0.5 text-[10px] font-semibold capitalize text-accent">
              {p.tipe}
            </span>
          </div>

          <ul className="divide-y divide-ink/10 text-sm">
            {p.items.map((it, i) => (
              <li key={i} className="flex justify-between py-1.5">
                <span>
                  {it.namaParfum} — {it.ml}ml{it.ukuranBotolMl ? ' + botol' : ''}
                </span>
                <span>Rp{it.subtotal.toLocaleString('id-ID')}</span>
              </li>
            ))}
          </ul>

          <div className="flex justify-between text-sm font-semibold text-ink">
            <span>Total ({p.totalMl}ml)</span>
            <span>Rp{p.totalHarga.toLocaleString('id-ID')}</span>
          </div>

          {(p.memberNama || p.memberWa) && (
            <p className="text-xs text-ink/60">
              Member: {p.memberNama || '-'} {p.memberWa ? `· ${p.memberWa}` : ''}
            </p>
          )}
          {p.voucherCode && <p className="text-xs text-accent">Voucher: {p.voucherCode}</p>}

          {p.buktiBayarUrl && (
            <div>
              <p className="text-xs font-medium text-ink/60">Bukti Bayar (QRIS):</p>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={driveImageUrl(p.buktiBayarUrl)} alt="Bukti bayar" className="mt-1 max-h-56 rounded-lg" />
            </div>
          )}

          <div className="flex gap-2 pt-1">
            {p.status === 'pending' && (
              <>
                <button
                  onClick={() => act(p.id, 'acc')}
                  disabled={busyId === p.id}
                  className="flex-1 rounded-lg bg-accent py-2 text-xs font-semibold text-white disabled:opacity-50"
                >
                  {busyId === p.id ? 'Memproses...' : 'ACC Pesanan'}
                </button>
                <button
                  onClick={() => act(p.id, 'hapus')}
                  disabled={busyId === p.id}
                  className="rounded-lg border border-danger/30 px-3 py-2 text-xs font-semibold text-danger disabled:opacity-50"
                >
                  Hapus
                </button>
              </>
            )}
            {p.status === 'diterima' && (
              <button
                onClick={() => act(p.id, 'selesai')}
                disabled={busyId === p.id}
                className="flex-1 rounded-lg bg-ink py-2 text-xs font-semibold text-white disabled:opacity-50"
              >
                {busyId === p.id ? 'Memproses...' : 'Tandai Selesai'}
              </button>
            )}
            {p.status === 'selesai' && <p className="text-xs text-accent">Selesai ✓</p>}
          </div>
        </div>
      ))}
    </div>
  );
}
