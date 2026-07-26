'use client';

import { useEffect, useState } from 'react';

type MemberHistory = {
  tanggal: string;
  parfum: string[];
  totalMl: number;
  totalHarga: number;
  pengisianKe: number;
  poinDidapat: number;
  cabangId: string;
  transactionId: string;
};

type Member = {
  id: string;
  nama: string;
  wa: string;
  poinTotal: number;
  poinSaatIni: number;
  pengisianKe: number;
  totalPenukaran: number;
  riwayat: MemberHistory[];
  kodeReferral: string;
};

export default function MemberDashboardPage() {
  const [member, setMember] = useState<Member | null>(null);
  const [selectedStruk, setSelectedStruk] = useState<MemberHistory | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/auth/me')
      .then((r) => r.json())
      .then(async (d) => {
        if (!d.session || d.session.role !== 'member') {
          window.location.href = '/member/login';
          return;
        }
        const res = await fetch(`/api/members?wa=${encodeURIComponent(d.session.username)}`);
        const data = await res.json();
        setMember(data.member);
        setLoading(false);
      });
  }, []);

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    window.location.href = '/member/login';
  }

  if (loading) return <main className="p-6 text-sm text-ink/50">Memuat...</main>;
  if (!member) return <main className="p-6 text-sm text-danger">Data member tidak ditemukan.</main>;

  if (selectedStruk) {
    return (
      <main className="mx-auto max-w-md px-4 py-8">
        <button onClick={() => setSelectedStruk(null)} className="mb-4 text-sm text-accent">
          ← Kembali
        </button>
        <div className="ticket p-6">
          <h1 className="font-display text-lg font-semibold text-ink">E-Struk</h1>
          <p className="mt-1 text-xs text-ink/50">
            {new Date(selectedStruk.tanggal).toLocaleString('id-ID')}
          </p>
          <ul className="mt-3 space-y-1 text-sm text-ink">
            {selectedStruk.parfum.map((p, i) => (
              <li key={i}>• {p}</li>
            ))}
          </ul>
          <div className="mt-3 border-t border-ink/10 pt-3 text-sm">
            <p>Total ml: {selectedStruk.totalMl} ml</p>
            <p>Total bayar: Rp{selectedStruk.totalHarga.toLocaleString('id-ID')}</p>
            <p>Pengisian ke: {selectedStruk.pengisianKe}</p>
            <p>Poin didapat: {selectedStruk.poinDidapat}</p>
          </div>
          <p className="mt-3 text-xs text-ink/40">E-Struk ini hanya untuk dilihat (view-only).</p>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-md px-4 py-6 pb-16">
      <div className="ticket p-5">
        <p className="text-xs uppercase tracking-widest text-accent">Member Area</p>
        <h1 className="mt-1 font-display text-2xl font-semibold text-ink">{member.nama}</h1>
        <p className="text-sm text-ink/50">{member.wa}</p>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="rounded-lg bg-accentSoft p-3">
            <p className="text-xs text-ink/60">Poin Total (akumulasi)</p>
            <p className="font-display text-xl font-semibold text-accent">{member.poinTotal}</p>
          </div>
          <div className="rounded-lg bg-paper p-3">
            <p className="text-xs text-ink/60">Poin Saat Ini</p>
            <p className="font-display text-xl font-semibold text-ink">{member.poinSaatIni}</p>
          </div>
          <div className="rounded-lg bg-paper p-3">
            <p className="text-xs text-ink/60">Pengisian ke-</p>
            <p className="font-display text-xl font-semibold text-ink">{member.pengisianKe}/10</p>
          </div>
          <div className="rounded-lg bg-paper p-3">
            <p className="text-xs text-ink/60">Total Penukaran</p>
            <p className="font-display text-xl font-semibold text-ink">{member.totalPenukaran}</p>
          </div>
        </div>

        <div className="mt-4 rounded-lg bg-paper p-3">
          <p className="text-xs text-ink/60">Kode Referral Kamu</p>
          <p className="font-display text-lg font-semibold text-ink">{member.kodeReferral}</p>
          <p className="mt-1 text-xs text-ink/40">
            Bagikan kode ini — tiap teman yang daftar pakai kode ini, kamu dapat 10-15 poin bonus.
          </p>
        </div>
      </div>

      <div className="ticket mt-4 p-5">
        <h2 className="font-display text-sm font-semibold text-ink">Riwayat Belanja</h2>
        {member.riwayat.length === 0 && (
          <p className="mt-2 text-sm text-ink/40">Belum ada transaksi.</p>
        )}
        <ul className="mt-2 divide-y divide-ink/10">
          {[...member.riwayat].reverse().map((h, i) => (
            <li
              key={i}
              onClick={() => setSelectedStruk(h)}
              className="cursor-pointer py-3 text-sm hover:bg-paper"
            >
              <p className="font-medium text-ink">{h.parfum.join(', ')}</p>
              <p className="text-xs text-ink/50">
                {new Date(h.tanggal).toLocaleDateString('id-ID')} • {h.totalMl}ml • Rp
                {h.totalHarga.toLocaleString('id-ID')} • +{h.poinDidapat} poin
              </p>
            </li>
          ))}
        </ul>
      </div>

      <button
        onClick={logout}
        className="mt-4 w-full rounded-card border border-ink/15 px-4 py-3 text-sm font-semibold text-ink hover:bg-paper"
      >
        Keluar
      </button>
    </main>
  );
}
