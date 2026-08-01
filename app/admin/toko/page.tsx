'use client';

import { useEffect, useState } from 'react';
import * as XLSX from 'xlsx';
import { driveImageUrl } from '@/lib/drive-url';

type Branch = { id: string; nama: string; alamat?: string; waCS?: string };
type Employee = { id: string; nama: string; username: string; role: string; cabangId: string | null };
type Product = {
  id: string;
  nama: string;
  kode: string;
  deskripsi?: string;
  hargaJual?: number;
  isBotol: boolean;
  ukuranBotolMl?: number;
  imageDriveId?: string;
  kategori?: string;
};
type PricingConfig = {
  mlTiers: { hargaPerMl: number }[];
  bottleTiers: { minMl: number; maxMl: number; harga: number }[];
  categoryPrices: { kategori: string; hargaPerMl: number }[];
};
const KATEGORI_OPTIONS = ['biasa', 'premium', 'sultan', 'series'] as const;
type Voucher = { code: string; tipe: string; nilai: number; aktif: boolean };
type HomeSection = { id: string; type: 'banner' | 'teks' | 'gambar' | 'promo'; judul?: string; isi?: string; gambarUrl?: string };
type StoreProfile = {
  namaToko: string;
  slogan?: string;
  deskripsi: string;
  ctaText?: string;
  footerText?: string;
  logoUrl: string;
  logos: string[];
  socialMedia: { instagram?: string; whatsapp?: string; tiktok?: string };
  pembayaran: { qrisImageUrl?: string; dana?: string; seabank?: string };
  homeSections: HomeSection[];
  colorScheme?: 'hijau' | 'maroon';
};

const TABS = [
  { key: 'profil', label: 'Profil Toko' },
  { key: 'home', label: 'Susun Homepage' },
  { key: 'cabang', label: 'Cabang' },
  { key: 'karyawan', label: 'Karyawan' },
  { key: 'produk', label: 'Produk' },
  { key: 'harga', label: 'Harga' },
  { key: 'voucher', label: 'Voucher' },
  { key: 'stok', label: 'Stok' },
  { key: 'pesanan', label: 'Pesanan' },
  { key: 'rekap', label: 'Rekap & Grafik' },
] as const;

export default function AdminTokoPage() {
  const [tab, setTab] = useState<(typeof TABS)[number]['key']>('profil');

  return (
    <main className="mx-auto max-w-3xl px-4 py-6 pb-20">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="font-display text-2xl font-semibold text-ink">Admin — Kelola Toko</h1>
        <a href="/admin" className="text-xs text-accent underline">
          ← Panel Absensi
        </a>
      </div>
      <div className="mb-4 -mt-2 flex justify-end">
        <a href="/akun/password" className="text-xs text-accent underline">
          Ganti Password
        </a>
      </div>

      <div className="mb-4 flex flex-wrap gap-1 border-b border-ink/10 pb-2">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${
              tab === t.key ? 'bg-accent text-white' : 'bg-paper text-ink/60'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'profil' && <ProfilTab />}
      {tab === 'home' && <HomeTab />}
      {tab === 'cabang' && <CabangTab />}
      {tab === 'karyawan' && <KaryawanTab />}
      {tab === 'produk' && <ProdukTab />}
      {tab === 'harga' && <HargaTab />}
      {tab === 'voucher' && <VoucherTab />}
      {tab === 'stok' && <StokTab />}
      {tab === 'pesanan' && <PesananAdminTab />}
      {tab === 'rekap' && <RekapTab />}
    </main>
  );
}

// ============================================================
function ProfilTab() {
  const [profile, setProfile] = useState<StoreProfile | null>(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/store-profile').then((r) => r.json()).then((d) => setProfile(d.profile));
  }, []);

  if (!profile) return <p className="text-sm text-ink/50">Memuat...</p>;

  async function save() {
    setSaving(true);
    setMsg(null);
    const res = await fetch('/api/store-profile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(profile),
    });
    const data = await res.json();
    setProfile(data.profile);
    setMsg(res.ok ? 'Tersimpan.' : data.error);
    setSaving(false);
  }

  return (
    <div className="ticket space-y-3 p-4">
      <Field label="Nama Toko" value={profile.namaToko} onChange={(v) => setProfile({ ...profile, namaToko: v })} />

      <div>
        <label className="mb-1 block text-xs font-medium text-ink/60">Skema Warna Situs (berlaku utk semua pengunjung)</label>
        <div className="flex gap-2">
          <button
            onClick={() => setProfile({ ...profile, colorScheme: 'hijau' })}
            className={`flex-1 rounded-lg border py-2 text-xs font-semibold ${
              (profile.colorScheme || 'hijau') === 'hijau' ? 'border-accent bg-accentSoft text-accent' : 'border-ink/15 text-ink/50'
            }`}
          >
            🟢 Hijau
          </button>
          <button
            onClick={() => setProfile({ ...profile, colorScheme: 'maroon' })}
            className={`flex-1 rounded-lg border py-2 text-xs font-semibold ${
              profile.colorScheme === 'maroon' ? 'border-accent bg-accentSoft text-accent' : 'border-ink/15 text-ink/50'
            }`}
          >
            🔴 Maroon
          </button>
        </div>
        <p className="mt-1 text-[11px] text-ink/40">Mode gelap/terang tetap diatur masing-masing pengunjung sendiri.</p>
      </div>
      <Field
        label="Slogan (tampil di bawah nama toko)"
        value={profile.slogan || ''}
        onChange={(v) => setProfile({ ...profile, slogan: v })}
      />
      <div>
        <label className="mb-1 block text-xs font-medium text-ink/60">Deskripsi</label>
        <textarea
          value={profile.deskripsi}
          onChange={(e) => setProfile({ ...profile, deskripsi: e.target.value })}
          rows={3}
          className="w-full rounded-lg border border-ink/15 px-3 py-2 text-sm outline-none focus:border-accent"
        />
      </div>
      <Field
        label="Teks Tombol Utama (default: Mulai Belanja)"
        value={profile.ctaText || ''}
        onChange={(v) => setProfile({ ...profile, ctaText: v })}
      />
      <Field
        label="Teks Footer (paling bawah homepage)"
        value={profile.footerText || ''}
        onChange={(v) => setProfile({ ...profile, footerText: v })}
      />
      <ImageUploadField label="Logo Toko (utama)" value={profile.logoUrl} onChange={(v) => setProfile({ ...profile, logoUrl: v })} />

      <div>
        <label className="mb-1 block text-xs font-medium text-ink/60">Logo Tambahan (opsional, bisa lebih dari satu)</label>
        <div className="flex flex-wrap gap-2">
          {(profile.logos || []).map((url, i) => (
            <div key={i} className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={driveImageUrl(url)} alt={`Logo ${i + 1}`} className="h-14 w-14 rounded-lg border border-ink/10 object-contain" />
              <button
                onClick={() => setProfile({ ...profile, logos: profile.logos.filter((_, idx) => idx !== i) })}
                className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-danger text-[10px] text-white"
              >
                ×
              </button>
            </div>
          ))}
        </div>
        <div className="mt-2">
          <ImageUploadField
            label="Tambah Logo Baru"
            value=""
            onChange={(v) => v && setProfile({ ...profile, logos: [...(profile.logos || []), v] })}
          />
        </div>
      </div>

      <Field
        label="Instagram (username)"
        value={profile.socialMedia.instagram || ''}
        onChange={(v) => setProfile({ ...profile, socialMedia: { ...profile.socialMedia, instagram: v } })}
      />
      <Field
        label="Nomor WhatsApp CS"
        value={profile.socialMedia.whatsapp || ''}
        onChange={(v) => setProfile({ ...profile, socialMedia: { ...profile.socialMedia, whatsapp: v } })}
      />
      <Field
        label="TikTok (username)"
        value={profile.socialMedia.tiktok || ''}
        onChange={(v) => setProfile({ ...profile, socialMedia: { ...profile.socialMedia, tiktok: v } })}
      />
      <hr className="border-ink/10" />
      <ImageUploadField
        label="Gambar QRIS"
        value={profile.pembayaran.qrisImageUrl || ''}
        onChange={(v) => setProfile({ ...profile, pembayaran: { ...profile.pembayaran, qrisImageUrl: v } })}
      />
      <Field
        label="Nomor DANA"
        value={profile.pembayaran.dana || ''}
        onChange={(v) => setProfile({ ...profile, pembayaran: { ...profile.pembayaran, dana: v } })}
      />
      <Field
        label="Nomor SeaBank"
        value={profile.pembayaran.seabank || ''}
        onChange={(v) => setProfile({ ...profile, pembayaran: { ...profile.pembayaran, seabank: v } })}
      />
      {msg && <p className="text-xs text-accent">{msg}</p>}
      <button
        onClick={save}
        disabled={saving}
        className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
      >
        {saving ? 'Menyimpan...' : 'Simpan Profil'}
      </button>
    </div>
  );
}

