'use client';

import { useEffect, useState } from 'react';
import { Copy, Check, Ticket } from 'lucide-react';

type Session = { nama: string; username: string; role: string };
type Member = { id: string; poinTotal: number; poinSaatIni: number; pengisianKe: number };
type Voucher = {
  code: string;
  tipe: 'persen' | 'potongan';
  nilai: number;
  aktif: boolean;
  expiresAt?: string;
  dipakaiOleh: string[];
};

export default function MemberVoucherPage() {
  const [session, setSession] = useState<Session | null>(null);
  const [member, setMember] = useState<Member | null>(null);
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/auth/me')
      .then((r) => r.json())
      .then(async (d) => {
        if (!d.session || d.session.role !== 'member') {
          window.location.href = '/member/login';
          return;
        }
        setSession(d.session);
        const [memberRes, voucherRes] = await Promise.all([
          fetch(`/api/members?wa=${encodeURIComponent(d.session.username)}`).then((r) => r.json()),
          fetch('/api/vouchers').then((r) => r.json()),
        ]);
        setMember(memberRes.member || null);
        setVouchers(Array.isArray(voucherRes.vouchers) ? voucherRes.vouchers : []);
        setLoading(false);
      });
  }, []);

  const now = Date.now();
  const availableVouchers = vouchers.filter((v) => {
    if (!v.aktif) return false;
    if (v.expiresAt && new Date(v.expiresAt).getTime() < now) return false;
    if (member && v.dipakaiOleh.includes(member.id)) return false;
    return true;
  });

  function salinKode(code: string) {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(code);
      setTimeout(() => setCopied(null), 1500);
    });
  }

  if (loading) return <main className="p-6 text-sm text-ink/50">Memuat...</main>;

  return (
    <main className="mx-auto min-h-screen max-w-md px-4 py-6">
      <p className="text-xs uppercase tracking-widest text-accent">Member Area</p>
      <h1 className="mt-1 font-display text-2xl font-semibold text-ink">Voucher Saya</h1>

      {member && (
        <div className="ticket mt-4 p-5">
          <div className="grid grid-cols-3 gap-3 text-center">
            <div>
              <p className="font-display text-xl font-semibold text-accent">{member.poinTotal}</p>
              <p className="text-[11px] text-ink/50">Poin Total</p>
            </div>
            <div>
              <p className="font-display text-xl font-semibold text-ink">{member.poinSaatIni}</p>
              <p className="text-[11px] text-ink/50">Poin Saat Ini</p>
            </div>
            <div>
              <p className="font-display text-xl font-semibold text-ink">{member.pengisianKe}/10</p>
              <p className="text-[11px] text-ink/50">Pengisian ke-</p>
            </div>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-paper">
            <div
              className="h-full rounded-full bg-accent transition-all"
              style={{ width: `${Math.min(100, (member.pengisianKe / 10) * 100)}%` }}
            />
          </div>
          <p className="mt-2 text-center text-xs text-ink/40">
            {10 - member.pengisianKe} kali isi ulang lagi menuju bonus poin ke-10
          </p>
        </div>
      )}

      <h2 className="mb-2 mt-6 font-display text-sm font-semibold text-ink">Voucher Tersedia</h2>
      {availableVouchers.length === 0 && (
        <div className="ticket p-6 text-center">
          <Ticket className="mx-auto text-ink/20" size={28} strokeWidth={1.5} />
          <p className="mt-2 text-sm text-ink/50">Belum ada voucher yang tersedia saat ini.</p>
        </div>
      )}
      <div className="space-y-3">
        {availableVouchers.map((v) => (
          <div key={v.code} className="ticket flex items-center justify-between p-4">
            <div>
              <p className="font-display text-lg font-semibold text-ink">
                {v.tipe === 'persen' ? `${v.nilai}%` : `Rp${v.nilai.toLocaleString('id-ID')}`}
              </p>
              <p className="text-xs text-ink/50">
                Kode <span className="mono-time font-semibold text-ink/70">{v.code}</span>
              </p>
              {v.expiresAt && (
                <p className="text-[11px] text-ink/30">
                  Berlaku s.d. {new Date(v.expiresAt).toLocaleDateString('id-ID')}
                </p>
              )}
            </div>
            <button
              onClick={() => salinKode(v.code)}
              className="flex items-center gap-1.5 rounded-lg bg-accentSoft px-3 py-2 text-xs font-semibold text-accent"
            >
              {copied === v.code ? <Check size={14} /> : <Copy size={14} />}
              {copied === v.code ? 'Tersalin' : 'Salin'}
            </button>
          </div>
        ))}
      </div>
      <p className="mt-4 text-center text-xs text-ink/30">
        Masukkan kode voucher saat checkout di halaman Belanja.
      </p>
    </main>
  );
}
