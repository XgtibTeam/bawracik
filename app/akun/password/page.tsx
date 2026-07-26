'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function GantiPasswordPage() {
  const router = useRouter();
  const [nama, setNama] = useState('');
  const [passwordLama, setPasswordLama] = useState('');
  const [passwordBaru, setPasswordBaru] = useState('');
  const [passwordBaruUlang, setPasswordBaruUlang] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetch('/api/auth/me')
      .then((r) => r.json())
      .then((d) => {
        if (!d.session) {
          window.location.href = '/kasir/login';
          return;
        }
        setNama(d.session.nama);
      });
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMsg(null);
    if (passwordBaru !== passwordBaruUlang) {
      setError('Konfirmasi password baru tidak sama.');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ passwordLama, passwordBaru }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal ganti password');
      setMsg('Password berhasil diganti.');
      setPasswordLama('');
      setPasswordBaru('');
      setPasswordBaruUlang('');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/');
    router.refresh();
  }

  return (
    <main className="mx-auto max-w-sm px-4 py-8">
      <div className="flex items-center justify-between">
        <p className="text-xs uppercase tracking-widest text-accent">Akun · {nama}</p>
        <button onClick={handleLogout} className="text-xs font-semibold text-danger underline">
          Keluar
        </button>
      </div>
      <h1 className="mt-1 font-display text-2xl font-semibold text-ink">Ganti Password</h1>

      <form onSubmit={submit} className="ticket mt-4 space-y-3 p-5">
        <div>
          <label className="mb-1 block text-xs font-medium text-ink/60">Password Lama</label>
          <input
            type="password"
            value={passwordLama}
            onChange={(e) => setPasswordLama(e.target.value)}
            className="w-full rounded-lg border border-ink/15 px-3 py-2 text-sm outline-none focus:border-accent"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-ink/60">Password Baru</label>
          <input
            type="password"
            value={passwordBaru}
            onChange={(e) => setPasswordBaru(e.target.value)}
            className="w-full rounded-lg border border-ink/15 px-3 py-2 text-sm outline-none focus:border-accent"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-ink/60">Ulangi Password Baru</label>
          <input
            type="password"
            value={passwordBaruUlang}
            onChange={(e) => setPasswordBaruUlang(e.target.value)}
            className="w-full rounded-lg border border-ink/15 px-3 py-2 text-sm outline-none focus:border-accent"
          />
        </div>
        {error && <p className="text-sm text-danger">{error}</p>}
        {msg && <p className="text-sm text-accent">{msg}</p>}
        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-card bg-accent px-4 py-3 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
        >
          {submitting ? 'Menyimpan...' : 'Simpan Password Baru'}
        </button>
      </form>
    </main>
  );
}
