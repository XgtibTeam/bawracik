'use client';

import { useEffect, useState } from 'react';
import * as XLSX from 'xlsx';

type Branch = { id: string; nama: string; alamat?: string; waCS?: string };
type Employee = { id: string; nama: string; username: string; role: string; cabangId: string | null };
type Product = { id: string; nama: string; kode: string; hargaJual?: number; isBotol: boolean; ukuranBotolMl?: number; imageDriveId?: string };
type PricingConfig = {
  mlTiers: { hargaPerMl: number }[];
  bottleTiers: { minMl: number; maxMl: number; harga: number }[];
};
type Voucher = { code: string; tipe: string; nilai: number; aktif: boolean };
type HomeSection = { id: string; type: 'banner' | 'teks' | 'gambar' | 'promo'; judul?: string; isi?: string; gambarUrl?: string };
type StoreProfile = {
  namaToko: string;
  deskripsi: string;
  logoUrl: string;
  socialMedia: { instagram?: string; whatsapp?: string; tiktok?: string };
  pembayaran: { qrisImageUrl?: string; dana?: string; seabank?: string };
  homeSections: HomeSection[];
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
        <label className="mb-1 block text-xs font-medium text-ink/60">Deskripsi</label>
        <textarea
          value={profile.deskripsi}
          onChange={(e) => setProfile({ ...profile, deskripsi: e.target.value })}
          rows={3}
          className="w-full rounded-lg border border-ink/15 px-3 py-2 text-sm outline-none focus:border-accent"
        />
      </div>
      <ImageUploadField label="Logo Toko" value={profile.logoUrl} onChange={(v) => setProfile({ ...profile, logoUrl: v })} />
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
          <img src={value} alt={label} className="h-14 w-14 rounded-lg border border-ink/10 object-cover" />
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
  const [role, setRole] = useState<'admin' | 'kasir'>('kasir');
  const [cabangId, setCabangId] = useState('');
  const [error, setError] = useState<string | null>(null);

  function load() {
    fetch('/api/employees').then((r) => r.json()).then((d) => setEmployees(d.employees || []));
    fetch('/api/branches').then((r) => r.json()).then((d) => setBranches(d.branches || []));
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
            <option value="admin">Admin Cabang</option>
          </select>
        </div>
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
              <button onClick={() => deleteEmployee(e.id)} className="text-xs text-danger">
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
function ProdukTab() {
  const [products, setProducts] = useState<Product[]>([]);
  const [nama, setNama] = useState('');
  const [kode, setKode] = useState('');
  const [hargaJual, setHargaJual] = useState('');
  const [isBotol, setIsBotol] = useState(false);
  const [ukuranBotolMl, setUkuranBotolMl] = useState('');
  const [imageDriveId, setImageDriveId] = useState('');
  const [importMsg, setImportMsg] = useState<string | null>(null);

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
        hargaJual: hargaJual || undefined,
        isBotol,
        ukuranBotolMl: ukuranBotolMl || undefined,
        imageDriveId: imageDriveId || undefined,
      }),
    });
    if (res.ok) {
      setNama('');
      setKode('');
      setHargaJual('');
      setUkuranBotolMl('');
      setImageDriveId('');
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
          Kolom: Nama Parfum, Kode, Harga jual (opsional), link gambar (opsional), Ukuran Botol (opsional)
        </p>
        <input type="file" accept=".xlsx,.xls,.csv" onChange={handleImportFile} className="text-xs" />
        {importMsg && <p className="text-xs text-accent">{importMsg}</p>}
      </div>

      <div className="ticket space-y-2 p-4">
        <h2 className="font-display text-sm font-semibold text-ink">Tambah Produk Manual</h2>
        <Field label="Nama Parfum" value={nama} onChange={setNama} />
        <Field label="Kode" value={kode} onChange={setKode} />
        <Field label="Harga Jual (opsional)" value={hargaJual} onChange={setHargaJual} />
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={isBotol} onChange={(e) => setIsBotol(e.target.checked)} />
          Produk Botol
        </label>
        {isBotol && <Field label="Ukuran Botol (ml)" value={ukuranBotolMl} onChange={setUkuranBotolMl} />}
        <ImageUploadField label="Foto Produk (opsional)" value={imageDriveId} onChange={setImageDriveId} />
        <button onClick={addProduct} className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white">
          Tambah
        </button>
      </div>

      <div className="ticket p-4">
        <h2 className="font-display text-sm font-semibold text-ink">Daftar Produk ({products.length})</h2>
        <ul className="mt-2 divide-y divide-ink/10 text-sm">
          {products.map((p) => (
            <li key={p.id} className="flex items-center justify-between py-2">
              <span className="flex items-center gap-2">
                {p.imageDriveId && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.imageDriveId} alt={p.nama} className="h-8 w-8 rounded object-cover" />
                )}
                {p.nama} <span className="text-ink/40">({p.kode})</span>
              </span>
              <button onClick={() => deleteProduct(p.id)} className="text-xs text-danger">
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
function HargaTab() {
  const [config, setConfig] = useState<PricingConfig | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/pricing').then((r) => r.json()).then((d) => setConfig(d.config));
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
        <h2 className="font-display text-sm font-semibold text-ink">Harga per ml</h2>
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
type StockRecap = {
  id: string;
  cabangId: string;
  productId: string;
  periode: Periode;
  tanggal: string;
  stokAwal: number;
  stokAkhir: number;
  createdBy: string;
  createdAt: string;
};

function StokTab() {
  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);
  const thisMonthStr = todayStr.slice(0, 7);
  const thisYearStr = String(now.getFullYear());

  const [session, setSession] = useState<Session | null>(null);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [recap, setRecap] = useState<StockRecap[]>([]);
  const [loadingRecap, setLoadingRecap] = useState(true);

  const [cabangId, setCabangId] = useState('');
  const [periode, setPeriode] = useState<Periode>('harian');
  const [tanggal, setTanggal] = useState(todayStr);
  const [productId, setProductId] = useState('');
  const [stokAwal, setStokAwal] = useState('');
  const [stokAkhir, setStokAkhir] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

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
      setRecap([]);
      setLoadingRecap(false);
      return;
    }
    setLoadingRecap(true);
    fetch(`/api/stock-recap?cabangId=${cabangId}&periode=${periode}`)
      .then((r) => r.json())
      .then((d) => setRecap(d.recap || []))
      .finally(() => setLoadingRecap(false));
  }
  useEffect(loadRecap, [cabangId, periode]);

  function handlePeriodeChange(p: Periode) {
    setPeriode(p);
    setTanggal(p === 'harian' ? todayStr : p === 'bulanan' ? thisMonthStr : thisYearStr);
  }

  async function submit() {
    setError(null);
    setMsg(null);
    if (!cabangId) return setError('Pilih cabang dulu.');
    if (!productId) return setError('Pilih produk dulu.');
    if (stokAwal === '' || stokAkhir === '') return setError('Isi stok awal dan stok akhir.');

    setSubmitting(true);
    try {
      const res = await fetch('/api/stock-recap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cabangId,
          productId,
          periode,
          tanggal,
          stokAwal: Number(stokAwal),
          stokAkhir: Number(stokAkhir),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal menyimpan rekap stok');
      setMsg('Rekap stok tersimpan.');
      setStokAwal('');
      setStokAkhir('');
      loadRecap();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  function namaProduk(id: string) {
    return products.find((p) => p.id === id)?.nama || id;
  }
  function namaCabang(id: string) {
    return branches.find((b) => b.id === id)?.nama || id;
  }

  return (
    <div className="space-y-4">
      <div className="ticket space-y-3 p-4">
        <h2 className="font-display text-sm font-semibold text-ink">Input Rekap Stok</h2>

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

        <div>
          <label className="mb-1 block text-xs font-medium text-ink/60">Produk</label>
          <select
            value={productId}
            onChange={(e) => setProductId(e.target.value)}
            className="w-full rounded-lg border border-ink/15 px-3 py-2 text-sm outline-none focus:border-accent"
          >
            <option value="">Pilih produk</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nama} ({p.kode})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-ink/60">
            {periode === 'harian' ? 'Tanggal' : periode === 'bulanan' ? 'Bulan' : 'Tahun'}
          </label>
          {periode === 'harian' && (
            <input
              type="date"
              value={tanggal}
              onChange={(e) => setTanggal(e.target.value)}
              className="w-full rounded-lg border border-ink/15 px-3 py-2 text-sm outline-none focus:border-accent"
            />
          )}
          {periode === 'bulanan' && (
            <input
              type="month"
              value={tanggal}
              onChange={(e) => setTanggal(e.target.value)}
              className="w-full rounded-lg border border-ink/15 px-3 py-2 text-sm outline-none focus:border-accent"
            />
          )}
          {periode === 'tahunan' && (
            <input
              type="number"
              value={tanggal}
              onChange={(e) => setTanggal(e.target.value)}
              placeholder="mis. 2026"
              className="w-full rounded-lg border border-ink/15 px-3 py-2 text-sm outline-none focus:border-accent"
            />
          )}
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Field label="Stok Awal" value={stokAwal} onChange={setStokAwal} />
          <Field label="Stok Akhir" value={stokAkhir} onChange={setStokAkhir} />
        </div>

        {error && <p className="text-xs text-danger">{error}</p>}
        {msg && <p className="text-xs text-accent">{msg}</p>}

        <button
          onClick={submit}
          disabled={submitting}
          className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          {submitting ? 'Menyimpan...' : 'Simpan Rekap Stok'}
        </button>
      </div>

      <div className="ticket p-4">
        <h2 className="font-display text-sm font-semibold text-ink">Riwayat Rekap ({periode})</h2>
        {loadingRecap && <p className="mt-2 text-xs text-ink/50">Memuat...</p>}
        {!loadingRecap && recap.length === 0 && (
          <p className="mt-2 text-xs text-ink/40">Belum ada rekap untuk periode & cabang ini.</p>
        )}
        <ul className="mt-2 divide-y divide-ink/10 text-sm">
          {recap.map((r) => (
            <li key={r.id} className="py-2">
              <div className="flex justify-between">
                <span className="font-medium text-ink">{namaProduk(r.productId)}</span>
                <span className="text-ink/50">{r.tanggal}</span>
              </div>
              <div className="mt-0.5 flex justify-between text-xs text-ink/60">
                <span>
                  Awal: {r.stokAwal} → Akhir: {r.stokAkhir} (terpakai {r.stokAwal - r.stokAkhir})
                </span>
                <span>
                  {isSuperadmin ? `${namaCabang(r.cabangId)} · ` : ''}
                  oleh {r.createdBy}
                </span>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

// ============================================================
function RekapTab() {
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    fetch('/api/reports/sales').then((r) => r.json()).then(setData);
  }, []);

  if (!data) return <p className="text-sm text-ink/50">Memuat...</p>;
  if (data.error) return <p className="text-sm text-danger">{data.error}</p>;

  const maxMl = Math.max(...data.bestSeller.map((b: any) => b.ml), 1);

  return (
    <div className="space-y-4">
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
          <p className="text-xs text-ink/50">Pendapatan</p>
          <p className="font-display text-lg font-semibold text-ink">
            Rp{data.totalPendapatan.toLocaleString('id-ID')}
          </p>
        </div>
      </div>

      <div className="ticket p-4">
        <h2 className="font-display text-sm font-semibold text-ink">Best Seller (by ml terjual)</h2>
        <div className="mt-3 space-y-2">
          {data.bestSeller.map((b: any) => (
            <div key={b.nama}>
              <div className="flex justify-between text-xs text-ink/60">
                <span>{b.nama}</span>
                <span>{b.ml}ml</span>
              </div>
              <div className="mt-1 h-2 rounded-full bg-paper">
                <div
                  className="h-2 rounded-full bg-accent"
                  style={{ width: `${(b.ml / maxMl) * 100}%` }}
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
