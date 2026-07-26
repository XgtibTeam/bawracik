'use client';

import { useEffect, useState } from 'react';

type Session = { role: string; nama: string; cabangId: string | null; username: string };
type PricingConfig = {
  mlTiers: { hargaPerMl: number }[];
  bottleTiers: { minMl: number; maxMl: number; harga: number }[];
  ecerMaxMl: number;
  grosirMaxMl: number;
};
type Product = { id: string; nama: string; deskripsi: string; imageUrl?: string; hargaJual?: number };
type CartItem = { namaParfum: string; ml: number; hargaPerMl: number };
type Member = {
  id: string;
  nama: string;
  wa: string;
  poinTotal: number;
  poinSaatIni: number;
  pengisianKe: number;
};

export default function KasirPage() {
  const [session, setSession] = useState<Session | null>(null);
  const [pricing, setPricing] = useState<PricingConfig | null>(null);
  const [products, setProducts] = useState<Product[]>([]);

  const [hargaPerMl, setHargaPerMl] = useState<number>(2000);
  const [activeProduct, setActiveProduct] = useState<Product | null>(null);
  const [inputMode, setInputMode] = useState<'rupiah' | 'ml'>('rupiah');
  const [inputValue, setInputValue] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);

  const [pakaiBotol, setPakaiBotol] = useState(false);
  const [ukuranBotolMl, setUkuranBotolMl] = useState<number>(5);

  const [tipe, setTipe] = useState<'ecer' | 'grosir'>('ecer');
  const [waMember, setWaMember] = useState('');
  const [namaMember, setNamaMember] = useState('');
  const [member, setMember] = useState<Member | null>(null);
  const [memberSearchStatus, setMemberSearchStatus] = useState<'idle' | 'found' | 'notfound'>('idle');

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

  useEffect(() => {
    fetch('/api/auth/me')
      .then((r) => r.json())
      .then((d) => setSession(d.session));
    fetch('/api/pricing')
      .then((r) => r.json())
      .then((d) => setPricing(d.config));
    fetch('/api/products')
      .then((r) => r.json())
      .then((d) => setProducts(d.products || []));
  }, []);

  const botolMax = tipe === 'ecer' ? pricing?.ecerMaxMl ?? 100 : pricing?.grosirMaxMl ?? 1000;

  useEffect(() => {
    if (ukuranBotolMl > botolMax) setUkuranBotolMl(botolMax);
  }, [tipe, botolMax]);

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
      ? pricing.bottleTiers.find((t) => ukuranBotolMl >= t.minMl && ukuranBotolMl <= t.maxMl)?.harga ?? 0
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
    if (!activeProduct || mlFromInput <= 0) return;
    setCart((c) => [...c, { namaParfum: activeProduct.nama, ml: mlFromInput, hargaPerMl }]);
    setInputValue('');
    setActiveProduct(null);
  }

  function removeFromCart(idx: number) {
    setCart((c) => c.filter((_, i) => i !== idx));
  }

  async function cariMember() {
    if (!waMember.trim()) return;
    const res = await fetch(`/api/members?wa=${encodeURIComponent(waMember.trim())}`);
    const data = await res.json();
    if (data.member) {
      setMember(data.member);
      setNamaMember(data.member.nama);
      setMemberSearchStatus('found');
    } else {
      setMember(null);
      setMemberSearchStatus('notfound');
    }
  }

  async function handleCheckout() {
    if (!session?.cabangId) {
      setError('Cabang kasir tidak diketahui, login ulang.');
      return;
    }
    if (cart.length === 0) {
      setError('Keranjang masih kosong.');
      return;
    }
    if (tipe === 'ecer' && !waMember.trim()) {
      setError('Isi nomor WA member untuk transaksi ecer.');
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cabangId: session.cabangId,
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

  function resetTransaksi() {
    setCart([]);
    setMember(null);
    setWaMember('');
    setNamaMember('');
    setMemberSearchStatus('idle');
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
          Kasir · {session?.nama} {session?.cabangId ? '' : '(super admin, pilih cabang manual belum tersedia)'}
        </p>
        <div className="flex gap-3">
          <a href="/akun/password" className="text-xs text-accent underline">
            Ganti Password
          </a>
          <a href="/kasir/stok" className="text-xs text-accent underline">
            Input Stok →
          </a>
        </div>
      </div>
      <h1 className="mt-1 font-display text-2xl font-semibold text-ink">Checkout Etalase</h1>

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

          <div className="ticket mt-4 p-4">
            <h2 className="font-display text-sm font-semibold text-ink">Pilih Parfum dari Katalog</h2>
            {products.length === 0 && (
              <p className="mt-2 text-xs text-warn">
                Belum ada produk. Minta admin tambah produk dulu di Kelola Toko → Produk.
              </p>
            )}
            <div className="mt-2 grid grid-cols-2 gap-2">
              {products.map((p) => (
                <button
                  key={p.id}
                  onClick={() => {
                    setActiveProduct(p);
                    setInputValue('');
                  }}
                  className="flex items-center gap-2 rounded-lg border border-ink/10 p-2 text-left text-xs hover:border-accent"
                >
                  {p.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.imageUrl} alt={p.nama} className="h-10 w-10 rounded object-cover" />
                  ) : (
                    <div className="flex h-10 w-10 items-center justify-center rounded bg-paper text-[10px] text-ink/40">
                      N/A
                    </div>
                  )}
                  <span>{p.nama}</span>
                </button>
              ))}
            </div>
          </div>

          {activeProduct && (
            <div
              className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center"
              onClick={() => setActiveProduct(null)}
            >
              <div className="ticket w-full max-w-sm p-5" onClick={(e) => e.stopPropagation()}>
                {activeProduct.imageUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={activeProduct.imageUrl}
                    alt={activeProduct.nama}
                    className="mb-3 h-36 w-full rounded-lg object-cover"
                  />
                )}
                <h3 className="font-display text-lg font-semibold text-ink">{activeProduct.nama}</h3>
                {activeProduct.deskripsi && (
                  <p className="mt-1 text-sm text-ink/60">{activeProduct.deskripsi}</p>
                )}

                <div className="mt-3 space-y-2">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-ink/60">Harga per ml</label>
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
                  </div>
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
                </div>

                <button
                  onClick={addToCart}
                  disabled={mlFromInput <= 0}
                  className="mt-4 w-full rounded-card bg-accent px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
                >
                  + Tambah ke Keranjang
                </button>
                <button
                  onClick={() => setActiveProduct(null)}
                  className="mt-2 w-full rounded-card border border-ink/15 px-4 py-2.5 text-sm font-semibold text-ink hover:bg-paper"
                >
                  Tutup
                </button>
              </div>
            </div>
          )}

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
                  min={3}
                  max={botolMax}
                  onChange={(e) =>
                    setUkuranBotolMl(Math.min(botolMax, Math.max(0, Number(e.target.value))))
                  }
                  className="w-full rounded-lg border border-ink/15 px-3 py-2 text-sm outline-none focus:border-accent"
                  placeholder="Ukuran botol (ml)"
                />
                <p className="mt-1 text-xs text-ink/50">
                  Maks {botolMax}ml untuk {tipe} · Biaya botol: Rp{biayaBotol.toLocaleString('id-ID')}
                </p>
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
                  placeholder="Nomor WA member"
                  className="flex-1 rounded-lg border border-ink/15 px-3 py-2 text-sm outline-none focus:border-accent"
                />
                <button
                  onClick={cariMember}
                  className="rounded-lg bg-paper px-3 py-2 text-xs font-semibold text-ink"
                >
                  Cari
                </button>
              </div>
              {memberSearchStatus === 'found' && member && (
                <p className="text-xs text-accent">
                  Member ditemukan: {member.nama} • Poin: {member.poinTotal} • Pengisian ke-{member.pengisianKe}
                </p>
              )}
              {memberSearchStatus === 'notfound' && (
                <>
                  <p className="text-xs text-warn">Nomor belum terdaftar, akan didaftarkan sbg member baru.</p>
                  <input
                    value={namaMember}
                    onChange={(e) => setNamaMember(e.target.value)}
                    placeholder="Nama member baru"
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
    </main>
  );
}
