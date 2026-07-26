'use client';

import { useEffect, useState } from 'react';
import { Pencil, Check, X, LogOut, Award } from 'lucide-react';

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

// Status/tier keanggotaan berdasarkan akumulasi poin total. Bisa disesuaikan
// admin lewat kode ini kalau mau ubah ambang batasnya.
const TIERS = [
  { min: 0, label: 'Bronze', color: 'text-amber-700 bg-amber-100' },
  { min: 100, label: 'Silver', color: 'text-slate-600 bg-slate-100' },
  { min: 300, label: 'Gold', color: 'text-amber-600 bg-amber-50' },
  { min: 700, label: 'Platinum', color: 'text-indigo-600 bg-indigo-50' },
];

function getTier(poinTotal: number) {
  return [...TIERS].reverse().find((t) => poinTotal >= t.min) || TIERS[0];
}

export default function MemberProfilPage() {
  const [member, setMember] = useState<Member | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedStruk, setSelectedStruk] = useState<MemberHistory | null>(null);

  const [editingNama, setEditingNama] = useState(false);
  const [namaInput, setNamaInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

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
        setNamaInput(data.member?.nama || '');
        setLoading(false);
      });
  }, []);

  async function simpanNama() {
    if (!namaInput.trim()) return;
    setSaving(true);
    setSaveError(null);
    try {
      const res = await fetch('/api/members', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nama: namaInput.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal menyimpan');
      setMember(data.member);
      setEditingNama(false);
    } catch (err: any) {
      setSaveError(err.message);
    } finally {
      setSaving(false);
    }
  }

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
          <p className="mt-1 text-xs text-ink/50">{new Date(selectedStruk.tanggal).toLocaleString('id-ID')}</p>
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

  const tier = getTier(member.poinTotal);

  return (
    <main className="mx-auto max-w-md px-4 py-6">
      <p className="text-xs uppercase tracking-widest text-accent">Member Area</p>
      <h1 className="mt-1 font-display text-2xl font-semibold text-ink">Profil</h1>

      <div className="ticket mt-4 p-5">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-accentSoft font-display text-xl font-semibold text-accent">
              {member.nama.charAt(0).toUpperCase()}
            </div>
            <div>
              {editingNama ? (
                <div className="flex items-center gap-1.5">
                  <input
                    value={namaInput}
                    onChange={(e) => setNamaInput(e.target.value)}
                    className="w-32 rounded-lg border border-ink/15 px-2 py-1 text-sm outline-none focus:border-accent"
                    autoFocus
                  />
                  <button onClick={simpanNama} disabled={saving} className="text-accent">
                    <Check size={16} />
                  </button>
                  <button
                    onClick={() => {
                      setEditingNama(false);
                      setNamaInput(member.nama);
                    }}
                    className="text-ink/40"
                  >
                    <X size={16} />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-1.5">
                  <h2 className="font-display text-lg font-semibold text-ink">{member.nama}</h2>
                  <button onClick={() => setEditingNama(true)} className="text-ink/30 hover:text-accent">
                    <Pencil size={13} />
                  </button>
                </div>
              )}
              <p className="text-sm text-ink/50">{member.wa}</p>
            </div>
          </div>
          <span className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold ${tier.color}`}>
            <Award size={12} /> {tier.label}
          </span>
        </div>
        {saveError && <p className="mt-2 text-xs text-danger">{saveError}</p>}

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
      </div>

      <div className="ticket mt-4 p-5">
        <h2 className="font-display text-sm font-semibold text-ink">Riwayat Belanja</h2>
        {member.riwayat.length === 0 && <p className="mt-2 text-sm text-ink/40">Belum ada transaksi.</p>}
        <ul className="mt-2 divide-y divide-ink/10">
          {[...member.riwayat].reverse().map((h, i) => (
            <li key={i} onClick={() => setSelectedStruk(h)} className="cursor-pointer py-3 text-sm hover:bg-paper">
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
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-card border border-ink/15 px-4 py-3 text-sm font-semibold text-ink hover:bg-paper"
      >
        <LogOut size={16} /> Keluar
      </button>
    </main>
  );
}
