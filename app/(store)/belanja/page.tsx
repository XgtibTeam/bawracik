'use client';

import { useEffect, useState } from 'react';

type Branch = { id: string; nama: string; alamat?: string };
type Product = { id: string; nama: string; hargaJual?: number; imageDriveId?: string };
type PricingConfig = {
  mlTiers: { hargaPerMl: number }[];
  bottleTiers: { minMl: number; maxMl: number; harga: number }[];
};
type StoreProfile = {
  namaToko: string;
  pembayaran: { qrisImageUrl?: string; dana?: string; seabank?: string };
};
type CartItem = { namaParfum: string; ml: number; hargaPerMl: number };

export default function BelanjaPage() {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [pricing, setPricing] = useState<PricingConfig | null>(null);
  const [profile, setProfile] = useState<StoreProfile | null>(null);

  const [cabangId, setCabangId] = useState('');
  const [tipe, setTipe] = useState<'ecer' | 'grosir'>('ecer');

  const [hargaPerMl, setHargaPerMl] = useState(2000);
  const [namaParfum, setNamaParfum] = useState('');
  const [inputMode, setInputMode] = useState<'rupiah' | 'ml'>('rupiah');
  const [inputValue, setInputValue] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);

  const [pakaiBotol, setPakaiBotol] = useState(false);
  const [ukuranBotolMl, setUkuranBotolMl] = useState(5);

  const [waMember, setWaMember] = useState('');
  const [namaMember, setNamaMember] = useState('');
  const [detailProduct, setDetailProduct] = useState<Product | null>(null);

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
    fetch('/api/branches').then((r) => r.json()).then((d) => setBranches(d.branches || []));
    fetch('/api/products').then((r) => r.json()).then((d) => setProducts(d.products || []));
    fetch('/api/pricing').then((r) => r.json()).then((d) => setPricing(d.config));
    fetch('/api/store-profile').then((r) => r.json()).then((d) => setProfile(d.profile));
  }, []);

  const mlFromInput =
    inputMode === 'rupiah'
      ? Math.round(((Number(inputValue) || 0) / hargaPerMl) * 10) / 10
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

  function addToCart() {
    if (!namaParfum.trim() || mlFromInput <= 0) return;
    setCart((c) => [...c, { namaParfum: namaParfum.trim(), ml: mlFromInput, hargaPerMl }]);
    setNamaParfum('');
    setInputValue('');
  }

  function handleBuktiUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setBuktiPreview(reader.result as string);
    reader.readAsDataURL(file);
  }

  async function handleCheckout() {
    setError(null);
    if (!cabangId) return setError('Pilih cabang pengisian dulu.');
    if (cart.length === 0) return setError('Keranjang masih kosong.');
    if (tipe === 'ecer' && !waMember.trim()) return setError('Isi nomor WA untuk pendaftaran member.');

    setSubmitting(true);
    try {
      const res = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cabangId,
          items: cart,
          ukuranBotolMl: pakaiBotol ? ukuranBotolMl : undefined,
          tipe,
          member: tipe === 'ecer' ? { wa: waMember.trim(), nama: namaMember.trim() } : undefined,
          voucherCode: voucherApplied?.code || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Checkout gagal');
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
          <h1 className="font-display text-xl font-semibold text-ink">Pesanan Dibuat</h1>
          <p className="mt-1 text-sm text-ink/60">
            Total: {result.calc.totalMl}ml — Rp{result.calc.totalHarga.toLocaleString('id-ID')}
          </p>
          {result.calc.diskon > 0 && (
            <p className="text-sm text-accent">
              Voucher {result.voucherCode}: -Rp{result.calc.diskon.toLocaleString('id-ID')} → Bayar Rp
              {result.calc.totalSetelahDiskon.toLocaleString('id-ID')}
            </p>
          )}

          <div className="mt-4 rounded-lg bg-paper p-4">
            <p className="text-sm font-semibold text-ink">Pembayaran</p>
            {profile?.pembayaran?.qrisImageUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={profile.pembayaran.qrisImageUrl} alt="QRIS" className="mt-2 w-full rounded-lg" />
            )}
            {profile?.pembayaran?.dana && <p className="mt-2 text-xs text-ink/60">DANA: {profile.pembayaran.dana}</p>}
            {profile?.pembayaran?.seabank && (
              <p className="text-xs text-ink/60">SeaBank: {profile.pembayaran.seabank}</p>
            )}

            <label className="mt-3 block text-xs font-medium text-ink/60">Upload Bukti Bayar (opsional)</label>
            <input type="file" accept="image/*" onChange={handleBuktiUpload} className="mt-1 w-full text-xs" />
            {buktiPreview && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={buktiPreview} alt="Bukti bayar" className="mt-2 w-full rounded-lg" />
            )}
            <p className="mt-1 text-xs text-ink/40">
              Kirim gambar bukti bayar ini langsung di chat WA setelah klik tombol di bawah.
            </p>
          </div>

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
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-md px-4 py-6 pb-16">
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
              {s === 1 ? 'Pesanan' : s === 2 ? 'Ringkasan' : 'Data & Bayar'}
            </span>
            {s < 3 && <div className="h-px flex-1 bg-ink/10" />}
          </div>
        ))}
      </div>

      {/* ===== STEP 1: Cabang, katalog, isi pesanan ===== */}
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

          {products.length > 0 && (
            <div className="ticket mt-4 p-4">
              <h2 className="font-display text-sm font-semibold text-ink">Katalog Parfum</h2>
              <div className="mt-2 grid grid-cols-2 gap-2">
                {products.slice(0, 12).map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setDetailProduct(p)}
                    className="flex items-center gap-2 rounded-lg border border-ink/10 p-2 text-left text-xs hover:border-accent"
                  >
                    {p.imageDriveId ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={p.imageDriveId} alt={p.nama} className="h-9 w-9 rounded object-cover" />
                    ) : (
                      <div className="flex h-9 w-9 items-center justify-center rounded bg-paper text-[10px] text-ink/40">
                        N/A
                      </div>
                    )}
                    <span>{p.nama}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="ticket mt-4 space-y-3 p-4">
            <h2 className="font-display text-sm font-semibold text-ink">Isi Pesanan</h2>
            <input
              value={namaParfum}
              onChange={(e) => setNamaParfum(e.target.value)}
              placeholder="Nama parfum"
              className="w-full rounded-lg border border-ink/15 px-3 py-2 text-sm outline-none focus:border-accent"
            />
            <select
              value={hargaPerMl}
              onChange={(e) => setHargaPerMl(Number(e.target.value))}
              className="w-full rounded-lg border border-ink/15 px-3 py-2 text-sm outline-none focus:border-accent"
            >
              {(pricing?.mlTiers ?? []).map((t) => (
                <option key={t.hargaPerMl} value={t.hargaPerMl}>
                  Rp{t.hargaPerMl.toLocaleString('id-ID')} / ml
                </option>
              ))}
            </select>
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
              placeholder={inputMode === 'rupiah' ? 'Nominal (mis. 20000)' : 'Jumlah ml'}
              className="w-full rounded-lg border border-ink/15 px-3 py-2 text-sm outline-none focus:border-accent"
            />
            <p className="text-xs text-ink/50">≈ {mlFromInput} ml</p>
            <button
              onClick={addToCart}
              className="w-full rounded-lg bg-ink px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
            >
              + Tambah ke Keranjang
            </button>

            <label className="flex items-center gap-2 pt-2 text-sm font-semibold text-ink">
              <input type="checkbox" checked={pakaiBotol} onChange={(e) => setPakaiBotol(e.target.checked)} />
              Pakai Botol
            </label>
            {pakaiBotol && (
              <input
                type="number"
                value={ukuranBotolMl}
                onChange={(e) => setUkuranBotolMl(Number(e.target.value))}
                placeholder="Ukuran botol (ml)"
                className="w-full rounded-lg border border-ink/15 px-3 py-2 text-sm outline-none focus:border-accent"
              />
            )}
          </div>

          {cart.length > 0 && (
            <div className="ticket mt-4 p-4">
              <h2 className="font-display text-sm font-semibold text-ink">Keranjang ({cart.length})</h2>
              <ul className="mt-2 divide-y divide-ink/10 text-sm">
                {cart.map((it, i) => (
                  <li key={i} className="flex justify-between py-2">
                    <span>
                      {it.namaParfum} — {it.ml}ml
                    </span>
                    <button onClick={() => setCart((c) => c.filter((_, idx) => idx !== i))} className="text-xs text-danger">
                      Hapus
                    </button>
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
              <input
                value={waMember}
                onChange={(e) => setWaMember(e.target.value)}
                placeholder="Nomor WA"
                className="w-full rounded-lg border border-ink/15 px-3 py-2 text-sm outline-none focus:border-accent"
              />
              <input
                value={namaMember}
                onChange={(e) => setNamaMember(e.target.value)}
                placeholder="Nama"
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

      {detailProduct && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center"
          onClick={() => setDetailProduct(null)}
        >
          <div className="ticket w-full max-w-sm p-5" onClick={(e) => e.stopPropagation()}>
            {detailProduct.imageDriveId ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={detailProduct.imageDriveId}
                alt={detailProduct.nama}
                className="mb-3 h-40 w-full rounded-lg object-cover"
              />
            ) : null}
            <h3 className="font-display text-lg font-semibold text-ink">{detailProduct.nama}</h3>
            {detailProduct.hargaJual && (
              <p className="mt-1 text-sm text-ink/60">
                Harga jual: Rp{detailProduct.hargaJual.toLocaleString('id-ID')}
              </p>
            )}
            <button
              onClick={() => {
                setNamaParfum(detailProduct.nama);
                setDetailProduct(null);
              }}
              className="mt-4 w-full rounded-card bg-accent px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90"
            >
              Pilih untuk Isi Pesanan
            </button>
            <button
              onClick={() => setDetailProduct(null)}
              className="mt-2 w-full rounded-card border border-ink/15 px-4 py-2.5 text-sm font-semibold text-ink hover:bg-paper"
            >
              Tutup
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
