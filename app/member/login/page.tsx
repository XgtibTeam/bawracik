'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function MemberLoginPage() {
  const router = useRouter();
  const [wa, setWa] = useState('');
  const [nama, setNama] = useState('');
  const [referralCode, setReferralCode] = useState('');
  const [needNama, setNeedNama] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch('/api/auth/member-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wa, nama, referralCode }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.error?.includes('nama wajib')) {
          setNeedNama(true);
          setError(null);
          return;
        }
        throw new Error(data.error || 'Gagal masuk');
      }
      router.push('/member');
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-6">
      <p className="text-xs uppercase tracking-widest text-accent">Member Area</p>
      <h1 className="mt-1 font-display text-2xl font-semibold text-ink">
        Biang Aroma X Me.Racik Parfum
      </h1>

      <form onSubmit={handleSubmit} className="ticket mt-6 space-y-4 p-6">
        <div>
          <label className="mb-1 block text-sm font-medium text-ink">Nomor WhatsApp</label>
          <input
            type="text"
            value={wa}
            onChange={(e) => setWa(e.target.value)}
            className="w-full rounded-lg border border-ink/15 px-3 py-2.5 text-sm outline-none focus:border-accent"
            placeholder="0812xxxxxxx"
            autoFocus
          />
        </div>
        {needNama && (
          <>
            <div>
              <label className="mb-1 block text-sm font-medium text-ink">Nama (member baru)</label>
              <input
                type="text"
                value={nama}
                onChange={(e) => setNama(e.target.value)}
                className="w-full rounded-lg border border-ink/15 px-3 py-2.5 text-sm outline-none focus:border-accent"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-ink">Kode Referral (opsional)</label>
              <input
                type="text"
                value={referralCode}
                onChange={(e) => setReferralCode(e.target.value)}
                className="w-full rounded-lg border border-ink/15 px-3 py-2.5 text-sm outline-none focus:border-accent"
                placeholder="5 digit"
              />
            </div>
          </>
        )}
        {error && <p className="text-sm text-danger">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-card bg-accent px-4 py-3 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
        >
          {loading ? 'Memeriksa...' : needNama ? 'Daftar & Masuk' : 'Masuk'}
        </button>
      </form>
    </main>
  );
}
