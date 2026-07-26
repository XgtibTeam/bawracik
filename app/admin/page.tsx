'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { detectShift } from '@/lib/shift';

type AttendanceRecord = {
  id: string;
  nama: string;
  cabang: string;
  keterangan: string;
  keteranganLainnya?: string;
  tanggal: string;
  jam: string;
  fotoPath: string;
};

type PhotoItem = {
  id: string;
  name: string;
  updatedAt: string | null;
  sizeBytes: number | null;
};

const MONTHS = [
  { value: '01', label: 'Januari' },
  { value: '02', label: 'Februari' },
  { value: '03', label: 'Maret' },
  { value: '04', label: 'April' },
  { value: '05', label: 'Mei' },
  { value: '06', label: 'Juni' },
  { value: '07', label: 'Juli' },
  { value: '08', label: 'Agustus' },
  { value: '09', label: 'September' },
  { value: '10', label: 'Oktober' },
  { value: '11', label: 'November' },
  { value: '12', label: 'Desember' },
];

export default function AdminDashboardPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'rekap' | 'foto'>('rekap');

  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [photos, setPhotos] = useState<PhotoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const now = new Date();
  const [bulan, setBulan] = useState(String(now.getMonth() + 1).padStart(2, '0'));
  const [tahun, setTahun] = useState(String(now.getFullYear()));

  const [newBranch, setNewBranch] = useState('');
  const [branchError, setBranchError] = useState<string | null>(null);
  const [newEmployee, setNewEmployee] = useState('');
  const [employeeError, setEmployeeError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  const [announcement, setAnnouncement] = useState('');
  const [announcementSaved, setAnnouncementSaved] = useState<string | null>(null);
  const [savingAnnouncement, setSavingAnnouncement] = useState(false);

  // Modal preview foto
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewName, setPreviewName] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [attRes, branchRes, employeeRes, announcementRes, photosRes] = await Promise.all([
        fetch('/api/attendance'),
        fetch('/api/branches'),
        fetch('/api/employees'),
        fetch('/api/announcement'),
        fetch('/api/photos'),
      ]);
      if (attRes.status === 401) {
        router.push('/admin/login');
        return;
      }
      const attData = await attRes.json();
      const branchData = await branchRes.json();
      const employeeData = await employeeRes.json();
      const announcementData = await announcementRes.json();
      const photosData = await photosRes.json();
      setRecords(attData.records || []);
      setBranches(branchData.branches || []);
      setEmployees(employeeData.employees || []);
      setAnnouncement(announcementData.text || '');
      setPhotos(photosData.photos || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return records.filter((r) => {
      const matchSearch =
        !q || r.nama.toLowerCase().includes(q) || r.cabang.toLowerCase().includes(q);
      const [rTahun, rBulan] = r.tanggal.split('-');
      const matchBulan = bulan ? rBulan === bulan : true;
      const matchTahun = tahun ? rTahun === tahun : true;
      return matchSearch && matchBulan && matchTahun;
    });
  }, [records, search, bulan, tahun]);

  const rekapStats = useMemo(() => {
    let tepatWaktu = 0;
    let terlambat = 0;
    for (const r of filtered) {
      if (r.keterangan !== 'Hadir') continue;
      const info = detectShift(r.jam, r.keterangan);
      if (info.status === 'Terlambat') terlambat += 1;
      else if (info.status === 'Tepat Waktu') tepatWaktu += 1;
    }
    return { tepatWaktu, terlambat };
  }, [filtered]);

  const handleAddBranch = async (e: React.FormEvent) => {
    e.preventDefault();
    setBranchError(null);
    if (!newBranch.trim()) return;
    try {
      const res = await fetch('/api/branches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nama: newBranch.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setBranches(data.branches);
      setNewBranch('');
    } catch (err: any) {
      setBranchError(err.message);
    }
  };

  const handleDeleteBranch = async (nama: string) => {
    const res = await fetch('/api/branches', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nama }),
    });
    const data = await res.json();
    if (res.ok) setBranches(data.branches);
  };

  const handleAddEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmployeeError(null);
    if (!newEmployee.trim()) return;
    try {
      const res = await fetch('/api/employees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nama: newEmployee.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setEmployees(data.employees);
      setNewEmployee('');
    } catch (err: any) {
      setEmployeeError(err.message);
    }
  };

  const handleDeleteEmployee = async (nama: string) => {
    const res = await fetch('/api/employees', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nama }),
    });
    const data = await res.json();
    if (res.ok) setEmployees(data.employees);
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const res = await fetch(`/api/export?bulan=${bulan}&tahun=${tahun}`);
      if (!res.ok) throw new Error('Gagal mengekspor data');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `absensi_${tahun}-${bulan}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  };

  const handleSaveAnnouncement = async () => {
    setSavingAnnouncement(true);
    setAnnouncementSaved(null);
    try {
      const res = await fetch('/api/announcement', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: announcement }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal menyimpan pengumuman');
      setAnnouncement(data.text || '');
      setAnnouncementSaved('Pengumuman tersimpan dan langsung tampil di halaman absensi.');
    } catch (err: any) {
      setAnnouncementSaved(err.message);
    } finally {
      setSavingAnnouncement(false);
    }
  };

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/');
    router.refresh();
  };

  const openPhotoPreview = async (fileId: string, label?: string) => {
    setPreviewName(label || fileId);
    setPreviewUrl(null);
    setPreviewError(null);
    setPreviewLoading(true);
    try {
      const res = await fetch(`/api/photos/signed-url?path=${encodeURIComponent(fileId)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal memuat foto');
      setPreviewUrl(data.url);
    } catch (err: any) {
      setPreviewError(err.message);
    } finally {
      setPreviewLoading(false);
    }
  };

  const closePreview = () => {
    setPreviewName(null);
    setPreviewUrl(null);
    setPreviewError(null);
  };

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <div className="mb-8 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="BAW Group" className="h-16 w-16 object-contain" />
          <div>
            <p className="text-xs uppercase tracking-widest text-accent">BAW Group · Panel Admin</p>
            <h1 className="mt-1 font-display text-2xl font-semibold text-ink">Rekap Absensi</h1>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <a
            href="/admin/toko"
            className="rounded-card bg-accent px-4 py-2 text-sm font-medium text-white hover:opacity-90"
          >
            Kelola Toko →
          </a>
          <button
            onClick={handleLogout}
            className="rounded-card border border-ink/15 px-4 py-2 text-sm font-medium text-ink hover:bg-ink/5"
          >
            Keluar
          </button>
        </div>
      </div>

      {/* Pengumuman untuk karyawan */}
      <section className="ticket mb-8 p-6">
        <h2 className="font-display text-lg font-semibold text-ink">📌 Papan Pengumuman</h2>
        <p className="mt-1 text-sm text-ink/60">
          Tulisan di sini akan tampil di halaman absensi karyawan (tanpa perlu login). Kosongkan lalu simpan untuk menyembunyikan pengumuman.
        </p>
        <textarea
          value={announcement}
          onChange={(e) => setAnnouncement(e.target.value)}
          rows={4}
          placeholder="Contoh: Libur bersama tanggal 17 Agustus, toko tutup."
          className="mt-4 w-full rounded-lg border border-ink/15 px-3 py-2.5 text-sm outline-none focus:border-accent"
        />
        <div className="mt-3 flex items-center gap-3">
          <button
            onClick={handleSaveAnnouncement}
            disabled={savingAnnouncement}
            className="rounded-card bg-accent px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
          >
            {savingAnnouncement ? 'Menyimpan...' : 'Simpan Pengumuman'}
          </button>
          {announcementSaved && (
            <p className="text-sm text-ink/60">{announcementSaved}</p>
          )}
        </div>
      </section>

      {/* Cabang toko (kelola lengkap di /admin/toko) */}
      <section className="ticket mb-8 p-6">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold text-ink">Cabang Toko</h2>
          <a href="/admin/toko" className="text-xs text-accent underline">
            Kelola di sini →
          </a>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {branches.map((b: any) => (
            <span key={b.id} className="rounded-full bg-accentSoft px-3 py-1.5 text-sm text-accent">
              {b.nama}
            </span>
          ))}
          {branches.length === 0 && <p className="text-sm text-ink/40">Belum ada cabang toko.</p>}
        </div>
      </section>

      {/* Karyawan (kelola lengkap di /admin/toko) */}
      <section className="ticket mb-8 p-6">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold text-ink">Karyawan</h2>
          <a href="/admin/toko" className="text-xs text-accent underline">
            Kelola di sini →
          </a>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {employees.map((e: any) => (
            <span key={e.id} className="rounded-full bg-accentSoft px-3 py-1.5 text-sm text-accent">
              {e.nama}
            </span>
          ))}
          {employees.length === 0 && <p className="text-sm text-ink/40">Belum ada karyawan.</p>}
        </div>
      </section>

      {/* Tab navigasi */}
      <div className="mb-4 flex gap-2 border-b border-ink/10">
        <button
          onClick={() => setActiveTab('rekap')}
          className={`px-4 py-2.5 text-sm font-semibold transition ${
            activeTab === 'rekap'
              ? 'border-b-2 border-accent text-accent'
              : 'text-ink/50 hover:text-ink'
          }`}
        >
          Rekap Absensi
        </button>
        <button
          onClick={() => setActiveTab('foto')}
          className={`px-4 py-2.5 text-sm font-semibold transition ${
            activeTab === 'foto'
              ? 'border-b-2 border-accent text-accent'
              : 'text-ink/50 hover:text-ink'
          }`}
        >
          Galeri Foto ({photos.length})
        </button>
      </div>

      {activeTab === 'rekap' && (
        <>
          {/* Filter & export */}
          <section className="ticket mb-6 flex flex-wrap items-end gap-3 p-6">
            <div>
              <label className="mb-1 block text-xs font-medium text-ink/60">Cari nama/cabang</label>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Ketik untuk mencari..."
                className="rounded-lg border border-ink/15 px-3 py-2 text-sm outline-none focus:border-accent"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-ink/60">Bulan</label>
              <select
                value={bulan}
                onChange={(e) => setBulan(e.target.value)}
                className="rounded-lg border border-ink/15 bg-white px-3 py-2 text-sm outline-none focus:border-accent"
              >
                {MONTHS.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-ink/60">Tahun</label>
              <input
                type="number"
                value={tahun}
                onChange={(e) => setTahun(e.target.value)}
                className="w-24 rounded-lg border border-ink/15 px-3 py-2 text-sm outline-none focus:border-accent"
              />
            </div>
            <button
              onClick={handleExport}
              disabled={exporting}
              className="ml-auto rounded-card bg-accent px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
            >
              {exporting ? 'Menyiapkan...' : 'Ekspor ke Excel'}
            </button>
            <div className="flex w-full items-center gap-2 pt-1 text-xs">
              <span className="rounded-full bg-emerald-100 px-3 py-1 font-semibold text-emerald-700">
                Tepat waktu: {rekapStats.tepatWaktu}
              </span>
              <span className="rounded-full bg-danger/10 px-3 py-1 font-semibold text-danger">
                Terlambat: {rekapStats.terlambat}
              </span>
            </div>
          </section>

          {/* Tabel data */}
          <section className="ticket overflow-x-auto p-2">
            {loading ? (
              <p className="p-6 text-sm text-ink/50">Memuat data...</p>
            ) : filtered.length === 0 ? (
              <p className="p-6 text-sm text-ink/50">Tidak ada data absensi untuk filter ini.</p>
            ) : (
              <table className="w-full min-w-[960px] text-sm">
                <thead>
                  <tr className="border-b border-ink/10 text-left text-xs uppercase tracking-wide text-ink/50">
                    <th className="p-3">Nama</th>
                    <th className="p-3">Cabang</th>
                    <th className="p-3">Keterangan</th>
                    <th className="p-3">Tanggal</th>
                    <th className="p-3">Waktu Kedatangan</th>
                    <th className="p-3">Shift</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">Foto</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((r) => {
                    const info = detectShift(r.jam, r.keterangan);
                    return (
                      <tr key={r.id} className="border-b border-ink/5">
                        <td className="p-3 font-medium text-ink">{r.nama}</td>
                        <td className="p-3 text-ink/70">{r.cabang}</td>
                        <td className="p-3 text-ink/70">
                          {r.keterangan === 'Lainnya'
                            ? `Lainnya - ${r.keteranganLainnya}`
                            : r.keterangan}
                        </td>
                        <td className="p-3 mono-time text-ink/70">{r.tanggal}</td>
                        <td className="p-3 mono-time text-ink/70">{r.jam}</td>
                        <td className="p-3 text-ink/70">
                          {info.shift === '-' ? '-' : `${info.shift} (${info.jamMasukShift})`}
                        </td>
                        <td className="p-3">
                          {info.status === 'Terlambat' ? (
                            <span className="rounded-full bg-danger/10 px-2.5 py-1 text-xs font-semibold text-danger">
                              Terlambat {info.telatMenit} menit
                            </span>
                          ) : info.status === 'Tepat Waktu' ? (
                            <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                              Tepat Waktu
                            </span>
                          ) : (
                            <span className="text-xs text-ink/40">-</span>
                          )}
                        </td>
                        <td className="p-3">
                          <button
                            onClick={() => openPhotoPreview(r.fotoPath)}
                            className="text-accent underline"
                          >
                            Lihat
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </section>
        </>
      )}

      {activeTab === 'foto' && (
        <section className="ticket p-6">
          <h2 className="font-display text-lg font-semibold text-ink">Galeri Foto Absensi</h2>
          <p className="mt-1 text-sm text-ink/60">
            Nama file mengikuti format <span className="font-medium">nama-hari-keterangan-waktu.jpg</span>. Klik salah satu untuk melihat pratinjau foto.
          </p>

          {loading ? (
            <p className="mt-6 text-sm text-ink/50">Memuat daftar foto...</p>
          ) : photos.length === 0 ? (
            <p className="mt-6 text-sm text-ink/50">Belum ada foto absensi.</p>
          ) : (
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
              {photos.map((p) => (
                <button
                  key={p.id}
                  onClick={() => openPhotoPreview(p.id, p.name)}
                  className="flex flex-col items-center gap-2 rounded-lg border border-ink/10 p-3 text-left transition hover:border-accent hover:bg-accentSoft"
                >
                  <span className="text-2xl">🖼️</span>
                  <span className="w-full truncate text-center text-xs text-ink/70" title={p.name}>
                    {p.name}
                  </span>
                </button>
              ))}
            </div>
          )}
        </section>
      )}

      {/* Modal preview foto */}
      {previewName && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink/70 p-4"
          onClick={closePreview}
        >
          <div
            className="max-h-[85vh] w-full max-w-lg overflow-auto rounded-card bg-white p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-start justify-between gap-3">
              <p className="break-all text-xs text-ink/60">{previewName}</p>
              <button
                onClick={closePreview}
                className="flex-shrink-0 rounded-full border border-ink/15 px-2.5 py-1 text-sm text-ink/60 hover:bg-ink/5"
              >
                Tutup
              </button>
            </div>

            {previewLoading && <p className="text-sm text-ink/50">Memuat foto...</p>}
            {previewError && <p className="text-sm text-danger">{previewError}</p>}
            {previewUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={previewUrl} alt={previewName} className="w-full rounded-lg object-contain" />
            )}
          </div>
        </div>
      )}
    </main>
  );
}
