'use client';

import { useEffect, useMemo, useState } from 'react';
import { driveImageUrl } from '@/lib/drive-url';
import ProductCatalog from '@/components/ProductCatalog';

type Branch = { id: string; nama: string; alamat?: string };
type Product = {
  id: string;
  nama: string;
  kode: string;
  deskripsi?: string;
  hargaJual?: number;
  imageDriveId?: string;
  kategori?: string;
  isBotol: boolean;
};
type PricingConfig = {
  mlTiers: { hargaPerMl: number }[];
  bottleTiers: { minMl: number; maxMl: number; harga: number }[];
};
type StoreProfile = {
  namaToko: string;
  pembayaran: { qrisImageUrl?: string; dana?: string; seabank?: string };
};
type CartItem = {
  productId?: string;
  namaParfum: string;
  ml: number;
  hargaPerMl: number;
  pakaiBotol: boolean;
  ukuranBotolMl?: number;
  qty: number;
};

export default function BelanjaPage() {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [pricing, setPricing] = useState<PricingConfig | null>(null);
  const [profile, setProfile] = useState<StoreProfile | null>(null);
  const [loadingCatalog, setLoadingCatalog] = useState(true);

  const [cabangId, setCabangId] = useState('');
  const [tipe, setTipe] = useState<'ecer' | 'grosir'>('ecer');
  const [cart, setCart] = useState<CartItem[]>([]);

  // ----- Stok per cabang (beda-beda tiap cabang yang dipilih) -----
  const [stockMap, setStockMap] = useState<Record<string, number>>({});

  // ----- Modal detail produk (katalog gaya e-commerce) -----
  const [detailProduct, setDetailProduct] = useState<Product | null>(null);
  const [pilihMl, setPilihMl] = useState(5);
  const [pilihHargaPerMl, setPilihHargaPerMl] = useState(0);
  const [pilihPakaiBotol, setPilihPakaiBotol] = useState(true);
  const [pilihQty, setPilihQty] = useState(1);

  const [waMember, setWaMember] = useState('');
  const [namaMember, setNamaMember] = useState('');
  const [waRegistrasi, setWaRegistrasi] = useState('');
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [memberSearchResults, setMemberSearchResults] = useState<{ id: string; nama: string; wa: string }[]>([]);
  const [memberSearchStatus, setMemberSearchStatus] = useState<'idle' | 'found' | 'notfound'>('idle');

  async function cariMember() {
    if (!waMember.trim()) return;
    const res = await fetch('/api/members/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ q: waMember.trim() }),
    });
    const data = await res.json();
    setMemberSearchResults(data.members || []);
  }

  function pilihMemberHasil(m: { id: string; nama: string; wa: string }) {
    setSelectedMemberId(m.id);
    setNamaMember(m.nama);
    setWaRegistrasi(m.wa);
    setMemberSearchStatus('found');
    setMemberSearchResults([]);
  }

  const [voucherInput, setVoucherInput] = useState('');
  const [voucherChecking, setVoucherChecking] = useState(false);
  const [voucherApplied, setVoucherApplied] = useState<{ code: string; tipe: 'persen' | 'potongan'; nilai: number } | null>(
    null
  );
  const [voucherMsg, setVoucherMsg] = useState<string | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<any>(null);
  const [buktiPreview, setBuktiPreview] = useState<string | null>(null);
  const [step, setStep] = useState<1 | 2 | 3>(1);

  useEffect(() => {
    Promise.all([
      fetch('/api/branches').then((r) => r.json()).then((d) => setBranches(d.branches || [])),
      fetch('/api/products').then((r) => r.json()).then((d) => setProducts(d.products || [])),
      fetch('/api/pricing').then((r) => r.json()).then((d) => {
        setPricing(d.config);
        const tiers = Array.isArray(d.config?.mlTiers) ? d.config.mlTiers : [];
        if (tiers.length > 0) setPilihHargaPerMl(tiers[0].hargaPerMl);
      }),
      fetch('/api/store-profile').then((r) => r.json()).then((d) => setProfile(d.profile)),
    ]).finally(() => setLoadingCatalog(false));
  }, []);

  const bottleTiers = Array.isArray(pricing?.bottleTiers) ? pricing!.bottleTiers : [];
  const mlTiers = Array.isArray(pricing?.mlTiers) ? pricing!.mlTiers : [];

  function hargaBotolUntuk(ml: number): number {
    return bottleTiers.find((t) => ml >= t.minMl && ml <= t.maxMl)?.harga ?? 0;
  }

  // Sisa stok beda-beda per cabang — begitu customer pilih cabang pengisian,
  // ambil sisa stok cabang itu supaya katalog nampilin angka yang sesuai.
  useEffect(() => {
    if (!cabangId) {
      setStockMap({});
      return;
    }
    fetch(`/api/stock-current?cabangId=${cabangId}`)
      .then((r) => r.json())
      .then((d) => {
        const map: Record<string, number> = {};
        for (const s of d.stok || []) map[s.productId] = s.sisa;
        setStockMap(map);
      })
      .catch(() => setStockMap({}));
  }, [cabangId]);

  function bukaDetail(p: Product) {
    setDetailProduct(p);
    setPilihMl(5);
    setPilihPakaiBotol(true);
    setPilihQty(1);
    if (mlTiers.length > 0) setPilihHargaPerMl(mlTiers[0].hargaPerMl);
  }

  function tambahDariModal() {
    if (!detailProduct) return;
    if (detailProduct.isBotol) {
      setCart((c) => [
        ...c,
        {
          productId: detailProduct.id,
          namaParfum: detailProduct.nama,
          ml: pilihMl,
          hargaPerMl: pilihHargaPerMl,
          pakaiBotol: pilihPakaiBotol,
          ukuranBotolMl: pilihPakaiBotol ? pilihMl : undefined,
          qty: pilihQty,
        },
      ]);
    } else {
      setCart((c) => [
        ...c,
        {
          productId: detailProduct.id,
          namaParfum: detailProduct.nama,
          ml: 0,
          hargaPerMl: 0,
          pakaiBotol: false,
          qty: pilihQty,
        },
      ]);
    }
    setDetailProduct(null);
  }

  function subtotalItem(it: CartItem): number {
    const flat = it.ml === 0 ? (products.find((p) => p.id === it.productId)?.hargaJual ?? 0) : 0;
    const parfum = Math.round(it.ml * it.hargaPerMl);
    const botol = it.ukuranBotolMl ? hargaBotolUntuk(it.ukuranBotolMl) : 0;
    return (flat + parfum + botol) * it.qty;
  }

  const totalMl = Math.round(cart.reduce((s, it) => s + it.ml * it.qty, 0) * 10) / 10;
  const totalHarga = cart.reduce((s, it) => s + subtotalItem(it), 0);
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
        body: JSON.stringify({ code: voucherInput.trim(), memberWa: tipe === 'ecer' ? waMember.trim() : undefined }),
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

  const [buktiUrl, setBuktiUrl] = useState<string | null>(null);
  const [uploadingBukti, setUploadingBukti] = useState(false);
  const [showPayment, setShowPayment] = useState(false);

  function handleBuktiUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = reader.result as string;
      setBuktiPreview(dataUrl);
      setUploadingBukti(true);
      try {
        const res = await fetch('/api/upload-bukti', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ imageBase64: dataUrl }),
        });
        const data = await res.json();
        if (res.ok) setBuktiUrl(data.fileId || data.url);
      } finally {
        setUploadingBukti(false);
      }
    };
    reader.readAsDataURL(file);
  }

  // Perluas tiap item keranjang (qty > 1) jadi baris-baris terpisah untuk API,
  // supaya biaya botol dihitung per-botol (bukan cuma per baris keranjang).
  function expandItemsForApi() {
    const rows: { productId?: string; namaParfum: string; ml: number; hargaPerMl: number; ukuranBotolMl?: number }[] = [];
    for (const it of cart) {
      const flatHarga = it.ml === 0 ? (products.find((p) => p.id === it.productId)?.hargaJual ?? 0) : it.hargaPerMl;
      for (let i = 0; i < it.qty; i++) {
        rows.push({
          productId: it.productId,
          namaParfum: it.namaParfum,
          ml: it.ml === 0 ? 1 : it.ml, // produk flat dihitung sbg 1 "unit" biar subtotal = harga
          hargaPerMl: it.ml === 0 ? flatHarga : it.hargaPerMl,
          ukuranBotolMl: it.ukuranBotolMl,
        });
      }
    }
    return rows;
  }

  // Klik "Checkout" -> tampilkan halaman pembayaran (QRIS) dulu, BELUM kirim
  // pesanan apa pun. Pesanan baru benar-benar dikirim (jadi Pesanan berstatus
  // "pending", nunggu di-ACC kasir) setelah customer upload bukti bayar &
  // klik "Kirim Pesanan".
  function handleCheckout() {
    setError(null);
    if (!cabangId) return setError('Pilih cabang pengisian dulu.');
    if (cart.length === 0) return setError('Keranjang masih kosong.');
    if (tipe === 'ecer' && !selectedMemberId && !namaMember.trim()) return setError('Isi nama untuk pendaftaran member.');
    setShowPayment(true);
  }

  async function submitPesanan() {
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch('/api/pesanan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cabangId,
          items: expandItemsForApi(),
          tipe,
          member:
            tipe === 'ecer'
              ? selectedMemberId
                ? { id: selectedMemberId }
                : { wa: waRegistrasi.trim() || undefined, nama: namaMember.trim() }
              : undefined,
          voucherCode: voucherApplied?.code || undefined,
          buktiBayarUrl: buktiUrl || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal mengirim pesanan');
      setResult(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  if (result) {
    return (
      <main className="mx-auto max-w-md px-4 py-8">
        <div className="ticket p-6">
          <h1 className="font-display text-xl font-semibold text-ink">Pesanan Terkirim ✅</h1>
          <p className="mt-1 text-sm text-ink/60">
            Total: {result.pesanan.totalMl}ml — Rp{result.pesanan.totalHarga.toLocaleString('id-ID')}
          </p>
          <p className="mt-3 rounded-lg bg-accentSoft p-3 text-sm text-accent">
            Pesanan kamu sedang menunggu konfirmasi kasir cabang. Poin member & struk akan muncul setelah dikonfirmasi.
          </p>
        </div>
      </main>
    );
  }

  if (showPayment) {
    return (
      <main className="mx-auto max-w-md px-4 py-8">
        <div className="ticket p-6">
          <h1 className="font-display text-xl font-semibold text-ink">Pembayaran</h1>
          <p className="mt-1 text-sm text-ink/60">
            Total Bayar: Rp{totalSetelahDiskon.toLocaleString('id-ID')}
          </p>

          <div className="mt-4 rounded-lg bg-paper p-4">
            {profile?.pembayaran?.qrisImageUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={driveImageUrl(profile.pembayaran.qrisImageUrl)} alt="QRIS" className="w-full rounded-lg" />
            )}
            {profile?.pembayaran?.dana && <p className="mt-2 text-xs text-ink/60">DANA: {profile.pembayaran.dana}</p>}
            {profile?.pembayaran?.seabank && (
              <p className="text-xs text-ink/60">SeaBank: {profile.pembayaran.seabank}</p>
            )}

            <label className="mt-3 block text-xs font-medium text-ink/60">Upload Bukti Bayar (wajib)</label>
            <input type="file" accept="image/*" onChange={handleBuktiUpload} className="mt-1 w-full text-xs" />
            {uploadingBukti && <p className="mt-1 text-xs text-ink/40">Mengunggah...</p>}
            {buktiPreview && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={buktiPreview} alt="Bukti bayar" className="mt-2 w-full rounded-lg" />
            )}
          </div>

          {error && <p className="mt-3 text-sm text-danger">{error}</p>}

          <button
            onClick={submitPesanan}
            disabled={submitting || uploadingBukti || !buktiUrl}
            className="mt-4 w-full rounded-card bg-accent px-4 py-3 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
          >
            {submitting ? 'Mengirim...' : !buktiUrl ? 'Upload bukti bayar dulu' : 'Kirim Pesanan'}
          </button>
          <button
            onClick={() => setShowPayment(false)}
            className="mt-2 w-full rounded-card border border-ink/15 px-4 py-2.5 text-sm font-semibold text-ink hover:bg-paper"
          >
            ← Kembali
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-md px-4 py-6 pb-24">
      <h1 className="font-display text-2xl font-semibold text-ink">Belanja</h1>

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
              {s === 1 ? 'Katalog' : s === 2 ? 'Ringkasan' : 'Data & Bayar'}
            </span>
            {s < 3 && <div className="h-px flex-1 bg-ink/10" />}
          </div>
        ))}
      </div>

      {/* ===== STEP 1: Cabang + Katalog ===== */}
      {step === 1 && (
        <>
          <div className="ticket mt-4 space-y-3 p-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-ink/60">Cabang Pengisian</label>
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
            <div className="flex gap-2">
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
          </div>

          <div className="mt-4">
            <h2 className="font-display text-sm font-semibold text-ink">Katalog Produk</h2>
            <div className="mt-2">
              <ProductCatalog
                products={products}
                stockMap={cabangId ? stockMap : undefined}
                stockMode="customer"
                hargaHint={(p) =>
                  p.isBotol
                    ? `mulai Rp${(mlTiers[0]?.hargaPerMl ?? 0).toLocaleString('id-ID')}/ml`
                    : `Rp${(p.hargaJual ?? 0).toLocaleString('id-ID')}`
                }
                onSelectProduct={(p) => bukaDetail(p as Product)}
              />
            </div>
          </div>

          {cart.length > 0 && (
            <div className="ticket mt-4 p-4">
              <h2 className="font-display text-sm font-semibold text-ink">
                Keranjang ({cart.reduce((s, it) => s + it.qty, 0)})
              </h2>
              <ul className="mt-2 divide-y divide-ink/10 text-sm">
                {cart.map((it, i) => (
                  <li key={i} className="flex items-center justify-between gap-2 py-2">
                    <span>
                      {it.namaParfum}
                      {it.ml > 0 ? ` — ${it.ml}ml${it.pakaiBotol ? ' + botol' : ''}` : ''}
                      {it.qty > 1 ? ` ×${it.qty}` : ''}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-ink/60">Rp{subtotalItem(it).toLocaleString('id-ID')}</span>
                      <button onClick={() => setCart((c) => c.filter((_, idx) => idx !== i))} className="text-xs text-danger">
                        Hapus
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}

      {/* ===== STEP 2: Ringkasan & voucher ===== */}
      {step === 2 && (
        <>
          <div className="ticket mt-4 p-4">
            <h2 className="font-display text-sm font-semibold text-ink">Ringkasan Pesanan</h2>
            <ul className="mt-2 divide-y divide-ink/10 text-sm">
              {cart.map((it, i) => (
                <li key={i} className="flex justify-between py-2">
                  <span>
                    {it.namaParfum}
                    {it.ml > 0 ? ` (${it.ml}ml${it.pakaiBotol ? ' + botol' : ''})` : ''}
                    {it.qty > 1 ? ` ×${it.qty}` : ''}
                  </span>
                  <span>Rp{subtotalItem(it).toLocaleString('id-ID')}</span>
                </li>
              ))}
            </ul>
            <div className="mt-2 flex justify-between border-t border-ink/10 pt-2 text-sm font-semibold">
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
                  placeholder="Masukkan kode voucher"
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

      {/* ===== STEP 3: Data member & checkout ===== */}
      {step === 3 && (
        <>
          {tipe === 'ecer' && (
            <div className="ticket mt-4 space-y-2 p-4">
              <h2 className="font-display text-sm font-semibold text-ink">Data Member</h2>
              <div className="flex gap-2">
                <input
                  value={waMember}
                  onChange={(e) => setWaMember(e.target.value)}
                  placeholder="Cari nama atau nomor WA member lama..."
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
              {memberSearchStatus === 'found' && (
                <p className="text-xs text-accent">Member dipilih: {namaMember}</p>
              )}
              <p className="text-xs font-medium text-ink/60">Atau daftar sebagai member baru:</p>
              <input
                value={namaMember}
                onChange={(e) => setNamaMember(e.target.value)}
                placeholder="Nama (wajib)"
                className="w-full rounded-lg border border-ink/15 px-3 py-2 text-sm outline-none focus:border-accent"
              />
              <input
                value={waRegistrasi}
                onChange={(e) => setWaRegistrasi(e.target.value)}
                placeholder="Nomor WA (opsional)"
                className="w-full rounded-lg border border-ink/15 px-3 py-2 text-sm outline-none focus:border-accent"
              />
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
            disabled={cart.length === 0 || (step === 1 && !cabangId)}
            className="flex-1 rounded-card bg-accent px-4 py-3 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
          >
            Lanjut →
          </button>
        )}
      </div>

      {/* ===== Modal detail produk (gaya e-commerce) ===== */}
      {detailProduct && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center"
          onClick={() => setDetailProduct(null)}
        >
          <div
            className="ticket max-h-[90vh] w-full max-w-sm overflow-y-auto p-0"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="aspect-[4/3] w-full bg-paper">
              {driveImageUrl(detailProduct.imageDriveId) ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={driveImageUrl(detailProduct.imageDriveId)}
                  alt={detailProduct.nama}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full items-center justify-center text-4xl">🧴</div>
              )}
            </div>

            <div className="p-5">
              <h3 className="font-display text-lg font-semibold text-ink">{detailProduct.nama}</h3>
              {detailProduct.deskripsi && (
                <p className="mt-1.5 text-sm leading-relaxed text-ink/60">{detailProduct.deskripsi}</p>
              )}

              {cabangId && stockMap[detailProduct.id] !== undefined && (
                <p className={`mt-2 text-xs font-semibold ${stockMap[detailProduct.id] <= 0 ? 'text-danger' : 'text-accent'}`}>
                  {stockMap[detailProduct.id] <= 0 ? 'Stok Habis di cabang ini' : 'Stok Tersedia di cabang ini'}
                </p>
              )}

              {detailProduct.isBotol ? (
                <>
                  <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-ink/50">Jumlah Ml</p>
                  <input
                    type="number"
                    min={1}
                    step="0.1"
                    value={pilihMl}
                    onChange={(e) => setPilihMl(Number(e.target.value))}
                    placeholder="Isi jumlah ml (mis. 12)"
                    className="mt-2 w-full rounded-lg border border-ink/15 px-3 py-2 text-sm outline-none focus:border-accent"
                  />
                  <p className="mt-1 text-[11px] text-ink/40">Isi bebas — tidak harus sesuai pilihan tertentu.</p>

                  <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-ink/50">Harga per Ml</p>
                  <select
                    value={pilihHargaPerMl}
                    onChange={(e) => setPilihHargaPerMl(Number(e.target.value))}
                    className="mt-2 w-full rounded-lg border border-ink/15 px-3 py-2 text-sm outline-none focus:border-accent"
                  >
                    {mlTiers.map((t) => (
                      <option key={t.hargaPerMl} value={t.hargaPerMl}>
                        Rp{t.hargaPerMl.toLocaleString('id-ID')} / ml
                      </option>
                    ))}
                  </select>

                  <label className="mt-4 flex items-center gap-2 text-sm font-semibold text-ink">
                    <input
                      type="checkbox"
                      checked={pilihPakaiBotol}
                      onChange={(e) => setPilihPakaiBotol(e.target.checked)}
                    />
                    Pakai Botol (+Rp{hargaBotolUntuk(pilihMl).toLocaleString('id-ID')})
                  </label>
                </>
              ) : (
                <p className="mt-3 text-sm font-semibold text-accent">
                  Rp{(detailProduct.hargaJual ?? 0).toLocaleString('id-ID')}
                </p>
              )}

              <div className="mt-4 flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wide text-ink/50">Jumlah</p>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setPilihQty((q) => Math.max(1, q - 1))}
                    className="h-8 w-8 rounded-full bg-paper text-ink"
                  >
                    −
                  </button>
                  <span className="w-6 text-center text-sm font-semibold">{pilihQty}</span>
                  <button onClick={() => setPilihQty((q) => q + 1)} className="h-8 w-8 rounded-full bg-paper text-ink">
                    +
                  </button>
                </div>
              </div>

              <button
                onClick={tambahDariModal}
                className="mt-5 w-full rounded-card bg-accent px-4 py-3 text-sm font-semibold text-white hover:opacity-90"
              >
                Tambah ke Keranjang
              </button>
              <button
                onClick={() => setDetailProduct(null)}
                className="mt-2 w-full rounded-card border border-ink/15 px-4 py-2.5 text-sm font-semibold text-ink hover:bg-paper"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tombol keranjang mengambang saat ada isi & masih di step 1 */}
      {step === 1 && cart.length > 0 && (
        <button
          onClick={() => setStep(2)}
          disabled={!cabangId}
          className="fixed bottom-20 left-1/2 z-40 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 rounded-card bg-ink px-4 py-3 text-sm font-semibold text-white shadow-lg disabled:opacity-50"
        >
          Lihat Keranjang ({cart.reduce((s, it) => s + it.qty, 0)}) — Rp{totalHarga.toLocaleString('id-ID')}
        </button>
      )}
    </main>
  );
}