// ============================================================
function HomeTab() {
  const [profile, setProfile] = useState<StoreProfile | null>(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/store-profile').then((r) => r.json()).then((d) =>
      setProfile({ ...d.profile, homeSections: d.profile.homeSections ?? [] })
    );
  }, []);

  if (!profile) return <p className="text-sm text-ink/50">Memuat...</p>;

  function addSection(type: HomeSection['type']) {
    const section: HomeSection = { id: crypto.randomUUID(), type };
    setProfile({ ...profile!, homeSections: [...profile!.homeSections, section] });
  }
  function updateSection(id: string, patch: Partial<HomeSection>) {
    setProfile({
      ...profile!,
      homeSections: profile!.homeSections.map((s) => (s.id === id ? { ...s, ...patch } : s)),
    });
  }
  function removeSection(id: string) {
    setProfile({ ...profile!, homeSections: profile!.homeSections.filter((s) => s.id !== id) });
  }
  function moveSection(index: number, dir: -1 | 1) {
    const sections = [...profile!.homeSections];
    const target = index + dir;
    if (target < 0 || target >= sections.length) return;
    [sections[index], sections[target]] = [sections[target], sections[index]];
    setProfile({ ...profile!, homeSections: sections });
  }

  async function save() {
    setSaving(true);
    setMsg(null);
    const res = await fetch('/api/store-profile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(profile),
    });
    const data = await res.json();
    setMsg(res.ok ? 'Tersimpan.' : data.error);
    setSaving(false);
  }

  const typeLabel: Record<HomeSection['type'], string> = {
    banner: 'Banner (gambar besar + judul)',
    teks: 'Teks',
    gambar: 'Gambar',
    promo: 'Promo (judul + isi)',
  };

  return (
    <div className="space-y-4">
      <div className="ticket p-4">
        <h2 className="font-display text-sm font-semibold text-ink">Tambah Section Homepage</h2>
        <p className="mt-1 text-xs text-ink/50">
          Section akan tampil di halaman Home (`/`) sesuai urutan di bawah, di bawah kartu
          profil toko.
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          {(['banner', 'teks', 'gambar', 'promo'] as const).map((t) => (
            <button
              key={t}
              onClick={() => addSection(t)}
              className="rounded-lg bg-paper px-3 py-1.5 text-xs font-semibold text-ink hover:bg-accentSoft"
            >
              + {typeLabel[t]}
            </button>
          ))}
        </div>
      </div>

      {profile.homeSections.map((s, i) => (
        <div key={s.id} className="ticket space-y-2 p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wide text-accent">
              {typeLabel[s.type]}
            </span>
            <div className="flex gap-1">
              <button onClick={() => moveSection(i, -1)} className="rounded bg-paper px-2 py-1 text-xs">
                ↑
              </button>
              <button onClick={() => moveSection(i, 1)} className="rounded bg-paper px-2 py-1 text-xs">
                ↓
              </button>
              <button onClick={() => removeSection(s.id)} className="rounded bg-paper px-2 py-1 text-xs text-danger">
                Hapus
              </button>
            </div>
          </div>

          {(s.type === 'banner' || s.type === 'promo') && (
            <Field label="Judul" value={s.judul || ''} onChange={(v) => updateSection(s.id, { judul: v })} />
          )}
          {(s.type === 'teks' || s.type === 'promo') && (
            <div>
              <label className="mb-1 block text-xs font-medium text-ink/60">Isi Teks</label>
              <textarea
                value={s.isi || ''}
                onChange={(e) => updateSection(s.id, { isi: e.target.value })}
                rows={3}
                className="w-full rounded-lg border border-ink/15 px-3 py-2 text-sm outline-none focus:border-accent"
              />
            </div>
          )}
          {(s.type === 'banner' || s.type === 'gambar') && (
            <ImageUploadField
              label="Gambar"
              value={s.gambarUrl || ''}
              onChange={(v) => updateSection(s.id, { gambarUrl: v })}
            />
          )}
        </div>
      ))}

      {msg && <p className="text-xs text-accent">{msg}</p>}
      <button
        onClick={save}
        disabled={saving}
        className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
      >
        {saving ? 'Menyimpan...' : 'Simpan Susunan Homepage'}
      </button>
    </div>
  );
}

function ImageUploadField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (url: string) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setUploading(true);
    try {
      const imageBase64 = await fileToBase64(file);
      const res = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64, filename: file.name }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Upload gagal');
      onChange(data.url);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-ink/60">{label}</label>
      <div className="flex items-center gap-3">
        {value && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={driveImageUrl(value)} alt={label} className="h-14 w-14 rounded-lg border border-ink/10 object-cover" />
        )}
        <div className="flex-1">
          <input type="file" accept="image/*" onChange={handleFile} className="w-full text-xs" />
          {uploading && <p className="mt-1 text-xs text-ink/50">Mengunggah...</p>}
          {error && <p className="mt-1 text-xs text-danger">{error}</p>}
        </div>
      </div>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="atau tempel link gambar manual"
        className="mt-2 w-full rounded-lg border border-ink/15 px-3 py-2 text-xs outline-none focus:border-accent"
      />
    </div>
  );
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-ink/60">{label}</label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-ink/15 px-3 py-2 text-sm outline-none focus:border-accent"
      />
    </div>
  );
}

