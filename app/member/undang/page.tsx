'use client';

import { useEffect, useState } from 'react';
import { Share2, Copy, Check, Users } from 'lucide-react';

type Session = { nama: string; username: string; role: string };
type Member = { kodeReferral: string; nama: string };

export default function MemberUndangPage() {
  const [session, setSession] = useState<Session | null>(null);
  const [member, setMember] = useState<Member | null>(null);
  const [referralCount, setReferralCount] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/auth/me')
      .then((r) => r.json())
      .then(async (d) => {
        if (!d.session || d.session.role !== 'member') {
          window.location.href = '/member/login';
          return;
        }
        setSession(d.session);
        const memberRes = await fetch(`/api/members?wa=${encodeURIComponent(d.session.username)}`).then((r) =>
          r.json()
        );
        setMember(memberRes.member || null);
        if (memberRes.member?.kodeReferral) {
          const statRes = await fetch(
            `/api/members/referral-stats?code=${encodeURIComponent(memberRes.member.kodeReferral)}`
          ).then((r) => r.json());
          setReferralCount(statRes.count ?? 0);
        }
        setLoading(false);
      });
  }, []);

  const pesan = member
    ? `Halo! Yuk gabung jadi member Biang Aroma X Me.Racik Parfum. Daftar pakai kode referral aku: ${member.kodeReferral}, kita berdua sama-sama dapat bonus poin! 🎁`
    : '';
  const waLink = `https://wa.me/?text=${encodeURIComponent(pesan)}`;

  function salinKode() {
    if (!member) return;
    navigator.clipboard.writeText(member.kodeReferral).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  if (loading) return <main className="p-6 text-sm text-ink/50">Memuat...</main>;

  return (
    <main className="mx-auto min-h-screen max-w-md px-4 py-6">
      <p className="text-xs uppercase tracking-widest text-accent">Member Area</p>
      <h1 className="mt-1 font-display text-2xl font-semibold text-ink">Undang Teman</h1>
      <p className="mt-1 text-sm text-ink/60">
        Ajak temanmu daftar jadi member. Kalian berdua dapat bonus 10-15 poin tiap pendaftaran berhasil.
      </p>

      <div className="ticket mt-5 p-6 text-center">
        <p className="text-xs uppercase tracking-widest text-ink/40">Kode Referral Kamu</p>
        <p className="mono-time mt-2 font-display text-3xl font-bold text-accent">{member?.kodeReferral}</p>

        <div className="mt-5 flex gap-2">
          <button
            onClick={salinKode}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-card border border-ink/15 px-4 py-3 text-sm font-semibold text-ink transition hover:bg-paper"
          >
            {copied ? <Check size={16} /> : <Copy size={16} />}
            {copied ? 'Tersalin' : 'Salin Kode'}
          </button>
          <a
            href={waLink}
            target="_blank"
            rel="noreferrer"
            className="flex flex-1 items-center justify-center gap-1.5 rounded-card bg-accent px-4 py-3 text-sm font-semibold text-white transition hover:opacity-90"
          >
            <Share2 size={16} />
            Bagikan
          </a>
        </div>
      </div>

      <div className="ticket mt-4 flex items-center gap-4 p-5">
        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-accentSoft text-accent">
          <Users size={20} />
        </div>
        <div>
          <p className="font-display text-xl font-semibold text-ink">{referralCount ?? 0}</p>
          <p className="text-xs text-ink/50">Teman sudah bergabung lewat kodemu</p>
        </div>
      </div>
    </main>
  );
}
