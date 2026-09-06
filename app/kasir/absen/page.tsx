'use client';

import { useEffect, useState } from 'react';
import CameraCapture from '@/components/CameraCapture';
import BrandLogo from '@/components/BrandLogo';

const KETERANGAN_OPTIONS = ['Sakit', 'Izin', 'Lembur', 'Lainnya'] as const;

type Session = { nama: string; username: string; role: string };
type Branch = { id: string; nama: string };

type SubmitResult = {
  tanggal: string;
  jam: string;
  shift?: string;
  statusKehadiran?: string;
  telatMenit?: number;
};

export default function AbsensiPage() {
  const [session, setSession] = useState<Session | null>(null);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [announcement, setAnnouncement] = useState('');

  const [cabang, setCabang] = useState('');
  const [photo, setPhoto] = useState<string | null>(null);

  const [bukanHadir, setBukanHadir] = useState(false);
  const [keterangan, setKeterangan] = useState<(typeof KETERANGAN_OPTIONS)[number]>('Sakit');
  const [keteranganLainnya, setKeteranganLainnya] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<SubmitResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/auth/me')
      .then((r) => r.json())
      .then((d) => setSession(d.session || null));

    fetch('/api/branches')
      .then((res) => res.json())
      .then((data) => setBranches(Array.isArray(data.branches) ? data.branches : []))
      .catch(() => setBranches([]));

    fetch('/api/announcement')
      .then((res) => res.json())
      .then((data) => setAnnouncement(data.text || ''))
      .catch(() => setAnnouncement(''));
  }, []);

  const resetForm = () => {
    setCabang('');
    setPhoto(null);
    setBukanHadir(false);
    setKeterangan('Sakit');
    setKeteranganLainnya('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!cabang || !photo) {
      setError('Pilih cabang dan ambil swafoto dulu ya.');
      return;
    }
    if (bukanHadir && keterangan === 'Lainnya' && !keteranganLainnya.trim()) {
      setError('Mohon isi keterangan lainnya.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cabang,
          keterangan: bukanHadir ? keterangan : 'Hadir',
          keteranganLainnya: bukanHadir ? keteranganLainnya : '',
          photoBase64: photo,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Gagal mengirim absensi');
      }
      setResult({
        tanggal: data.record.tanggal,
        jam: data.record.jam,
        shift: data.record.shift,
        statusKehadiran: data.record.statusKehadiran,
        telatMenit: data.record.telatMenit,
      });
      resetForm();
    } catch (err: any) {
      setError(err.message || 'Terjadi kesalahan, coba lagi.');
    } finally {
      setSubmitting(false);
    }
  };

  if (result) {
    const terlambat = result.statusKehadiran === 'Terlambat';
    return (
      <main className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-md flex-col items-center justify-center px-6 py-10">
        <div className="ticket w-full p-8 text-center">
          <div className="perforated mb-6 h-px w-full" />
          <BrandLogo className="mx-auto h-20 w-20" />
          <p className="mt-3 text-xs uppercase tracking-widest text-accent">BAW Group · Absensi Tercatat</p>
          <h1 className="mt-2 font-display text-2xl font-semibold text-ink">Berhasil dikirim</h1>
          <div className="mono-time mt-6 text-4xl font-semibold text-ink">{result.jam}</div>
          <p className="mt-1 text-sm text-ink/60">{result.tanggal}</p>

          {result.shift && result.shift !== '-' && (
            <div
              className={`mt-4 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold ${
                terlambat ? 'bg-danger/10 text-danger' : 'bg-accentSoft text-accent'
              }`}
            >
              Shift {result.shift} · {result.statusKehadiran}
              {terlambat && result.telatMenit ? ` (${result.telatMenit} menit)` : ''}
            </div>
          )}

          <div className="perforated mt-6 h-px w-full" />
          <button
            onClick={() => setResult(null)}
            className="mt-8 w-full rounded-card bg-accent px-4 py-3 text-sm font-semibold text-white transition hover:opacity-90"
          >
            Isi Absensi Lagi
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto min-h-screen max-w-md px-6 py-10">
      <header className="mb-6 flex items-center gap-3">
        <BrandLogo className="h-16 w-16 flex-shrink-0" />
        <div>
          <p className="text-xs uppercase tracking-widest text-accent">BAW Group · Kartu Jam Kerja</p>
          <h1 className="mt-1 font-display text-2xl font-semibold text-ink">
            Halo, {session?.nama || '...'}
          </h1>
          <p className="mt-1 text-sm text-ink/60">Jam & shift terekam otomatis saat kamu kirim absensi.</p>
        </div>
      </header>

      {announcement.trim() && (
        <div className="mb-6 rounded-card border border-warn/30 bg-amber-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-widest text-warn">📌 Pengumuman</p>
          <p className="mt-1.5 whitespace-pre-line text-sm text-ink/80">{announcement}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="ticket space-y-5 p-6">
        <div>
          <label className="mb-1 block text-sm font-medium text-ink">Cabang Toko</label>
          <select
            value={cabang}
            onChange={(e) => setCabang(e.target.value)}
            className="w-full rounded-lg border border-ink/15 bg-white px-3 py-2.5 text-sm outline-none focus:border-accent"
          >
            <option value="">Pilih cabang toko</option>
            {branches.map((b) => (
              <option key={b.id} value={b.nama}>
                {b.nama}
              </option>
            ))}
          </select>
          {branches.length === 0 && (
            <p className="mt-1 text-xs text-warn">Belum ada cabang toko. Hubungi admin untuk menambahkannya.</p>
          )}
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-ink">Swafoto Bukti Kehadiran</label>
          <CameraCapture onCapture={setPhoto} />
        </div>

        {!bukanHadir ? (
          <button
            type="button"
            onClick={() => setBukanHadir(true)}
            className="text-xs font-medium text-ink/40 underline"
          >
            Bukan hadir hari ini? (Sakit / Izin / Lembur / lainnya)
          </button>
        ) : (
          <div className="rounded-lg border border-ink/10 bg-paper p-3">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-sm font-medium text-ink">Keterangan</p>
              <button
                type="button"
                onClick={() => setBukanHadir(false)}
                className="text-xs font-medium text-accent underline"
              >
                Batal, saya hadir
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {KETERANGAN_OPTIONS.map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => setKeterangan(opt)}
                  className={`rounded-lg border px-3 py-2.5 text-sm font-medium transition ${
                    keterangan === opt
                      ? 'border-accent bg-accentSoft text-accent'
                      : 'border-ink/15 bg-white text-ink/70 hover:bg-ink/5'
                  }`}
                >
                  {opt}
                </button>
              ))}
            </div>
            {keterangan === 'Lainnya' && (
              <input
                type="text"
                value={keteranganLainnya}
                onChange={(e) => setKeteranganLainnya(e.target.value)}
                placeholder="Tuliskan keterangan"
                className="mt-2 w-full rounded-lg border border-ink/15 px-3 py-2.5 text-sm outline-none focus:border-accent"
              />
            )}
          </div>
        )}

        {error && <p className="text-sm text-danger">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-card bg-accent px-4 py-3 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
        >
          {submitting ? 'Mengirim...' : 'Kirim Absensi'}
        </button>
      </form>
    </main>
  );
}
