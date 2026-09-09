'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

type Session = { role: string; nama: string; cabangId: string | null; username: string };
type ParfumRow = { namaParfum: string; kode: string; ml: number; hargaPerMl: number; harga: number; susulan?: boolean };
type ParfumSection = { rows: ParfumRow[]; totalMl: number; totalHarga: number };
type BotolRow = { namaBotol: string; pcs: number; hargaJual: number };
type BotolSection = { rows: BotolRow[]; totalPcs: number; totalHarga: number };
type DailyData = {
  tanggal: string;
  namaKaryawan: string | null;
  refill: ParfumSection;
  botol: BotolSection;
  series: ParfumSection;
  grandTotalMl: number;
  grandTotalHarga: number;
  jumlahTransaksi: number;
  jumlahSusulan: number;
};

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

// Tabel REFILL/SERIES — persis kolom di rekap manual: Nama Parfum, Produk
// (kode), ML, Per ML, Harga. Baris yang berasal dari input susulan dikasih
// tanda kecil biar kelihatan bedanya.
function ParfumTable({ title, section }: { title: string; section: ParfumSection }) {
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

// Tabel BOTOL — kolom Nama Botol, PCS, Harga Jual (bukan produk isi ulang,
// tapi biaya botol yang nempel di transaksi/item hari itu).
function BotolTable({ section }: { section: BotolSection }) {
  return (
    <div className="rounded-lg border border-ink/10 p-3">
      <h3 className="font-display text-xs font-semibold text-ink">Botol</h3>
      {section.rows.length === 0 ? (
        <p className="mt-2 text-xs text-ink/40">Belum ada botol terjual hari ini.</p>
      ) : (
        <table className="mt-2 w-full text-xs">
          <thead>
            <tr className="text-left text-ink/40">
              <th className="pb-1 font-normal">Nama Botol</th>
              <th className="pb-1 text-right font-normal">PCS</th>
              <th className="pb-1 text-right font-normal">Harga Jual</th>
            </tr>
          </thead>
          <tbody>
            {section.rows.map((r, i) => (
              <tr key={i} className="border-t border-ink/5">
                <td className="py-1 text-ink">{r.namaBotol}</td>
                <td className="py-1 text-right text-ink/60">{r.pcs}</td>
                <td className="py-1 text-right text-ink">{r.hargaJual.toLocaleString('id-ID')}</td>
              </tr>
            ))}
            <tr className="border-t border-ink/15 font-semibold text-ink">
              <td className="py-1">TOTAL</td>
              <td className="py-1 text-right">{section.totalPcs}</td>
              <td className="py-1 text-right">{section.totalHarga.toLocaleString('id-ID')}</td>
            </tr>
          </tbody>
        </table>
      )}
    </div>
  );
}

export default function DataHarianTab({ session }: { session: Session | null }) {
  const router = useRouter();
  const [tanggal, setTanggal] = useState(todayStr());
  const [data, setData] = useState<DailyData | null>(null);
  const [loading, setLoading] = useState(true);

  // Export sengaja punya rentang tanggal SENDIRI (default: dari - sampai
  // tanggal yang lagi dilihat), karena hasilnya buat dicetak & dipotong per
  // hari — jadi wajar kalau mau export beberapa hari sekaligus (misal
  // seminggu), bukan cuma satu hari yang lagi ditampilkan di layar.
  const [exportFrom, setExportFrom] = useState(todayStr());
  const [exportTo, setExportTo] = useState(todayStr());
  const [exporting, setExporting] = useState(false);
  const [exportMsg, setExportMsg] = useState<string | null>(null);

  function load() {
    setLoading(true);
    fetch(`/api/reports/daily?tanggal=${tanggal}`)
      .then((r) => r.json())
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }
  useEffect(load, [tanggal]);
  useEffect(() => {
    setExportFrom(tanggal);
    setExportTo(tanggal);
  }, [tanggal]);

  // Export ke Excel — setiap TANGGAL dapet kotak/blok sendiri dengan garis
  // tabel penuh (REFILL / BOTOL / SERIES + sheet Total Akumulasi), disusun
  // ke bawah satu-satu — jadi tinggal print & gunting antar blok, gak perlu
  // dipisah manual lagi.
  async function exportExcel() {
    setExporting(true);
    setExportMsg(null);
    try {
      const params = new URLSearchParams({ from: exportFrom, to: exportTo });
      const res = await fetch(`/api/reports/daily-export?${params.toString()}`);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Gagal export.');
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const disposition = res.headers.get('Content-Disposition') || '';
      const match = disposition.match(/filename="(.+)"/);
      a.download = match ? match[1] : `Data-Harian-${exportFrom}_${exportTo}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      setExportMsg(err.message || 'Gagal export.');
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="ticket space-y-2 p-4">
        <h2 className="font-display text-sm font-semibold text-ink">Lupa input penjualan kemarin?</h2>
        <p className="-mt-1 text-xs text-ink/50">
          Buka halaman belanja seperti biasa, cuma nyalakan toggle "Input Susulan" & pilih tanggal kejadiannya —
          otomatis kehitung masuk rekap tanggal itu.
        </p>
        <button
          onClick={() => router.push('/kasir?susulan=1')}
          className="w-full rounded-lg bg-accent py-2 text-sm font-semibold text-white"
        >
          🕒 Input Penjualan Susulan
        </button>
      </div>

      <div className="ticket space-y-3 p-4">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-sm font-semibold text-ink">Data Harian — Penjualan Saya</h2>
          <input
            type="date"
            value={tanggal}
            onChange={(e) => setTanggal(e.target.value)}
            max={todayStr()}
            className="rounded-lg border border-ink/15 px-2 py-1.5 text-xs outline-none focus:border-accent"
          />
        </div>
        <p className="-mt-1 text-[11px] text-ink/40">
          Tabel mengikuti format rekap manual: REFILL / BOTOL / SERIES, kolom persis seperti file rekap lama.
        </p>

        {loading && <p className="text-xs text-ink/50">Memuat...</p>}
        {!loading && data && (
          <>
            <ParfumTable title="Refill" section={data.refill} />
            <BotolTable section={data.botol} />
            <ParfumTable title="Series" section={data.series} />
            <div className="flex items-center justify-between rounded-lg bg-paper px-3 py-2 text-sm font-semibold text-ink">
              <span>
                Total Keseluruhan ({data.jumlahTransaksi} transaksi
                {data.jumlahSusulan > 0 ? `, ${data.jumlahSusulan} susulan` : ''})
              </span>
              <span>
                {data.grandTotalMl.toLocaleString('id-ID')} ml — Rp{data.grandTotalHarga.toLocaleString('id-ID')}
              </span>
            </div>
          </>
        )}
      </div>

      <div className="ticket space-y-2 p-4">
        <h2 className="font-display text-sm font-semibold text-ink">Export ke Excel (siap print)</h2>
        <p className="-mt-1 text-[11px] text-ink/40">
          Tiap tanggal dapet kotak sendiri dengan garis tabel penuh — tinggal print & gunting antar kotak. Ada juga
          sheet "Total Akumulasi" (total ml terjual, digabung se-rentang tanggal).
        </p>
        <div className="flex gap-2">
          <div className="flex-1">
            <label className="mb-1 block text-[11px] text-ink/50">Dari</label>
            <input
              type="date"
              value={exportFrom}
              onChange={(e) => setExportFrom(e.target.value)}
              max={todayStr()}
              className="w-full rounded-lg border border-ink/15 px-2 py-1.5 text-xs outline-none focus:border-accent"
            />
          </div>
          <div className="flex-1">
            <label className="mb-1 block text-[11px] text-ink/50">Sampai</label>
            <input
              type="date"
              value={exportTo}
              onChange={(e) => setExportTo(e.target.value)}
              max={todayStr()}
              className="w-full rounded-lg border border-ink/15 px-2 py-1.5 text-xs outline-none focus:border-accent"
            />
          </div>
        </div>
        <button
          onClick={exportExcel}
          disabled={exporting}
          className="w-full rounded-lg bg-ink/90 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          {exporting ? 'Menyiapkan file...' : '⬇️ Export ke Excel (.xlsx)'}
        </button>
        {exportMsg && <p className="text-center text-xs text-danger">{exportMsg}</p>}
      </div>
    </div>
  );
}