// ============================================================
function CabangTab() {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [nama, setNama] = useState('');
  const [alamat, setAlamat] = useState('');
  const [waCS, setWaCS] = useState('');
  const [error, setError] = useState<string | null>(null);

  function load() {
    fetch('/api/branches').then((r) => r.json()).then((d) => setBranches(d.branches || []));
  }
  useEffect(load, []);

  async function addBranch() {
    setError(null);
    const res = await fetch('/api/branches', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nama, alamat, waCS }),
    });
    const data = await res.json();
    if (!res.ok) return setError(data.error);
    setBranches(data.branches);
    setNama('');
    setAlamat('');
    setWaCS('');
  }

  async function deleteBranch(id: string) {
    const res = await fetch('/api/branches', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    const data = await res.json();
    if (res.ok) setBranches(data.branches);
  }

  return (
    <div className="space-y-4">
      <div className="ticket space-y-2 p-4">
        <h2 className="font-display text-sm font-semibold text-ink">Tambah Cabang</h2>
        <Field label="Nama Cabang" value={nama} onChange={setNama} />
        <Field label="Alamat" value={alamat} onChange={setAlamat} />
        <Field label="Nomor WA CS Cabang" value={waCS} onChange={setWaCS} />
        {error && <p className="text-xs text-danger">{error}</p>}
        <button onClick={addBranch} className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white">
          Tambah
        </button>
      </div>
      <div className="ticket p-4">
        <h2 className="font-display text-sm font-semibold text-ink">Daftar Cabang</h2>
        <ul className="mt-2 divide-y divide-ink/10 text-sm">
          {branches.map((b) => (
            <li key={b.id} className="flex items-center justify-between py-2">
              <span>
                {b.nama} {b.alamat && <span className="text-ink/40">— {b.alamat}</span>}
              </span>
              <button onClick={() => deleteBranch(b.id)} className="text-xs text-danger">
                Hapus
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

// ============================================================
function KaryawanTab() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [nama, setNama] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'admin' | 'kasir' | 'superadmin'>('kasir');
  const [cabangId, setCabangId] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [myRole, setMyRole] = useState<string | null>(null);
  const isSuperadmin = myRole === 'superadmin';

  function load() {
    fetch('/api/employees').then((r) => r.json()).then((d) => setEmployees(d.employees || []));
    fetch('/api/branches').then((r) => r.json()).then((d) => setBranches(d.branches || []));
    fetch('/api/auth/me').then((r) => r.json()).then((d) => setMyRole(d.session?.role ?? null));
  }
  useEffect(load, []);

  async function addEmployee() {
    setError(null);
    const res = await fetch('/api/employees', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nama, username, password, role, cabangId }),
    });
    const data = await res.json();
    if (!res.ok) return setError(data.error);
    setNama('');
    setUsername('');
    setPassword('');
    load();
  }

  async function deleteEmployee(id: string) {
    const res = await fetch('/api/employees', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    if (res.ok) load();
  }

  return (
    <div className="space-y-4">
      <div className="ticket space-y-2 p-4">
        <h2 className="font-display text-sm font-semibold text-ink">Tambah Karyawan/Admin</h2>
        <Field label="Nama" value={nama} onChange={setNama} />
        <Field label="Username" value={username} onChange={setUsername} />
        <Field label="Password" value={password} onChange={setPassword} />
        <div>
          <label className="mb-1 block text-xs font-medium text-ink/60">Role</label>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as any)}
            className="w-full rounded-lg border border-ink/15 px-3 py-2 text-sm"
          >
            <option value="kasir">Kasir</option>
            {isSuperadmin && <option value="admin">Admin Cabang</option>}
            {isSuperadmin && <option value="superadmin">Superadmin</option>}
          </select>
          {!isSuperadmin && (
            <p className="mt-1 text-[11px] text-ink/40">Hanya superadmin yang bisa membuat akun Admin Cabang.</p>
          )}
        </div>
        {role !== 'superadmin' && (
          <div>
            <label className="mb-1 block text-xs font-medium text-ink/60">Cabang</label>
            <select
              value={cabangId}
              onChange={(e) => setCabangId(e.target.value)}
              className="w-full rounded-lg border border-ink/15 px-3 py-2 text-sm"
            >
              <option value="">Pilih cabang</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.nama}
                </option>
              ))}
            </select>
          </div>
        )}
        {role === 'superadmin' && (
          <p className="text-[11px] text-ink/40">Superadmin punya akses ke semua cabang, tidak perlu pilih cabang.</p>
        )}
        {error && <p className="text-xs text-danger">{error}</p>}
        <button onClick={addEmployee} className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white">
          Tambah
        </button>
      </div>
      <div className="ticket p-4">
        <h2 className="font-display text-sm font-semibold text-ink">Daftar Karyawan</h2>
        <ul className="mt-2 divide-y divide-ink/10 text-sm">
          {employees.map((e) => (
            <li key={e.id} className="flex items-center justify-between py-2">
              <span>
                {e.nama} ({e.username}) — <span className="capitalize text-ink/50">{e.role}</span>
              </span>
              {(isSuperadmin || e.role === 'kasir') && (
                <button onClick={() => deleteEmployee(e.id)} className="text-xs text-danger">
                  Hapus
                </button>
              )}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

// ============================================================
function ProdukTab() {
  const [products, setProducts] = useState<Product[]>([]);
  const [nama, setNama] = useState('');
  const [kode, setKode] = useState('');
  const [kategori, setKategori] = useState('');
  const [deskripsi, setDeskripsi] = useState('');
  const [hargaJual, setHargaJual] = useState('');
  const [isBotol, setIsBotol] = useState(false);
  const [ukuranBotolMl, setUkuranBotolMl] = useState('');
  const [imageDriveId, setImageDriveId] = useState('');
  const [importMsg, setImportMsg] = useState<string | null>(null);
  const [editing, setEditing] = useState<Product | null>(null);
  const [cariProduk, setCariProduk] = useState('');
  const filteredProducts = cariProduk.trim()
    ? products.filter(
        (p) =>
          p.nama.toLowerCase().includes(cariProduk.trim().toLowerCase()) ||
          p.kode.toLowerCase().includes(cariProduk.trim().toLowerCase())
      )
    : products;

  function load() {
    fetch('/api/products').then((r) => r.json()).then((d) => setProducts(d.products || []));
  }
  useEffect(load, []);

  async function addProduct() {
    const res = await fetch('/api/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nama,
        kode,
        kategori: kategori || undefined,
        deskripsi: deskripsi || undefined,
        hargaJual: hargaJual || undefined,
        isBotol,
        ukuranBotolMl: ukuranBotolMl || undefined,
        imageDriveId: imageDriveId || undefined,
      }),
    });
    if (res.ok) {
      setNama('');
      setKode('');
      setKategori('');
      setDeskripsi('');
      setHargaJual('');
      setUkuranBotolMl('');
      setImageDriveId('');
      load();
    }
  }

  async function saveEdit() {
    if (!editing) return;
    const res = await fetch('/api/products', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: editing.id,
        nama: editing.nama,
        kategori: editing.kategori || undefined,
        deskripsi: editing.deskripsi ?? '',
        hargaJual: editing.hargaJual,
        isBotol: editing.isBotol,
        ukuranBotolMl: editing.ukuranBotolMl,
        imageDriveId: editing.imageDriveId,
      }),
    });
    if (res.ok) {
      setEditing(null);
      load();
    }
  }

  async function deleteProduct(id: string) {
    const res = await fetch('/api/products', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    if (res.ok) load();
  }

  async function handleImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportMsg('Memproses file...');
    const buf = await file.arrayBuffer();
    const wb = XLSX.read(buf, { type: 'array' });
    const sheet = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet);

    const res = await fetch('/api/products/import', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rows }),
    });
    const data = await res.json();
    if (!res.ok) {
      setImportMsg(data.error);
      return;
    }
    setImportMsg(`Berhasil import ${data.imported} produk, dilewati ${data.skipped}.`);
    load();
  }

  return (
    <div className="space-y-4">
      <div className="ticket space-y-2 p-4">
        <h2 className="font-display text-sm font-semibold text-ink">Import Produk (Excel/CSV)</h2>
        <p className="text-xs text-ink/50">
          Kolom: <b>nama_product</b> (wajib), <b>kode_product</b> (opsional, auto-generate kalau kosong),{' '}
          <b>kategori_product</b> (opsional — isi salah satu: {KATEGORI_OPTIONS.join(', ')}). Kolom lain opsional:
          Deskripsi, Harga jual, link gambar, Ukuran Botol.
        </p>
        <input type="file" accept=".xlsx,.xls,.csv" onChange={handleImportFile} className="text-xs" />
        {importMsg && <p className="text-xs text-accent">{importMsg}</p>}
      </div>

      <div className="ticket space-y-2 p-4">
        <h2 className="font-display text-sm font-semibold text-ink">Tambah Produk Manual</h2>
        <Field label="Nama Parfum" value={nama} onChange={setNama} />
        <Field label="Kode" value={kode} onChange={setKode} />
        <div>
          <label className="mb-1 block text-xs font-medium text-ink/60">Kategori (menentukan harga per-ml di kasir)</label>
          <select
            value={kategori}
            onChange={(e) => setKategori(e.target.value)}
            className="w-full rounded-lg border border-ink/15 px-3 py-2 text-sm outline-none focus:border-accent"
          >
            <option value="">— Tanpa kategori —</option>
            {KATEGORI_OPTIONS.map((k) => (
              <option key={k} value={k}>
                {k}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-ink/60">Deskripsi (tampil di katalog belanja)</label>
          <textarea
            value={deskripsi}
            onChange={(e) => setDeskripsi(e.target.value)}
            rows={2}
            className="w-full rounded-lg border border-ink/15 px-3 py-2 text-sm outline-none focus:border-accent"
          />
        </div>
        <Field label="Harga Jual (opsional, kalau bukan isi ulang per-ml)" value={hargaJual} onChange={setHargaJual} />
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={isBotol} onChange={(e) => setIsBotol(e.target.checked)} />
          Parfum Isi Ulang (pakai ukuran ml + botol di katalog)
        </label>
        {isBotol && <Field label="Ukuran Botol Default (ml)" value={ukuranBotolMl} onChange={setUkuranBotolMl} />}
        <ImageUploadField label="Foto Produk (opsional)" value={imageDriveId} onChange={setImageDriveId} />
        <button onClick={addProduct} className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white">
          Tambah
        </button>
      </div>

      <div className="ticket p-4">
        <h2 className="font-display text-sm font-semibold text-ink">Daftar Produk ({filteredProducts.length}/{products.length})</h2>
        <input
          value={cariProduk}
          onChange={(e) => setCariProduk(e.target.value)}
          placeholder="Cari nama/kode produk..."
          className="mt-2 w-full rounded-lg border border-ink/15 px-3 py-2 text-sm outline-none focus:border-accent"
        />
        <ul className="mt-2 divide-y divide-ink/10 text-sm">
          {filteredProducts.map((p) => (
            <li key={p.id} className="flex items-center justify-between py-2">
              <button onClick={() => setEditing(p)} className="flex flex-1 items-center gap-2 text-left">
                {p.imageDriveId && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={driveImageUrl(p.imageDriveId)} alt={p.nama} className="h-8 w-8 rounded object-cover" />
                )}
                <span>
                  {p.nama} <span className="text-ink/40">({p.kode})</span>
                  {p.kategori && (
                    <span className="ml-2 rounded-full bg-accent/10 px-2 py-0.5 text-[10px] font-medium text-accent">
                      {p.kategori}
                    </span>
                  )}
                </span>
              </button>
              <div className="flex items-center gap-3">
                <button onClick={() => setEditing(p)} className="text-xs text-accent">
                  Edit
                </button>
                <button onClick={() => deleteProduct(p.id)} className="text-xs text-danger">
                  Hapus
                </button>
              </div>
            </li>
          ))}
        </ul>
      </div>

      {editing && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center"
          onClick={() => setEditing(null)}
        >
          <div className="ticket max-h-[85vh] w-full max-w-sm overflow-y-auto space-y-2 p-4" onClick={(e) => e.stopPropagation()}>
            <h2 className="font-display text-sm font-semibold text-ink">Edit Produk</h2>
            <Field label="Nama Parfum" value={editing.nama} onChange={(v) => setEditing({ ...editing, nama: v })} />
            <div>
              <label className="mb-1 block text-xs font-medium text-ink/60">Kategori</label>
              <select
                value={editing.kategori ?? ''}
                onChange={(e) => setEditing({ ...editing, kategori: e.target.value || undefined })}
                className="w-full rounded-lg border border-ink/15 px-3 py-2 text-sm outline-none focus:border-accent"
              >
                <option value="">— Tanpa kategori —</option>
                {KATEGORI_OPTIONS.map((k) => (
                  <option key={k} value={k}>
                    {k}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-ink/60">Deskripsi</label>
              <textarea
                value={editing.deskripsi ?? ''}
                onChange={(e) => setEditing({ ...editing, deskripsi: e.target.value })}
                rows={3}
                className="w-full rounded-lg border border-ink/15 px-3 py-2 text-sm outline-none focus:border-accent"
              />
            </div>
            <Field
              label="Harga Jual (opsional)"
              value={editing.hargaJual !== undefined ? String(editing.hargaJual) : ''}
              onChange={(v) => setEditing({ ...editing, hargaJual: v ? Number(v) : undefined })}
            />
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={editing.isBotol}
                onChange={(e) => setEditing({ ...editing, isBotol: e.target.checked })}
              />
              Parfum Isi Ulang
            </label>
            <ImageUploadField
              label="Foto Produk"
              value={editing.imageDriveId ?? ''}
              onChange={(v) => setEditing({ ...editing, imageDriveId: v })}
            />
            <div className="flex gap-2 pt-2">
              <button onClick={saveEdit} className="flex-1 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white">
                Simpan
              </button>
              <button
                onClick={() => setEditing(null)}
                className="flex-1 rounded-lg border border-ink/15 px-4 py-2 text-sm font-semibold text-ink"
              >
                Batal
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================
function HargaTab() {
  const [config, setConfig] = useState<PricingConfig | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/pricing')
      .then((r) => r.json())
      .then((d) => {
        const c: PricingConfig = d.config;
        // Jaga-jaga kalau baris pricing_config lama belum punya kolom
        // category_prices (belum jalanin migration SQL) — isi default 4
        // kategori biar UI tidak error dan tetap bisa diisi lalu disimpan.
        if (!Array.isArray(c.categoryPrices) || c.categoryPrices.length === 0) {
          c.categoryPrices = KATEGORI_OPTIONS.map((kategori) => ({ kategori, hargaPerMl: 0 }));
        }
        setConfig(c);
      });
  }, []);

  if (!config) return <p className="text-sm text-ink/50">Memuat...</p>;

  function updateMlTier(i: number, value: number) {
    const mlTiers = [...config!.mlTiers];
    mlTiers[i] = { hargaPerMl: value };
    setConfig({ ...config!, mlTiers });
  }
  function addMlTier() {
    setConfig({ ...config!, mlTiers: [...config!.mlTiers, { hargaPerMl: 0 }] });
  }
  function updateBottleTier(i: number, field: 'minMl' | 'maxMl' | 'harga', value: number) {
    const bottleTiers = [...config!.bottleTiers];
    bottleTiers[i] = { ...bottleTiers[i], [field]: value };
    setConfig({ ...config!, bottleTiers });
  }
  function addBottleTier() {
    setConfig({ ...config!, bottleTiers: [...config!.bottleTiers, { minMl: 0, maxMl: 0, harga: 0 }] });
  }
  function updateCategoryPrice(kategori: string, value: number) {
    const categoryPrices = config!.categoryPrices.map((c) => (c.kategori === kategori ? { ...c, hargaPerMl: value } : c));
    setConfig({ ...config!, categoryPrices });
  }

  async function save() {
    const res = await fetch('/api/pricing', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config),
    });
    const data = await res.json();
    setMsg(res.ok ? 'Tersimpan.' : data.error);
  }

  return (
    <div className="space-y-4">
      <div className="ticket p-4">
        <h2 className="font-display text-sm font-semibold text-ink">Harga per Kategori Produk (dipakai kasir dari katalog)</h2>
        <p className="mt-1 text-xs text-ink/50">
          Saat kasir pilih produk dari katalog, harga per-ml otomatis ikut kategori produk itu.
        </p>
        <div className="mt-2 space-y-2">
          {config.categoryPrices.map((c) => (
            <div key={c.kategori} className="flex items-center gap-2">
              <span className="w-20 shrink-0 text-sm capitalize text-ink/70">{c.kategori}</span>
              <span className="text-sm text-ink/40">Rp</span>
              <input
                type="number"
                value={c.hargaPerMl}
                onChange={(e) => updateCategoryPrice(c.kategori, Number(e.target.value))}
                className="w-full rounded-lg border border-ink/15 px-2 py-1.5 text-sm"
              />
              <span className="shrink-0 text-xs text-ink/40">/ml</span>
            </div>
          ))}
        </div>
      </div>

      <div className="ticket p-4">
        <h2 className="font-display text-sm font-semibold text-ink">Harga per ml (opsi manual, non-katalog)</h2>
        <div className="mt-2 grid grid-cols-3 gap-2">
          {config.mlTiers.map((t, i) => (
            <input
              key={i}
              type="number"
              value={t.hargaPerMl}
              onChange={(e) => updateMlTier(i, Number(e.target.value))}
              className="rounded-lg border border-ink/15 px-2 py-1.5 text-sm"
            />
          ))}
        </div>
        <button onClick={addMlTier} className="mt-2 text-xs text-accent">
          + Tambah tier harga
        </button>
      </div>

      <div className="ticket p-4">
        <h2 className="font-display text-sm font-semibold text-ink">Harga Botol (otomatis by ukuran)</h2>
        {config.bottleTiers.map((t, i) => (
          <div key={i} className="mt-2 grid grid-cols-3 gap-2">
            <input
              type="number"
              value={t.minMl}
              onChange={(e) => updateBottleTier(i, 'minMl', Number(e.target.value))}
              placeholder="Min ml"
              className="rounded-lg border border-ink/15 px-2 py-1.5 text-sm"
            />
            <input
              type="number"
              value={t.maxMl}
              onChange={(e) => updateBottleTier(i, 'maxMl', Number(e.target.value))}
              placeholder="Max ml"
              className="rounded-lg border border-ink/15 px-2 py-1.5 text-sm"
            />
            <input
              type="number"
              value={t.harga}
              onChange={(e) => updateBottleTier(i, 'harga', Number(e.target.value))}
              placeholder="Harga"
              className="rounded-lg border border-ink/15 px-2 py-1.5 text-sm"
            />
          </div>
        ))}
        <button onClick={addBottleTier} className="mt-2 text-xs text-accent">
          + Tambah tier botol
        </button>
      </div>

      {msg && <p className="text-xs text-accent">{msg}</p>}
      <button onClick={save} className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white">
        Simpan Harga
      </button>
    </div>
  );
}

// ============================================================
function VoucherTab() {
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [tipe, setTipe] = useState<'persen' | 'potongan'>('persen');
  const [nilai, setNilai] = useState('');

  function load() {
    fetch('/api/vouchers').then((r) => r.json()).then((d) => setVouchers(d.vouchers || []));
  }
  useEffect(load, []);

  async function addVoucher() {
    const res = await fetch('/api/vouchers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tipe, nilai: Number(nilai) }),
    });
    if (res.ok) {
      setNilai('');
      load();
    }
  }

  async function deleteVoucher(code: string) {
    const res = await fetch('/api/vouchers', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code }),
    });
    if (res.ok) load();
  }

  return (
    <div className="space-y-4">
      <div className="ticket space-y-2 p-4">
        <h2 className="font-display text-sm font-semibold text-ink">Buat Voucher (kode 5 digit otomatis)</h2>
        <select value={tipe} onChange={(e) => setTipe(e.target.value as any)} className="w-full rounded-lg border border-ink/15 px-3 py-2 text-sm">
          <option value="persen">Persen (%)</option>
          <option value="potongan">Potongan Harga (Rp)</option>
        </select>
        <Field label="Nilai" value={nilai} onChange={setNilai} />
        <button onClick={addVoucher} className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white">
          Buat Voucher
        </button>
      </div>
      <div className="ticket p-4">
        <h2 className="font-display text-sm font-semibold text-ink">Daftar Voucher</h2>
        <ul className="mt-2 divide-y divide-ink/10 text-sm">
          {vouchers.map((v) => (
            <li key={v.code} className="flex items-center justify-between py-2">
              <span>
                <strong>{v.code}</strong> — {v.nilai}
                {v.tipe === 'persen' ? '%' : ' Rp'} {!v.aktif && <span className="text-danger">(nonaktif)</span>}
              </span>
              <button onClick={() => deleteVoucher(v.code)} className="text-xs text-danger">
                Hapus
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

// ============================================================
type Session = { role: string; nama: string; cabangId: string | null; username: string };
type Periode = 'harian' | 'bulanan' | 'tahunan';

type ProductStockUsage = { productId: string; nama: string; kode: string; masukMl: number; keluarMl: number; net: number };
type KodeStockGroup = { kode: string; produk: ProductStockUsage[]; totalMasukMl: number; totalKeluarMl: number; totalNet: number };
type Snapshot = { productId: string; yearMonth: string; stokAwal: number | null; stokAkhir: number | null };

function stockRangeForPeriode(periode: Periode, key: string): { from: string; to: string } {
  if (periode === 'harian') return { from: key, to: key };
  if (periode === 'bulanan') {
    const [y, m] = key.split('-').map(Number);
    const lastDay = new Date(y, m, 0).getDate();
    return { from: `${key}-01`, to: `${key}-${String(lastDay).padStart(2, '0')}` };
  }
  return { from: `${key}-01-01`, to: `${key}-12-31` };
}

// Judul rekap yang enak dibaca ("Rekapan Stok Harian — Jumat, 31 Juli 2026")
// dipakai di sheet Excel supaya jelas ini rekap bulan/hari/tahun apa, bukan
// cuma tabel angka polos.
function judulPeriode(periode: Periode, key: string): string {
  if (periode === 'harian') {
    const d = new Date(`${key}T00:00:00`);
    const teks = d.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    return `Rekapan Stok Harian — ${teks}`;
  }
  if (periode === 'bulanan') {
    const [y, m] = key.split('-').map(Number);
    const d = new Date(y, m - 1, 1);
    const teks = d.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
    return `Rekapan Stok Bulanan — ${teks}`;
  }
  return `Rekapan Stok Tahunan — ${key}`;
}

function StokTab() {
  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);
  const thisMonthStr = todayStr.slice(0, 7);
  const thisYearStr = String(now.getFullYear());

  const [session, setSession] = useState<Session | null>(null);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [groups, setGroups] = useState<KodeStockGroup[]>([]);
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [loadingRecap, setLoadingRecap] = useState(true);

  const [cabangId, setCabangId] = useState('');
  const [periode, setPeriode] = useState<Periode>('harian');
  const [periodeKey, setPeriodeKey] = useState(todayStr);

  const [exporting, setExporting] = useState(false);
  const [exportMsg, setExportMsg] = useState<string | null>(null);

  const isSuperadmin = session?.role === 'superadmin';

  useEffect(() => {
    fetch('/api/auth/me').then((r) => r.json()).then((d) => {
      setSession(d.session);
      if (d.session?.cabangId) setCabangId(d.session.cabangId);
    });
    fetch('/api/branches').then((r) => r.json()).then((d) => setBranches(d.branches || []));
    fetch('/api/products').then((r) => r.json()).then((d) => setProducts(d.products || []));
  }, []);

  function loadRecap() {
    if (!cabangId) {
      setGroups([]);
      setSnapshots([]);
      setLoadingRecap(false);
      return;
    }
    setLoadingRecap(true);
    const { from, to } = stockRangeForPeriode(periode, periodeKey);
    fetch(`/api/stock-summary?cabangId=${cabangId}&from=${from}&to=${to}`)
      .then((r) => r.json())
      .then((d) => {
        setGroups(d.groups || []);
        setSnapshots(d.snapshots || []);
      })
      .finally(() => setLoadingRecap(false));
  }
  useEffect(loadRecap, [cabangId, periode, periodeKey]);

  function handlePeriodeChange(p: Periode) {
    setPeriode(p);
    setPeriodeKey(p === 'harian' ? todayStr : p === 'bulanan' ? thisMonthStr : thisYearStr);
  }

  function namaCabang(id: string) {
    return branches.find((b) => b.id === id)?.nama || id;
  }

  function snapshotFor(productId: string) {
    return snapshots.find((s) => s.productId === productId);
  }

  function exportStokExcel() {
    setExporting(true);
    setExportMsg(null);
    try {
      const wb = XLSX.utils.book_new();
      const label = periode === 'harian' ? 'Harian' : periode === 'bulanan' ? 'Bulanan' : 'Tahunan';
      const judul = judulPeriode(periode, periodeKey);
      const generatedAt = new Date().toLocaleString('id-ID', { dateStyle: 'long', timeStyle: 'short' });

      for (const g of groups) {
        const aoa: any[][] = [
          [judul],
          [`Cabang: ${namaCabang(cabangId)}`],
          [`Dicetak: ${generatedAt}`],
          [],
          [`Kode Seri: ${g.kode}`],
          ['Nama Parfum', 'Stok In (ml)', 'Stok Out (ml)', 'Selisih (ml)'],
        ];
        for (const p of g.produk) {
          aoa.push([p.nama, p.masukMl, p.keluarMl, p.net]);
        }
        aoa.push(['TOTAL', g.totalMasukMl, g.totalKeluarMl, g.totalNet]);
        if (periode !== 'harian') {
          aoa.push([]);
          aoa.push([`Stok Awal & Akhir — ${judul.replace('Rekapan Stok ', '')}`]);
          aoa.push(['Nama Parfum', 'Stok Lama/Awal (ml)', 'Stok Akhir (ml)']);
          for (const p of g.produk) {
            const snap = snapshotFor(p.productId);
            aoa.push([p.nama, snap?.stokAwal ?? '-', snap?.stokAkhir ?? '-']);
          }
        }
        const ws = XLSX.utils.aoa_to_sheet(aoa);
        ws['!cols'] = [{ wch: 28 }, { wch: 16 }, { wch: 16 }, { wch: 14 }];
        ws['!merges'] = [
          { s: { r: 0, c: 0 }, e: { r: 0, c: 3 } },
          { s: { r: 1, c: 0 }, e: { r: 1, c: 3 } },
          { s: { r: 2, c: 0 }, e: { r: 2, c: 3 } },
          { s: { r: 4, c: 0 }, e: { r: 4, c: 3 } },
        ];
        const cleanName = `Kode-${g.kode}`.replace(/[:\\/?*[\]]/g, '').slice(0, 31);
        XLSX.utils.book_append_sheet(wb, ws, cleanName || 'Kode');
      }
      if (groups.length === 0) {
        const kosong = XLSX.utils.aoa_to_sheet([
          [judul],
          [`Cabang: ${namaCabang(cabangId)}`],
          [],
          ['Tidak ada pergerakan stok di periode ini'],
        ]);
        XLSX.utils.book_append_sheet(wb, kosong, 'Kosong');
      }
      XLSX.writeFile(wb, `Rekap-Stok-${label}-${namaCabang(cabangId)}-${periodeKey}.xlsx`);
      setExportMsg('Berhasil export rekap stok.');
    } catch (err: any) {
      setExportMsg(err.message);
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="ticket space-y-3 p-4">
        <h2 className="font-display text-sm font-semibold text-ink">Rekap Stok per Kode Produk</h2>
        <p className="-mt-1 text-[11px] text-ink/40">
          IN = stok masuk (input KG dikonversi ML oleh admin/kasir cabang). OUT = otomatis dari penjualan harian.
        </p>

        {isSuperadmin && (
          <div>
            <label className="mb-1 block text-xs font-medium text-ink/60">Cabang</label>
            <select
              value={cabangId}
              onChange={(e) => setCabangId(e.target.value)}
              className="w-full rounded-lg border border-ink/15 px-3 py-2 text-sm outline-none focus:border-accent"
            >
              <option value="">Pilih cabang</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.nama}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="flex gap-2">
          {(['harian', 'bulanan', 'tahunan'] as const).map((p) => (
            <button
              key={p}
              onClick={() => handlePeriodeChange(p)}
              className={`flex-1 rounded-lg py-2 text-xs font-semibold capitalize ${
                periode === p ? 'bg-accent text-white' : 'bg-paper text-ink/60'
              }`}
            >
              {p}
            </button>
          ))}
        </div>

        {periode === 'harian' && (
          <input
            type="date"
            value={periodeKey}
            onChange={(e) => setPeriodeKey(e.target.value)}
            className="w-full rounded-lg border border-ink/15 px-3 py-2 text-sm outline-none focus:border-accent"
          />
        )}
        {periode === 'bulanan' && (
          <input
            type="month"
            value={periodeKey}
            onChange={(e) => setPeriodeKey(e.target.value)}
            className="w-full rounded-lg border border-ink/15 px-3 py-2 text-sm outline-none focus:border-accent"
          />
        )}
        {periode === 'tahunan' && (
          <input
            type="number"
            value={periodeKey}
            onChange={(e) => setPeriodeKey(e.target.value)}
            placeholder="mis. 2026"
            className="w-full rounded-lg border border-ink/15 px-3 py-2 text-sm outline-none focus:border-accent"
          />
        )}

        <button
          onClick={exportStokExcel}
          disabled={exporting || !cabangId}
          className="w-full rounded-lg bg-ink/90 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          {exporting ? 'Membuat file...' : `Export Excel Rekap Stok (${namaCabang(cabangId) || '-'})`}
        </button>
        {exportMsg && <p className="text-xs text-accent">{exportMsg}</p>}
      </div>

      <div className="ticket p-4">
        {loadingRecap && <p className="text-xs text-ink/50">Memuat...</p>}
        {!loadingRecap && groups.length === 0 && (
          <p className="text-xs text-ink/40">Belum ada pergerakan stok (masuk/keluar) untuk cabang & periode ini.</p>
        )}
        <div className="space-y-3">
          {!loadingRecap &&
            groups.map((g) => (
              <div key={g.kode} className="rounded-lg border border-ink/10 p-3">
                <div className="flex items-center justify-between">
                  <span className="font-display text-xs font-semibold text-ink">Kode: {g.kode}</span>
                  <span className={`text-xs font-semibold ${g.totalNet < 0 ? 'text-danger' : 'text-accent'}`}>
                    Net {g.totalNet.toLocaleString('id-ID')} ml
                  </span>
                </div>
                <table className="mt-2 w-full text-xs">
                  <thead>
                    <tr className="text-left text-ink/40">
                      <th className="pb-1 font-normal">Nama Parfum</th>
                      <th className="pb-1 text-right font-normal">IN</th>
                      <th className="pb-1 text-right font-normal">OUT</th>
                    </tr>
                  </thead>
                  <tbody>
                    {g.produk.map((p) => (
                      <tr key={p.productId} className="border-t border-ink/5">
                        <td className="py-1 text-ink">{p.nama}</td>
                        <td className="py-1 text-right text-accent">+{p.masukMl.toLocaleString('id-ID')}</td>
                        <td className="py-1 text-right text-danger">-{p.keluarMl.toLocaleString('id-ID')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}


// ============================================================
type RekapPeriode = 'harian' | 'bulanan' | 'tahunan' | 'semua';

function rangeForPeriode(periode: RekapPeriode): { from?: string; to?: string } {
  const now = new Date();
  if (periode === 'semua') return {};
  if (periode === 'harian') {
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    return { from: start.toISOString() };
  }
  if (periode === 'bulanan') {
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    return { from: start.toISOString() };
  }
  // tahunan
  const start = new Date(now.getFullYear(), 0, 1);
  return { from: start.toISOString() };
}

function RekapTab() {
  const [session, setSession] = useState<Session | null>(null);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [periode, setPeriode] = useState<RekapPeriode>('harian');
  const [cabangId, setCabangId] = useState('');
  const [data, setData] = useState<any>(null);
  const [exporting, setExporting] = useState(false);
  const [exportMsg, setExportMsg] = useState<string | null>(null);

  const isSuperadmin = session?.role === 'superadmin';

  useEffect(() => {
    fetch('/api/auth/me').then((r) => r.json()).then((d) => setSession(d.session));
    fetch('/api/branches').then((r) => r.json()).then((d) => setBranches(d.branches || []));
  }, []);

  useEffect(() => {
    const { from, to } = rangeForPeriode(periode);
    const params = new URLSearchParams();
    if (from) params.set('from', from);
    if (to) params.set('to', to);
    if (isSuperadmin && cabangId) params.set('cabangId', cabangId);
    fetch(`/api/reports/sales?${params.toString()}`)
      .then((r) => r.json())
      .then(setData);
  }, [periode, cabangId, isSuperadmin]);

  // Nama sheet Excel max 31 karakter & tidak boleh mengandung : \ / ? * [ ]
  function sheetName(prefix: string, raw: string, used: Set<string>): string {
    const cleaned = raw.replace(/[:\\/?*[\]]/g, '').trim() || 'Tanpa Nama';
    let base = `${prefix}-${cleaned}`.slice(0, 31);
    let name = base;
    let i = 2;
    while (used.has(name)) {
      const suffix = ` (${i})`;
      name = base.slice(0, 31 - suffix.length) + suffix;
      i += 1;
    }
    used.add(name);
    return name;
  }

  async function exportExcel() {
    setExporting(true);
    setExportMsg(null);
    try {
      const { from, to } = rangeForPeriode(periode);
      const params = new URLSearchParams();
      if (from) params.set('from', from);
      if (to) params.set('to', to);
      if (isSuperadmin && cabangId) params.set('cabangId', cabangId);
      const res = await fetch(`/api/reports/export?${params.toString()}`);
      const exportData = await res.json();
      if (!res.ok) throw new Error(exportData.error || 'Export gagal');

      const wb = XLSX.utils.book_new();
      const usedSheetNames = new Set<string>();

      // ---- Sheet Ringkasan ----
      const label = periode === 'harian' ? 'Harian' : periode === 'bulanan' ? 'Bulanan' : periode === 'tahunan' ? 'Tahunan' : 'Semua';
      const ringkasan = XLSX.utils.json_to_sheet([
        { Keterangan: 'Periode', Nilai: label },
        { Keterangan: 'Total Transaksi', Nilai: exportData.totalTransaksi },
        { Keterangan: 'Total Ml', Nilai: exportData.totalMl },
        { Keterangan: 'Total Pendapatan', Nilai: exportData.totalPendapatan },
      ]);
      XLSX.utils.book_append_sheet(wb, ringkasan, sheetName('', 'Ringkasan', usedSheetNames));

      // ---- 1 sheet per kode produk ----
      // Baris = tanggal + nama parfum + total ml + total rupiah hari itu,
      // ditutup blok TOTAL per nama parfum (rekap keseluruhan periode).
      for (const kodeGroup of exportData.perKode || []) {
        const cabangLabel = isSuperadmin ? (cabangId ? branches.find((b) => b.id === cabangId)?.nama || cabangId : 'Semua Cabang') : (branches.find((b) => b.id === session?.cabangId)?.nama || '-');
        const aoa: any[][] = [
          [`Rekap Penjualan ${label} — Kode ${kodeGroup.kode}`],
          [`Cabang: ${cabangLabel}`],
          [`Dicetak: ${new Date().toLocaleString('id-ID', { dateStyle: 'long', timeStyle: 'short' })}`],
          [],
          ['Tanggal', 'Nama Parfum', 'Total Ml', 'Total Pendapatan'],
        ];
        for (const r of kodeGroup.rows) {
          aoa.push([r.tanggal, r.parfum, r.totalMl, r.totalRupiah]);
        }
        aoa.push([]);
        aoa.push(['TOTAL PER NAMA PARFUM (semua tanggal)']);
        aoa.push(['Nama Parfum', 'Total Ml Terjual', 'Total Pendapatan']);
        let grandMl = 0;
        let grandRp = 0;
        for (const s of kodeGroup.subtotal) {
          aoa.push([s.parfum, s.totalMl, s.totalRupiah]);
          grandMl += s.totalMl;
          grandRp += s.totalRupiah;
        }
        aoa.push(['TOTAL', grandMl, grandRp]);

        const ws = XLSX.utils.aoa_to_sheet(aoa);
        ws['!cols'] = [{ wch: 22 }, { wch: 26 }, { wch: 14 }, { wch: 18 }];
        ws['!merges'] = [
          { s: { r: 0, c: 0 }, e: { r: 0, c: 3 } },
          { s: { r: 1, c: 0 }, e: { r: 1, c: 3 } },
          { s: { r: 2, c: 0 }, e: { r: 2, c: 3 } },
        ];
        XLSX.utils.book_append_sheet(wb, ws, sheetName('Kode', kodeGroup.kode, usedSheetNames));
      }

      // ---- 1 sheet per karyawan ----
      // Baris detail tiap transaksi (semua kode produk digabung), ditutup
      // blok TOTAL per nama parfum untuk karyawan itu.
      for (const kGroup of exportData.perKaryawan || []) {
        const aoa: any[][] = [['Tanggal', 'Cabang', 'Tipe', 'Nama Parfum', 'Ml', 'Harga/ml', 'Subtotal']];
        for (const r of kGroup.rows) {
          aoa.push([r.tanggal, r.cabang, r.tipe, r.parfum, r.ml, r.hargaPerMl, r.subtotal]);
        }
        aoa.push([]);
        aoa.push(['TOTAL PENJUALAN PER NAMA PARFUM (semua kode produk digabung)']);
        aoa.push(['Nama Parfum', 'Total Ml Terjual', 'Total Pendapatan']);
        let grandMl = 0;
        let grandRp = 0;
        for (const s of kGroup.subtotal) {
          aoa.push([s.parfum, s.totalMl, s.totalRupiah]);
          grandMl += s.totalMl;
          grandRp += s.totalRupiah;
        }
        aoa.push(['TOTAL', grandMl, grandRp]);

        const ws = XLSX.utils.aoa_to_sheet(aoa);
        XLSX.utils.book_append_sheet(wb, ws, sheetName('', kGroup.karyawan, usedSheetNames));
      }

      XLSX.writeFile(wb, `Rekap-Penjualan-${label}-${new Date().toISOString().slice(0, 10)}.xlsx`);
      setExportMsg(`Berhasil export: ${(exportData.perKode || []).length} sheet kode produk, ${(exportData.perKaryawan || []).length} sheet karyawan.`);
    } catch (err: any) {
      setExportMsg(err.message);
    } finally {
      setExporting(false);
    }
  }

  if (!data) return <p className="text-sm text-ink/50">Memuat...</p>;
  if (data.error) return <p className="text-sm text-danger">{data.error}</p>;

  const maxOrder = Math.max(...data.bestSeller.map((b: any) => b.jumlahOrder), 1);

  return (
    <div className="space-y-4">
      <div className="ticket flex flex-wrap items-center gap-2 p-3">
        {(['harian', 'bulanan', 'tahunan', 'semua'] as RekapPeriode[]).map((p) => (
          <button
            key={p}
            onClick={() => setPeriode(p)}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold capitalize ${
              periode === p ? 'bg-accent text-white' : 'bg-paper text-ink/60'
            }`}
          >
            {p}
          </button>
        ))}
        {isSuperadmin && (
          <select
            value={cabangId}
            onChange={(e) => setCabangId(e.target.value)}
            className="ml-auto rounded-lg border border-ink/15 px-2 py-1.5 text-xs"
          >
            <option value="">Semua Cabang</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.nama}
              </option>
            ))}
          </select>
        )}
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div className="ticket p-3 text-center">
          <p className="text-xs text-ink/50">Total Transaksi</p>
          <p className="font-display text-lg font-semibold text-ink">{data.totalTransaksi}</p>
        </div>
        <div className="ticket p-3 text-center">
          <p className="text-xs text-ink/50">Total Ml</p>
          <p className="font-display text-lg font-semibold text-ink">{data.totalMl}</p>
        </div>
        <div className="ticket p-3 text-center">
          <p className="text-xs text-ink/50">Total Pendapatan</p>
          <p className="font-display text-lg font-semibold text-ink">
            Rp{data.totalPendapatan.toLocaleString('id-ID')}
          </p>
        </div>
      </div>

      <div className="ticket space-y-2 p-4">
        <button
          onClick={exportExcel}
          disabled={exporting}
          className="w-full rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          {exporting ? 'Menyiapkan file...' : `Export Data Penjualan (${periode}) ke Excel`}
        </button>
        {exportMsg && <p className="text-xs text-accent">{exportMsg}</p>}
      </div>

      <div className="ticket p-4">
        <h2 className="font-display text-sm font-semibold text-ink">Best Seller (berdasarkan jumlah order)</h2>
        <div className="mt-3 space-y-2">
          {data.bestSeller.map((b: any) => (
            <div key={b.nama}>
              <div className="flex justify-between text-xs text-ink/60">
                <span>{b.nama}</span>
                <span>{b.jumlahOrder}× order · {b.ml}ml</span>
              </div>
              <div className="mt-1 h-2 rounded-full bg-paper">
                <div
                  className="h-2 rounded-full bg-accent"
                  style={{ width: `${(b.jumlahOrder / maxOrder) * 100}%` }}
                />
              </div>
            </div>
          ))}
          {data.bestSeller.length === 0 && <p className="text-xs text-ink/40">Belum ada transaksi.</p>}
        </div>
      </div>

      <div className="ticket p-4">
        <h2 className="font-display text-sm font-semibold text-ink">Rekap per Karyawan</h2>
        <ul className="mt-2 divide-y divide-ink/10 text-sm">
          {data.perKaryawan.map((k: any) => (
            <li key={k.karyawan} className="flex justify-between py-2">
              <span>{k.karyawan}</span>
              <span>
                {k.totalMl}ml — Rp{k.totalPendapatan.toLocaleString('id-ID')}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------
// Tab Pesanan (rekap semua pesanan self-checkout dari semua cabang,
// admin bisa lihat & filter per cabang; sama seperti tab Pesanan
// di halaman kasir tapi tanpa batasan 1 cabang untuk superadmin).
// ---------------------------------------------------------------
function PesananAdminTab() {
  const [branches, setBranches] = useState<{ id: string; nama: string }[]>([]);
  const [cabangId, setCabangId] = useState('');
  const [status, setStatus] = useState<'pending' | 'diterima' | 'selesai' | 'dihapus'>('pending');
  const [list, setList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/branches').then((r) => r.json()).then((d) => setBranches(d.branches || []));
  }, []);

  useEffect(() => {
    setLoading(true);
    const qs = new URLSearchParams({ status });
    if (cabangId) qs.set('cabangId', cabangId);
    fetch(`/api/pesanan?${qs.toString()}`)
      .then((r) => r.json())
      .then((d) => setList(d.pesanan || []))
      .finally(() => setLoading(false));
  }, [cabangId, status]);

  return (
    <div className="space-y-3">
      <div className="ticket flex flex-wrap gap-2 p-3">
        <select
          value={cabangId}
          onChange={(e) => setCabangId(e.target.value)}
          className="rounded-lg border border-ink/15 px-3 py-2 text-xs"
        >
          <option value="">Semua Cabang</option>
          {branches.map((b) => (
            <option key={b.id} value={b.id}>
              {b.nama}
            </option>
          ))}
        </select>
        {(['pending', 'diterima', 'selesai', 'dihapus'] as const).map((s) => (
          <button
            key={s}
            onClick={() => setStatus(s)}
            className={`rounded-lg px-3 py-2 text-xs font-semibold capitalize ${
              status === s ? 'bg-accent text-white' : 'bg-paper text-ink/60'
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      {loading && <p className="text-xs text-ink/50">Memuat...</p>}
      {!loading && list.length === 0 && <p className="text-xs text-ink/40">Tidak ada pesanan di status ini.</p>}

      {list.map((p) => (
        <div key={p.id} className="ticket space-y-2 p-4">
          <div className="flex items-center justify-between text-xs text-ink/50">
            <span>{new Date(p.createdAt).toLocaleString('id-ID')}</span>
            <span>{branches.find((b) => b.id === p.cabangId)?.nama || p.cabangId}</span>
          </div>
          <ul className="divide-y divide-ink/10 text-sm">
            {p.items.map((it: any, i: number) => (
              <li key={i} className="flex justify-between py-1">
                <span>
                  {it.namaParfum} — {it.ml}ml
                </span>
                <span>Rp{it.subtotal.toLocaleString('id-ID')}</span>
              </li>
            ))}
          </ul>
          <div className="flex justify-between text-sm font-semibold text-ink">
            <span>Total ({p.totalMl}ml)</span>
            <span>Rp{p.totalHarga.toLocaleString('id-ID')}</span>
          </div>
          {(p.memberNama || p.memberWa) && (
            <p className="text-xs text-ink/60">
              Member: {p.memberNama || '-'} {p.memberWa ? `· ${p.memberWa}` : ''}
            </p>
          )}
          {p.diprosesOleh && <p className="text-xs text-ink/50">Diproses oleh: {p.diprosesOleh}</p>}
          {p.buktiBayarUrl && (
            <div>
              <p className="text-xs font-medium text-ink/60">Bukti Bayar:</p>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={driveImageUrl(p.buktiBayarUrl)} alt="Bukti bayar" className="mt-1 max-h-56 rounded-lg" />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
