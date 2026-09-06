'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import PesananTab from '@/components/PesananTab';
import ProductCatalog from '@/components/ProductCatalog';

type Session = { role: string; nama: string; cabangId: string | null; username: string };
type Branch = { id: string; nama: string };
type PricingConfig = {
  mlTiers: { hargaPerMl: number }[];
  bottleTiers: { minMl: number; maxMl: number; harga: number }[];
  categoryPrices: { kategori: string; hargaPerMl: number }[];
};
type Product = { id: string; nama: string; kode: string; kategori?: string };
type CartItem = { productId?: string; namaParfum: string; ml: number; hargaPerMl: number };
type Member = {
  id: string;
  nama: string;
  wa: string;
  poinTotal: number;
  poinSaatIni: number;
  pengisianKe: number;
  totalPenukaran: number;
  penukaranTerpakai: number;
};

export default function KasirPage() {
  const router = useRouter();
  const [mainTab, setMainTab] = useState<'checkout' | 'pesanan'>('checkout');
  const [session, setSession] = useState<Session | null>(null);
  const [pricing, setPricing] = useState<PricingConfig | null>(null);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [selectedCabangId, setSelectedCabangId] = useState<string>('');

  const [hargaPerMl, setHargaPerMl] = useState<number>(0);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [inputMode, setInputMode] = useState<'rupiah' | 'ml'>('rupiah');
  const [inputValue, setInputValue] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);

  const [pakaiBotol, setPakaiBotol] = useState(false);
  const [ukuranBotolMl, setUkuranBotolMl] = useState<number>(5);

  const [tipe, setTipe] = useState<'ecer' | 'grosir'>('ecer');
  const [waMember, setWaMember] = useState('');
  const [namaMember, setNamaMember] = useState('');
  const [waRegistrasiBaru, setWaRegistrasiBaru] = useState('');
  const [member, setMember] = useState<Member | null>(null);
  const [memberSearchStatus, setMemberSearchStatus] = useState<'idle' | 'found' | 'notfound'>('idle');
  const [memberSearchResults, setMemberSearchResults] = useState<{ id: string; nama: string; wa: string }[]>([]);
  const [gratisMode, setGratisMode] = useState(false);
  const [redeeming, setRedeeming] = useState(false);

  const [voucherInput, setVoucherInput] = useState('');
  const [voucherChecking, setVoucherChecking] = useState(false);
  const [voucherApplied, setVoucherApplied] = useState<{ code: string; tipe: 'persen' | 'potongan'; nilai: number } | null>(
    null
  );
  const [voucherMsg, setVoucherMsg] = useState<string | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // ===== Input Susulan (lupa input penjualan di tanggal kejadiannya) =====
  // Sama persis alur checkout di bawah — bedanya cuma createdAt transaksi
  // di-backdate ke tanggal yang dipilih. Diaktifkan via toggle manual, atau
  // otomatis kalau dibuka dari link "Input Susulan" (?susulan=1) di halaman
  // Data Harian / Stok.
  const [susulanMode, setSusulanMode] = useState(false);
  const [tanggalSusulan, setTanggalSusulan] = useState(() => new Date().toISOString().slice(0, 10));
  useEffect(() => {
    if (typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('susulan') === '1') {
      setSusulanMode(true);
    }
  }, []);

  // ===== Tambah produk baru langsung dari katalog belanja =====
  // Dipicu dari ProductCatalog saat kasir cari produk yang ternyata belum
  // ada di katalog — biar bisa langsung tambah tanpa pindah halaman.
  const [tambahProdukOpen, setTambahProdukOpen] = useState(false);
  const [tambahProdukNama, setTambahProdukNama] = useState('');
  const [tambahProdukKode, setTambahProdukKode] = useState('');
  const [tambahProdukKategori, setTambahProdukKategori] = useState<'biasa' | 'premium' | 'sultan' | 'series'>('biasa');
  const [tambahProdukSubmitting, setTambahProdukSubmitting] = useState(false);
  const [tambahProdukMsg, setTambahProdukMsg] = useState<{ type: 'ok' | 'error'; text: string } | null>(null);

  function bukaFormTambahProduk(namaAwal: string) {
    setTambahProdukNama(namaAwal);
    setTambahProdukKode('');
    setTambahProdukMsg(null);
    setTambahProdukOpen(true);
  }

  async function submitTambahProduk() {
    setTambahProdukMsg(null);
    if (!tambahProdukNama.trim()) return setTambahProdukMsg({ type: 'error', text: 'Nama produk wajib diisi.' });
    if (!tambahProdukKode.trim())
      return setTambahProdukMsg({ type: 'error', text: 'Kode produk wajib diisi (mis. R, Pr, Db, Dk).' });
    setTambahProdukSubmitting(true);
    try {
      const res = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nama: tambahProdukNama.trim(),
          kode: tambahProdukKode.trim(),
          kategori: tambahProdukKategori,
        }),
      });
      const data = await res.json();
      if (res.status === 409) {
        setTambahProdukMsg({ type: 'error', text: data.error });
        return;
      }
      if (!res.ok) throw new Error(data.error || 'Gagal menambah produk');
      // Refresh katalog & langsung pilih produk yang baru ditambah.
      const refreshed = await fetch('/api/products').then((r) => r.json());
      setProducts(Array.isArray(refreshed.products) ? refreshed.products : []);
      setSelectedProductId(data.product.id);
      setTambahProdukOpen(false);
    } catch (err: any) {
      setTambahProdukMsg({ type: 'error', text: err.message });
    } finally {
      setTambahProdukSubmitting(false);
    }
  }

  useEffect(() => {
    fetch('/api/auth/me')
      .then((r) => r.json())
      .then((d) => setSession(d.session));
    fetch('/api/pricing')
      .then((r) => r.json())
      .then((d) => setPricing(d.config));
    fetch('/api/branches')
      .then((r) => r.json())
      .then((d) => setBranches(Array.isArray(d.branches) ? d.branches : []));
    fetch('/api/products')
      .then((r) => r.json())
      .then((d) => setProducts(Array.isArray(d.products) ? d.products : []));
  }, []);

  const selectedProduct = products.find((p) => p.id === selectedProductId) || null;

  // Kasir: harga per-ml default ikut kategori produk (diatur admin di Admin >
  // Toko > Harga), TAPI kasir tetap bisa override manual — beda dari katalog
  // customer yang harganya baku/otomatis, tanpa bisa dipilih-pilih.
  useEffect(() => {
    if (!selectedProduct || !pricing) {
      setHargaPerMl(0);
      return;
    }
    const tier = pricing.categoryPrices?.find((c) => c.kategori === selectedProduct.kategori);
    setHargaPerMl(tier ? tier.hargaPerMl : 0);
  }, [selectedProduct, pricing]);

  // Daftar pilihan harga per-ml buat override manual kasir: gabungan semua
  // harga kategori + tier harga lama, angka unik, urut dari kecil ke besar.
  const hargaOverrideOptions = pricing
    ? Array.from(
        new Set([
          ...(pricing.categoryPrices || []).map((c) => c.hargaPerMl),
          ...(pricing.mlTiers || []).map((t) => t.hargaPerMl),
        ])
      )
        .filter((n) => n > 0)
        .sort((a, b) => a - b)
    : [];

  // Superadmin tidak terikat 1 cabang (cabangId null), jadi harus pilih
  // cabang secara manual sebelum bisa checkout. Staff/admin biasa langsung
  // pakai cabangId dari sesi login mereka.
  const effectiveCabangId = session?.cabangId || selectedCabangId || '';

  const [stockMap, setStockMap] = useState<Record<string, number>>({});
  function loadStock() {
    if (!effectiveCabangId) {
      setStockMap({});
      return;
    }
    fetch(`/api/stock-current?cabangId=${effectiveCabangId}`)
      .then((r) => r.json())
      .then((d) => {
        const map: Record<string, number> = {};
        for (const s of d.stok || []) map[s.productId] = s.sisa;
        setStockMap(map);
      })
      .catch(() => setStockMap({}));
  }
  useEffect(loadStock, [effectiveCabangId]);
  // Kasir sering pindah tab ke /kasir/stok buat input stok masuk lalu balik
  // lagi ke halaman checkout ini — supaya angka "sisa stok" & status
  // habis/tidaknya produk langsung ke-update tanpa perlu reload manual,
  // refresh ulang begitu tab ini kembali aktif/fokus.
  useEffect(() => {
    function onFocus() {
      loadStock();
    }
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onFocus);
    return () => {
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onFocus);
    };
  }, [effectiveCabangId]);

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/');
    router.refresh();
  }

  const mlFromInput =
    inputMode === 'rupiah'
      ? Math.round(((Number(inputValue) || 0) / hargaPerMl) * 10) / 10
      : Number(inputValue) || 0;
  const rupiahFromInput =
    inputMode === 'ml'
      ? Math.round((Number(inputValue) || 0) * hargaPerMl)
      : Number(inputValue) || 0;

  const biayaBotol =
    pakaiBotol && pricing
      ? (Array.isArray(pricing.bottleTiers) ? pricing.bottleTiers : []).find((t) => ukuranBotolMl >= t.minMl && ukuranBotolMl <= t.maxMl)?.harga ?? 0
      : 0;

  const subtotalParfum = cart.reduce((s, it) => s + Math.round(it.ml * it.hargaPerMl), 0);
  const totalMl = Math.round(cart.reduce((s, it) => s + it.ml, 0) * 10) / 10;
  const totalHarga = subtotalParfum + biayaBotol;
  const diskon = voucherApplied
    ? voucherApplied.tipe === 'persen'
      ? Math.round((totalHarga * voucherApplied.nilai) / 100)
      : Math.min(voucherApplied.nilai, totalHarga)
    : 0;
  const totalSetelahDiskon = Math.max(0, totalHarga - diskon);

  async function cekVoucher() {
    if (!voucherInput.trim()) return;
    setVoucherChecking(true);
    setVoucherMsg(null);
    try {
      const res = await fetch('/api/voucher-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: voucherInput.trim(), memberWa: tipe === 'ecer' ? member?.wa : undefined }),
      });
      const data = await res.json();
      if (data.valid) {
        setVoucherApplied({ code: voucherInput.trim().toUpperCase(), tipe: data.tipe, nilai: data.nilai });
        setVoucherMsg('Voucher berhasil dipakai.');
      } else {
        setVoucherApplied(null);
        setVoucherMsg(data.error || 'Kode voucher tidak valid.');
      }
    } catch {
      setVoucherApplied(null);
      setVoucherMsg('Gagal memeriksa voucher.');
    } finally {
      setVoucherChecking(false);
    }
  }

  function hapusVoucher() {
    setVoucherApplied(null);
    setVoucherInput('');
    setVoucherMsg(null);
  }

  function addToCart() {
    if (!selectedProduct || mlFromInput <= 0) return;
    if (!gratisMode && hargaPerMl <= 0) return;
    setCart((c) => [
      ...c,
      {
        productId: selectedProduct.id,
        namaParfum: gratisMode ? `${selectedProduct.nama} (GRATIS reward)` : selectedProduct.nama,
        ml: mlFromInput,
        hargaPerMl: gratisMode ? 0 : hargaPerMl,
      },
    ]);
    setSelectedProductId('');
    setInputValue('');
    setGratisMode(false);
  }

  function removeFromCart(idx: number) {
    setCart((c) => c.filter((_, i) => i !== idx));
  }

  async function cariMember() {
    if (!waMember.trim()) return;
    const res = await fetch('/api/members/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ q: waMember.trim() }),
    });
    const data = await res.json();
    setMemberSearchResults(data.members || []);
    if (!data.members || data.members.length === 0) {
      setMember(null);
      setMemberSearchStatus('notfound');
    }
  }

  async function pilihMemberHasil(m: { id: string; nama: string; wa: string }) {
    const res = await fetch('/api/members/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ wa: m.wa }),
    });
    const data = await res.json();
    setMember(data.member || null);
    setNamaMember(m.nama);
    setWaMember(m.wa);
    setMemberSearchStatus('found');
    setMemberSearchResults([]);
  }

  async function redeemGratis() {
    if (!member) return;
    setRedeeming(true);
    try {
      const res = await fetch('/api/members/redeem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ memberId: member.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal menukar reward');
      setMember(data.member);
      setGratisMode(true);
      setStep(1);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setRedeeming(false);
    }
  }

  async function handleCheckout() {
    if (!effectiveCabangId) {
      setError('Cabang belum dipilih. Pilih cabang toko dulu di atas.');
      return;
    }
    if (cart.length === 0) {
      setError('Keranjang masih kosong.');
      return;
    }
    if (tipe === 'ecer' && !member && !namaMember.trim()) {
      setError('Cari member lama atau isi nama untuk daftar member baru.');
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cabangId: effectiveCabangId,
          items: cart,
          ukuranBotolMl: pakaiBotol ? ukuranBotolMl : undefined,
          tipe,
          member:
            tipe === 'ecer'
              ? member
                ? { id: member.id }
                : { wa: waRegistrasiBaru.trim() || undefined, nama: namaMember.trim() }
              : undefined,
          voucherCode: voucherApplied?.code || undefined,
          susulan: susulanMode,
          tanggal: susulanMode ? new Date(`${tanggalSusulan}T12:00:00`).toISOString() : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Checkout gagal');
      setResult(data);
      loadStock(); // stok abis laku, langsung update angkanya di katalog
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  function resetTransaksi() {
    setCart([]);
    setMember(null);
    setWaMember('');
    setNamaMember('');
    setMemberSearchStatus('idle');
    setMemberSearchResults([]);
    setGratisMode(false);
    setVoucherApplied(null);
    setVoucherInput('');
    setVoucherMsg(null);
    setResult(null);
    setError(null);
    setStep(1);
  }

  if (result) {
    return (
      <main className="mx-auto max-w-md px-4 py-8">
        <div className="ticket p-6">
          <h1 className="font-display text-xl font-semibold text-ink">Transaksi Berhasil</h1>
          <p className="mt-1 text-sm text-ink/60">Total ml: {result.calc.totalMl} ml</p>
          <p className="text-sm text-ink/60">Total bayar: Rp{result.calc.totalHarga.toLocaleString('id-ID')}</p>
          {result.calc.diskon > 0 && (
            <p className="text-sm text-accent">
              Voucher {result.voucherCode}: -Rp{result.calc.diskon.toLocaleString('id-ID')} → Bayar Rp
              {result.calc.totalSetelahDiskon.toLocaleString('id-ID')}
            </p>
          )}
          {result.member && (
            <p className="mt-2 text-sm text-accent">
              Poin didapat member: {result.calc.totalMl} • Total poin: {result.member.poinTotal}
            </p>
          )}
          {result.waLink && (
            <a
              href={result.waLink}
              target="_blank"
              rel="noreferrer"
              className="mt-4 block rounded-card bg-accent px-4 py-3 text-center text-sm font-semibold text-white hover:opacity-90"
            >
              Lanjutkan ke WA
            </a>
          )}
          <button
            onClick={resetTransaksi}
            className="mt-3 w-full rounded-card border border-ink/15 px-4 py-3 text-sm font-semibold text-ink hover:bg-paper"
          >
            Transaksi Baru
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-md px-4 py-6 pb-24">
      <div className="flex items-center justify-between">
        <p className="text-xs uppercase tracking-widest text-accent">
          Kasir · {session?.nama} {session?.cabangId ? '' : '(super admin)'}
        </p>
        <div className="flex flex-wrap items-center justify-end gap-3">
          <a href="/akun/password" className="text-xs text-accent underline">
            Ganti Password
          </a>
          <a href="/kasir/stok" className="text-xs text-accent underline">
            Input Stok →
          </a>
          <button onClick={handleLogout} className="text-xs font-semibold text-danger underline">
            Keluar
          </button>
        </div>
      </div>
      <h1 className="mt-1 font-display text-2xl font-semibold text-ink">Checkout Etalase</h1>

      {/* Tab: Checkout langsung vs Pesanan self-checkout yang perlu di-ACC */}
      <div className="mt-3 flex gap-2">
        <button
          onClick={() => setMainTab('checkout')}
          className={`flex-1 rounded-lg py-2 text-xs font-semibold ${
            mainTab === 'checkout' ? 'bg-accent text-white' : 'bg-paper text-ink/60'
          }`}
        >
          Checkout
        </button>
        <button
          onClick={() => setMainTab('pesanan')}
          className={`flex-1 rounded-lg py-2 text-xs font-semibold ${
            mainTab === 'pesanan' ? 'bg-accent text-white' : 'bg-paper text-ink/60'
          }`}
        >
          Pesanan (Self-Checkout)
        </button>
      </div>

      {mainTab === 'pesanan' ? (
        <div className="mt-4">
          <PesananTab />
        </div>
      ) : (
      <>
      {/* Superadmin tidak terikat 1 cabang — wajib pilih cabang manual dulu */}
      {!session?.cabangId && (
        <div className="ticket mt-3 space-y-1 p-3">
          <label className="block text-xs font-medium text-ink/60">Pilih Cabang Toko</label>
          <select
            value={selectedCabangId}
            onChange={(e) => setSelectedCabangId(e.target.value)}
            className="w-full rounded-lg border border-ink/15 px-3 py-2 text-sm outline-none focus:border-accent"
          >
            <option value="">— Pilih cabang —</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.nama}
              </option>
            ))}
          </select>
          {branches.length === 0 && (
            <p className="text-xs text-warn">Belum ada cabang toko terdaftar. Tambah cabang dulu di panel admin.</p>
          )}
        </div>
      )}

      {/* Step indicator */}
      <div className="mt-3 flex items-center gap-2">
        {[1, 2, 3].map((s) => (
          <div key={s} className="flex flex-1 items-center gap-2">
            <div
              className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                step >= s ? 'bg-accent text-white' : 'bg-paper text-ink/40'
              }`}
            >
              {s}
            </div>
            <span className={`text-xs ${step >= s ? 'text-ink' : 'text-ink/40'}`}>
              {s === 1 ? 'Parfum' : s === 2 ? 'Ringkasan' : 'Member & Bayar'}
            </span>
            {s < 3 && <div className="h-px flex-1 bg-ink/10" />}
          </div>
        ))}
      </div>

      {/* ===== STEP 1: Pilih Parfum ===== */}
      {step === 1 && (
        <>
          <div className="ticket mt-4 space-y-2 p-3">
            <label className="flex items-center gap-2 text-sm font-semibold text-ink">
              <input type="checkbox" checked={susulanMode} onChange={(e) => setSusulanMode(e.target.checked)} />
              🕒 Input Susulan (lupa dicatat kemarin/tanggal lain)
            </label>
            {susulanMode && (
              <div>
                <label className="mb-1 block text-xs font-medium text-ink/60">
                  Tanggal penjualan yang sebenarnya
                </label>
                <input
                  type="date"
                  value={tanggalSusulan}
                  onChange={(e) => setTanggalSusulan(e.target.value)}
                  max={new Date().toISOString().slice(0, 10)}
                  className="w-full rounded-lg border border-ink/15 px-3 py-2 text-sm outline-none focus:border-accent"
                />
                <p className="mt-1 text-[11px] text-ink/40">
                  Checkout ini akan tercatat masuk rekap tanggal di atas, bukan hari ini — dan ditandai "susulan" buat admin.
                </p>
              </div>
            )}
          </div>

          <div className="ticket mt-4 flex gap-2 p-3">
            {(['ecer', 'grosir'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTipe(t)}
                className={`flex-1 rounded-lg py-2 text-sm font-semibold capitalize ${
                  tipe === t ? 'bg-accent text-white' : 'bg-paper text-ink/60'
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          <div className="ticket mt-4 space-y-3 p-4">
            <h2 className="font-display text-sm font-semibold text-ink">Pilih Parfum dari Katalog</h2>
            <ProductCatalog
              products={products}
              stockMap={effectiveCabangId ? stockMap : undefined}
              stockMode="kasir"
              hargaHint={(p) => {
                const tier = pricing?.categoryPrices?.find((c) => c.kategori === p.kategori);
                return tier ? `Rp${tier.hargaPerMl.toLocaleString('id-ID')}/ml` : 'Kategori belum diset';
              }}
              onSelectProduct={(p) => setSelectedProductId(p.id)}
              onAddNewProduct={bukaFormTambahProduk}
            />
            {tambahProdukOpen && (
              <div className="space-y-2 rounded-lg border border-dashed border-accent/40 bg-accentSoft/40 p-3">
                <p className="text-xs font-semibold text-ink">+ Tambah Produk Baru</p>
                <p className="-mt-1 text-[11px] text-ink/50">
                  Kalau nama parfum sudah ada di kode produk yang sama, akan ditolak & dikasih peringatan — kode lain
                  tetap boleh punya nama yang mirip.
                </p>
                <input
                  value={tambahProdukNama}
                  onChange={(e) => setTambahProdukNama(e.target.value)}
                  placeholder="Nama parfum"
                  className="w-full rounded-lg border border-ink/15 px-3 py-2 text-sm outline-none focus:border-accent"
                />
                <input
                  value={tambahProdukKode}
                  onChange={(e) => setTambahProdukKode(e.target.value)}
                  placeholder="Kode produk, mis. Pr / R / Db / Dk"
                  className="w-full rounded-lg border border-ink/15 px-3 py-2 text-sm outline-none focus:border-accent"
                />
                <select
                  value={tambahProdukKategori}
                  onChange={(e) => setTambahProdukKategori(e.target.value as any)}
                  className="w-full rounded-lg border border-ink/15 px-3 py-2 text-sm capitalize outline-none focus:border-accent"
                >
                  {(['biasa', 'premium', 'sultan', 'series'] as const).map((k) => (
                    <option key={k} value={k} className="capitalize">
                      {k}
                    </option>
                  ))}
                </select>
                {tambahProdukMsg && (
                  <p className={`text-xs ${tambahProdukMsg.type === 'ok' ? 'text-accent' : 'text-danger'}`}>
                    {tambahProdukMsg.text}
                  </p>
                )}
                <div className="flex gap-2">
                  <button
                    onClick={() => setTambahProdukOpen(false)}
                    className="flex-1 rounded-lg border border-ink/15 py-2 text-xs font-semibold text-ink/60"
                  >
                    Batal
                  </button>
                  <button
                    onClick={submitTambahProduk}
                    disabled={tambahProdukSubmitting}
                    className="flex-1 rounded-lg bg-accent py-2 text-xs font-semibold text-white disabled:opacity-50"
                  >
                    {tambahProdukSubmitting ? 'Menyimpan...' : 'Simpan Produk'}
                  </button>
                </div>
              </div>
            )}
            {products.length === 0 && (
              <p className="text-xs text-warn">
                Katalog produk masih kosong. Tambah/import produk dulu di Admin → Toko → Produk.
              </p>
            )}
            {selectedProduct && (
              <div className="rounded-lg bg-accentSoft p-3">
                <p className="text-xs text-ink/70">
                  Dipilih: <span className="font-semibold text-ink">{selectedProduct.nama}</span> · Kategori:{' '}
                  <span className="font-semibold text-ink">{selectedProduct.kategori || '—'}</span>
                  {!selectedProduct.kategori && (
                    <span className="text-danger"> (produk ini belum ada kategori, set dulu di Admin → Produk)</span>
                  )}
                </p>
                <div className="mt-2">
                  <label className="mb-1 block text-xs font-medium text-ink/60">
                    Harga per Ml (otomatis dari kategori, bisa diubah manual kalau perlu)
                  </label>
                  <select
                    value={hargaPerMl}
                    onChange={(e) => setHargaPerMl(Number(e.target.value))}
                    className="w-full rounded-lg border border-ink/15 bg-white px-3 py-2 text-sm font-semibold text-ink outline-none focus:border-accent"
                  >
                    {hargaPerMl > 0 && !hargaOverrideOptions.includes(hargaPerMl) && (
                      <option value={hargaPerMl}>Rp{hargaPerMl.toLocaleString('id-ID')}/ml (default kategori)</option>
                    )}
                    {hargaOverrideOptions.length === 0 && <option value={0}>Belum ada tier harga diatur admin</option>}
                    {hargaOverrideOptions.map((h) => (
                      <option key={h} value={h}>
                        Rp{h.toLocaleString('id-ID')}/ml
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}
            <div className="flex gap-2">
              <button
                onClick={() => setInputMode('rupiah')}
                className={`flex-1 rounded-lg py-1.5 text-xs font-semibold ${
                  inputMode === 'rupiah' ? 'bg-accentSoft text-accent' : 'bg-paper text-ink/50'
                }`}
              >
                Input Rupiah
              </button>
              <button
                onClick={() => setInputMode('ml')}
                className={`flex-1 rounded-lg py-1.5 text-xs font-semibold ${
                  inputMode === 'ml' ? 'bg-accentSoft text-accent' : 'bg-paper text-ink/50'
                }`}
              >
                Input Ml
              </button>
            </div>
            <input
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              type="number"
              placeholder={inputMode === 'rupiah' ? 'Nominal dibayar (mis. 20000)' : 'Jumlah ml (mis. 10)'}
              className="w-full rounded-lg border border-ink/15 px-3 py-2 text-sm outline-none focus:border-accent"
            />
            <p className="text-xs text-ink/50">
              {inputMode === 'rupiah'
                ? `≈ ${mlFromInput} ml`
                : `≈ Rp${rupiahFromInput.toLocaleString('id-ID')}`}
            </p>
            {gratisMode && (
              <p className="rounded-lg bg-warn/20 px-3 py-2 text-xs font-semibold text-warn">
                🎁 Mode gratis aktif — parfum berikutnya yang ditambahkan akan GRATIS (reward member)
              </p>
            )}
            <button
              onClick={addToCart}
              disabled={!selectedProduct || (!gratisMode && hargaPerMl <= 0)}
              className="w-full rounded-lg bg-ink px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-40"
            >
              {gratisMode ? '🎁 Tambah Item Gratis' : '+ Tambah ke Keranjang'}
            </button>
          </div>

          <div className="ticket mt-4 space-y-2 p-4">
            <label className="flex items-center gap-2 text-sm font-semibold text-ink">
              <input type="checkbox" checked={pakaiBotol} onChange={(e) => setPakaiBotol(e.target.checked)} />
              Pakai Botol
            </label>
            {pakaiBotol && (
              <div>
                <input
                  type="number"
                  value={ukuranBotolMl}
                  onChange={(e) => setUkuranBotolMl(Number(e.target.value))}
                  className="w-full rounded-lg border border-ink/15 px-3 py-2 text-sm outline-none focus:border-accent"
                  placeholder="Ukuran botol (ml)"
                />
                <p className="mt-1 text-xs text-ink/50">Biaya botol: Rp{biayaBotol.toLocaleString('id-ID')}</p>
              </div>
            )}
          </div>

          {cart.length > 0 && (
            <div className="ticket mt-4 p-4">
              <h2 className="font-display text-sm font-semibold text-ink">Keranjang ({cart.length})</h2>
              <ul className="mt-2 divide-y divide-ink/10">
                {cart.map((it, i) => (
                  <li key={i} className="flex items-center justify-between py-2 text-sm">
                    <span>
                      {it.namaParfum} — {it.ml}ml x Rp{it.hargaPerMl.toLocaleString('id-ID')}
                    </span>
                    <button onClick={() => removeFromCart(i)} className="text-xs text-danger">
                      Hapus
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}

      {/* ===== STEP 2: Ringkasan & Voucher ===== */}
      {step === 2 && (
        <>
          <div className="ticket mt-4 p-4">
            <h2 className="font-display text-sm font-semibold text-ink">Ringkasan Pesanan</h2>
            <ul className="mt-2 divide-y divide-ink/10 text-sm">
              {cart.map((it, i) => (
                <li key={i} className="flex justify-between py-2">
                  <span>{it.namaParfum}</span>
                  <span>
                    {it.ml}ml — Rp{Math.round(it.ml * it.hargaPerMl).toLocaleString('id-ID')}
                  </span>
                </li>
              ))}
              {pakaiBotol && (
                <li className="flex justify-between py-2">
                  <span>Botol {ukuranBotolMl}ml</span>
                  <span>Rp{biayaBotol.toLocaleString('id-ID')}</span>
                </li>
              )}
            </ul>
            <div className="mt-2 flex justify-between border-t border-ink/10 pt-2 text-sm font-semibold text-ink">
              <span>Total ({totalMl}ml)</span>
              <span>Rp{totalHarga.toLocaleString('id-ID')}</span>
            </div>
            {voucherApplied && (
              <div className="mt-1 flex justify-between text-sm text-accent">
                <span>Voucher {voucherApplied.code}</span>
                <span>-Rp{diskon.toLocaleString('id-ID')}</span>
              </div>
            )}
          </div>

          <div className="ticket mt-4 space-y-2 p-4">
            <h2 className="font-display text-sm font-semibold text-ink">Kode Voucher</h2>
            {voucherApplied ? (
              <div className="flex items-center justify-between rounded-lg bg-accentSoft px-3 py-2 text-sm text-accent">
                <span>
                  Voucher <strong>{voucherApplied.code}</strong> aktif (
                  {voucherApplied.tipe === 'persen' ? `${voucherApplied.nilai}%` : `Rp${voucherApplied.nilai.toLocaleString('id-ID')}`})
                </span>
                <button onClick={hapusVoucher} className="text-xs underline">
                  Hapus
                </button>
              </div>
            ) : (
              <div className="flex gap-2">
                <input
                  value={voucherInput}
                  onChange={(e) => setVoucherInput(e.target.value.toUpperCase())}
                  placeholder="Kode voucher dari pelanggan"
                  className="flex-1 rounded-lg border border-ink/15 px-3 py-2 text-sm outline-none focus:border-accent"
                />
                <button
                  onClick={cekVoucher}
                  disabled={voucherChecking || !voucherInput.trim()}
                  className="rounded-lg bg-paper px-3 py-2 text-xs font-semibold text-ink disabled:opacity-50"
                >
                  {voucherChecking ? 'Cek...' : 'Pakai'}
                </button>
              </div>
            )}
            {voucherMsg && (
              <p className={`text-xs ${voucherApplied ? 'text-accent' : 'text-danger'}`}>{voucherMsg}</p>
            )}
          </div>
        </>
      )}

      {/* ===== STEP 3: Member & Checkout ===== */}
      {step === 3 && (
        <>
          {tipe === 'ecer' && (
            <div className="ticket mt-4 space-y-2 p-4">
              <h2 className="font-display text-sm font-semibold text-ink">Member</h2>
              <div className="flex gap-2">
                <input
                  value={waMember}
                  onChange={(e) => setWaMember(e.target.value)}
                  placeholder="Cari nama atau nomor WA member"
                  className="flex-1 rounded-lg border border-ink/15 px-3 py-2 text-sm outline-none focus:border-accent"
                />
                <button
                  onClick={cariMember}
                  className="rounded-lg bg-paper px-3 py-2 text-xs font-semibold text-ink"
                >
                  Cari
                </button>
              </div>

              {memberSearchResults.length > 0 && (
                <ul className="divide-y divide-ink/10 rounded-lg border border-ink/10">
                  {memberSearchResults.map((m) => (
                    <li key={m.id}>
                      <button
                        onClick={() => pilihMemberHasil(m)}
                        className="flex w-full items-center justify-between px-3 py-2 text-left text-xs hover:bg-paper"
                      >
                        <span>
                          {m.nama} {m.wa ? `· ${m.wa}` : ''}
                        </span>
                        <span className="text-ink/40">Pilih</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              {memberSearchStatus === 'found' && member && (
                <>
                  <p className="text-xs text-accent">
                    Member ditemukan: {member.nama} • Poin: {member.poinTotal} • Pengisian ke-{member.pengisianKe}
                  </p>
                  {(member.totalPenukaran || 0) - (member.penukaranTerpakai || 0) > 0 && (
                    <button
                      onClick={redeemGratis}
                      disabled={redeeming || gratisMode}
                      className="w-full rounded-lg bg-warn/20 px-3 py-2 text-xs font-semibold text-warn disabled:opacity-60"
                    >
                      {gratisMode
                        ? '🎁 Mode gratis aktif — pilih parfum di Step 1'
                        : redeeming
                        ? 'Memproses...'
                        : `🎁 Tukar Parfum Gratis (sisa ${
                            (member.totalPenukaran || 0) - (member.penukaranTerpakai || 0)
                          }x)`}
                    </button>
                  )}
                </>
              )}
              {memberSearchStatus === 'notfound' && (
                <>
                  <p className="text-xs text-warn">Tidak ketemu — isi data di bawah utk daftar member baru.</p>
                  <input
                    value={namaMember}
                    onChange={(e) => setNamaMember(e.target.value)}
                    placeholder="Nama member baru (wajib)"
                    className="w-full rounded-lg border border-ink/15 px-3 py-2 text-sm outline-none focus:border-accent"
                  />
                  <input
                    value={waRegistrasiBaru}
                    onChange={(e) => setWaRegistrasiBaru(e.target.value)}
                    placeholder="Nomor WA (opsional)"
                    className="w-full rounded-lg border border-ink/15 px-3 py-2 text-sm outline-none focus:border-accent"
                  />
                </>
              )}
            </div>
          )}

          <div className="ticket mt-4 p-4 text-sm font-semibold text-ink">
            Total Bayar: Rp{totalSetelahDiskon.toLocaleString('id-ID')}
          </div>

          {error && <p className="mt-3 text-sm text-danger">{error}</p>}

          <button
            onClick={handleCheckout}
            disabled={submitting || cart.length === 0}
            className="mt-4 w-full rounded-card bg-accent px-4 py-3 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
          >
            {submitting ? 'Memproses...' : `Checkout — Rp${totalSetelahDiskon.toLocaleString('id-ID')}`}
          </button>
        </>
      )}

      {/* Nav bawah */}
      <div className="mt-4 flex gap-2">
        {step > 1 && (
          <button
            onClick={() => setStep((s) => (s - 1) as 1 | 2)}
            className="flex-1 rounded-card border border-ink/15 px-4 py-3 text-sm font-semibold text-ink hover:bg-paper"
          >
            ← Kembali
          </button>
        )}
        {step < 3 && (
          <button
            onClick={() => setStep((s) => (s + 1) as 2 | 3)}
            disabled={cart.length === 0}
            className="flex-1 rounded-card bg-accent px-4 py-3 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
          >
            Lanjut →
          </button>
        )}
      </div>
      </>
      )}
    </main>
  );
}
