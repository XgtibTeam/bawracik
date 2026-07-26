'use client';

import { useEffect, useState } from 'react';
import CameraCapture from '@/components/CameraCapture';

const KETERANGAN_OPTIONS = ['Hadir', 'Sakit', 'Izin', 'Lembur', 'Lainnya'] as const;

export default function AbsensiPage() {
  const [branches, setBranches] = useState<{ id: string; nama: string }[]>([]);
  const [employees, setEmployees] = useState<{ id: string; nama: string }[]>([]);
  const [announcement, setAnnouncement] = useState<string>('');
  const [nama, setNama] = useState('');
  const [cabang, setCabang] = useState('');
  const [keterangan, setKeterangan] = useState<(typeof KETERANGAN_OPTIONS)[number]>('Hadir');
  const [keteranganLainnya, setKeteranganLainnya] = useState('');
  const [photo, setPhoto] = useState<string | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ tanggal: string; jam: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/branches')
      .then((res) => res.json())
      .then((data) => setBranches(data.branches || []))
      .catch(() => setBranches([]));

    fetch('/api/employees')
      .then((res) => res.json())
      .then((data) => setEmployees(data.employees || []))
      .catch(() => setEmployees([]));

    fetch('/api/announcement')
      .then((res) => res.json())
      .then((data) => setAnnouncement(data.text || ''))
      .catch(() => setAnnouncement(''));
  }, []);

  const resetForm = () => {
    setNama('');
    setCabang('');
    setKeterangan('Hadir');
    setKeteranganLainnya('');
    setPhoto(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!nama.trim() || !cabang || !photo) {
      setError('Nama, cabang toko, dan foto swafoto wajib diisi.');
      return;
    }
    if (keterangan === 'Lainnya' && !keteranganLainnya.trim()) {
      setError('Mohon isi keterangan lainnya.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nama: nama.trim(),
          cabang,
          keterangan,
          keteranganLainnya,
          photoBase64: photo,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Gagal mengirim absensi');
      }
      setResult({ tanggal: data.record.tanggal, jam: data.record.jam });
      resetForm();
    } catch (err: any) {
      setError(err.message || 'Terjadi kesalahan, coba lagi.');
    } finally {
      setSubmitting(false);
    }
  };

  if (result) {
    return (
      <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-6 py-10">
        <div className="ticket w-full p-8 text-center">
          <div className="perforated mb-6 h-px w-full" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="BAW Group" className="mx-auto h-20 w-20 object-contain" />
          <p className="mt-3 text-xs uppercase tracking-widest text-accent">BAW Group · Absensi Tercatat</p>
          <h1 className="mt-2 font-display text-2xl font-semibold text-ink">Berhasil dikirim</h1>
          <div className="mono-time mt-6 text-4xl font-semibold text-ink">{result.jam}</div>
          <p className="mt-1 text-sm text-ink/60">{result.tanggal}</p>
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
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.png" alt="BAW Group" className="h-24 w-24 flex-shrink-0 object-contain" />
        <div>
          <p className="text-xs uppercase tracking-widest text-accent">BAW Group · Kartu Jam Kerja</p>
          <h1 className="mt-1 font-display text-2xl font-semibold text-ink">Isi Absensi</h1>
          <p className="mt-1 text-sm text-ink/60">
            Tanggal dan jam terekam otomatis saat kamu mengirim absensi.
          </p>
        </div>
      </header>

      {announcement.trim() && (
        <div className="mb-6 rounded-card border border-warn/30 bg-amber-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-widest text-warn">
            📌 Pengumuman
          </p>
          <p className="mt-1.5 whitespace-pre-line text-sm text-ink/80">{announcement}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="ticket space-y-5 p-6">
        <div>
          <label className="mb-1 block text-sm font-medium text-ink">Nama Karyawan</label>
          <select
            value={nama}
            onChange={(e) => setNama(e.target.value)}
            className="w-full rounded-lg border border-ink/15 bg-white px-3 py-2.5 text-sm outline-none focus:border-accent"
          >
            <option value="">Pilih nama karyawan</option>
            {employees.map((n) => (
              <option key={n.id} value={n.nama}>
                {n.nama}
              </option>
            ))}
          </select>
          {employees.length === 0 && (
            <p className="mt-1 text-xs text-warn">
              Belum ada nama karyawan. Hubungi admin untuk menambahkannya.
            </p>
          )}
        </div>

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
            <p className="mt-1 text-xs text-warn">
              Belum ada cabang toko. Hubungi admin untuk menambahkannya.
            </p>
          )}
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-ink">Keterangan Kehadiran</label>
          <div className="grid grid-cols-3 gap-2">
            {KETERANGAN_OPTIONS.map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => setKeterangan(opt)}
                className={`rounded-lg border px-3 py-2.5 text-sm font-medium transition ${
                  keterangan === opt
                    ? 'border-accent bg-accentSoft text-accent'
                    : 'border-ink/15 text-ink/70 hover:bg-ink/5'
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

        <div>
          <label className="mb-1 block text-sm font-medium text-ink">Swafoto Bukti Kehadiran</label>
          <CameraCapture onCapture={setPhoto} />
        </div>

        {error && <p className="text-sm text-danger">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-card bg-accent px-4 py-3 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
        >
          {submitting ? 'Mengirim...' : 'Kirim Absensi'}
        </button>
      </form>

      <p className="mt-6 text-center text-xs text-ink/40">
        Admin? <a href="/admin/login" className="underline">Masuk di sini</a>
      </p>
    </main>
  );
}
