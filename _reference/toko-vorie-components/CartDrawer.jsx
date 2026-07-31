import { useState } from 'react';
import { X, Trash2, ShoppingBag, ArrowRight, ArrowLeft, CheckCircle, Copy, CreditCard } from 'lucide-react';
import { useStore } from '../lib/useStore';
import { money } from '../lib/utils';

// Step: 'cart' | 'form' | 'payment'

export default function CartDrawer({ open, onClose, settings }) {
  const { cart, dispatch, toast } = useStore();
  const [step,         setStep]         = useState('cart');
  const [customerName, setCustomerName] = useState('');
  const [customerAcc,  setCustomerAcc]  = useState('');
  const [placing,      setPlacing]      = useState(false);
  const [orderId,      setOrderId]      = useState('');

  const total = cart.reduce((s, i) => s + i.price * i.qty, 0);
  const count = cart.reduce((s, i) => s + i.qty, 0);
  const PAYMENT = settings?.payment ?? {};

  const handleClose = () => {
    onClose();
    // Reset step setelah animasi tutup
    setTimeout(() => {
      if (step === 'payment') {
        setStep('cart');
        setCustomerName('');
        setCustomerAcc('');
      }
    }, 350);
  };

  const handleCheckout = async () => {
    if (!customerAcc.trim()) { toast('Nomor HP / akun pembayaran wajib diisi', 'error'); return; }
    setPlacing(true);
    try {
      const r = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer: customerName.trim() || 'Anonim',
          acc:      customerAcc.trim(),
          items:    cart.map(i => ({ id: i.id, name: i.name, price: i.price, qty: i.qty })),
          total,
        }),
      });
      const d = await r.json();
      if (d.success) {
        setOrderId(d.data.id);
        dispatch({ type: 'CART_CLEAR' });
        setStep('payment');
        toast('Pesanan masuk! Lanjutkan pembayaran.', 'success');
      } else {
        toast(d.error ?? 'Gagal membuat pesanan', 'error');
      }
    } finally {
      setPlacing(false);
    }
  };

  const copyText = (text) => {
    navigator.clipboard.writeText(text).then(() => toast('Disalin!', 'success'));
  };

  // ─── Step labels ───────────────────────────────────────────────────────────
  const STEP_LABELS = { cart: 'Keranjang', form: 'Detail Pemesanan', payment: 'Info Pembayaran' };

  return (
    <>
      {/* Backdrop */}
      <div onClick={handleClose} style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,.55)', backdropFilter: 'blur(4px)',
        zIndex: 300, opacity: open ? 1 : 0, pointerEvents: open ? 'auto' : 'none', transition: 'opacity .25s',
      }} />

      {/* Drawer */}
      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0, width: 400, maxWidth: '96vw',
        background: 'var(--card-bg)', borderLeft: '1px solid var(--border)',
        zIndex: 310, display: 'flex', flexDirection: 'column',
        transform: open ? 'translateX(0)' : 'translateX(100%)',
        transition: 'transform .3s cubic-bezier(.4,0,.2,1)',
        boxShadow: '-12px 0 50px rgba(0,0,0,.45)',
      }}>

        {/* ── Header ── */}
        <div style={{
          padding: '.875rem 1.25rem', borderBottom: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: 'linear-gradient(135deg, #4c1d95, #7c3aed)', color: 'white', flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '.625rem' }}>
            {step !== 'cart' && step !== 'payment' && (
              <button onClick={() => setStep('cart')} style={{ background: 'rgba(255,255,255,.15)', border: '1px solid rgba(255,255,255,.25)', borderRadius: 7, color: 'white', width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
                <ArrowLeft size={14} />
              </button>
            )}
            <div>
              <div style={{ fontWeight: 700, fontSize: '.95rem', lineHeight: 1.2 }}>
                {STEP_LABELS[step]}
              </div>
              {step === 'cart' && count > 0 && (
                <div style={{ fontSize: '.7rem', color: 'rgba(255,255,255,.75)' }}>{count} item</div>
              )}
            </div>
          </div>
          <button onClick={handleClose} style={{ background: 'rgba(255,255,255,.15)', border: '1px solid rgba(255,255,255,.25)', borderRadius: 8, color: 'white', width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
            <X size={15} />
          </button>
        </div>

        {/* ── Step indicator (hanya kalau bukan payment sukses) ── */}
        {step !== 'payment' && (
          <div style={{ display: 'flex', padding: '.625rem 1.25rem', gap: '.375rem', borderBottom: '1px solid var(--border)', flexShrink: 0, background: 'var(--bg2)' }}>
            {['cart', 'form'].map((s, i) => (
              <div key={s} style={{ display: 'flex', alignItems: 'center', gap: '.375rem', flex: 1 }}>
                <div style={{
                  width: 22, height: 22, borderRadius: '50%', flexShrink: 0,
                  background: step === s ? 'var(--primary)' : (i < ['cart','form'].indexOf(step) ? 'var(--success)' : 'var(--border)'),
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '.65rem', fontWeight: 800, color: 'white',
                }}>
                  {i < ['cart','form'].indexOf(step) ? '✓' : i + 1}
                </div>
                <span style={{ fontSize: '.72rem', color: step === s ? 'var(--primary-dark)' : 'var(--muted)', fontWeight: step === s ? 700 : 400 }}>
                  {s === 'cart' ? 'Keranjang' : 'Detail'}
                </span>
                {i < 1 && <div style={{ flex: 1, height: 1, background: 'var(--border)', margin: '0 .25rem' }} />}
              </div>
            ))}
          </div>
        )}

        {/* ── STEP: CART ── */}
        {step === 'cart' && (
          <>
            <div style={{ flex: 1, overflowY: 'auto', padding: '1rem 1.25rem' }}>
              {cart.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '3.5rem 0', color: 'var(--muted)' }}>
                  <ShoppingBag size={52} style={{ margin: '0 auto 1rem', display: 'block', opacity: .15 }} />
                  <p style={{ fontSize: '.9rem', fontWeight: 600 }}>Keranjang masih kosong</p>
                  <p style={{ fontSize: '.8rem', marginTop: '.25rem' }}>Tambah produk yang kamu suka dulu!</p>
                </div>
              ) : (
                cart.map(item => (
                  <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: '.75rem', padding: '.625rem 0', borderBottom: '1px solid var(--border)' }}>
                    {item.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={item.image} alt={item.name} style={{ width: 46, height: 46, borderRadius: 8, objectFit: 'cover', flexShrink: 0, border: '1px solid var(--border)' }} onError={e => e.target.style.display = 'none'} />
                    ) : (
                      <div style={{ width: 46, height: 46, borderRadius: 8, background: 'var(--bg2)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: .35 }}>
                        <ShoppingBag size={18} />
                      </div>
                    )}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: '.875rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.name}</div>
                      <div style={{ color: 'var(--primary-dark)', fontSize: '.8rem', fontWeight: 700 }}>Rp {money(item.price)}</div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                      <button className="qty-btn" onClick={() => dispatch({ type: 'CART_UPDATE', id: item.id, delta: -1 })}>−</button>
                      <span style={{ fontWeight: 700, fontSize: '.875rem', minWidth: 22, textAlign: 'center' }}>{item.qty}</span>
                      <button className="qty-btn" onClick={() => dispatch({ type: 'CART_UPDATE', id: item.id, delta: 1 })}>+</button>
                    </div>
                    <button onClick={() => dispatch({ type: 'CART_UPDATE', id: item.id, delta: -999 })} style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', padding: '.25rem', display: 'flex', flexShrink: 0 }}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))
              )}
            </div>

            {cart.length > 0 && (
              <div style={{ padding: '1rem 1.25rem', borderTop: '1px solid var(--border)', background: 'var(--bg2)', flexShrink: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '.875rem' }}>
                  <span style={{ color: 'var(--muted)', fontSize: '.875rem' }}>Total</span>
                  <span style={{ fontWeight: 800, fontSize: '1.2rem', color: 'var(--primary-dark)' }}>Rp {money(total)}</span>
                </div>
                <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '.7rem' }} onClick={() => setStep('form')}>
                  Lanjut ke Detail <ArrowRight size={15} />
                </button>
                <button className="btn btn-ghost btn-sm" style={{ width: '100%', justifyContent: 'center', marginTop: '.5rem' }} onClick={() => dispatch({ type: 'CART_CLEAR' })}>
                  <Trash2 size={13} /> Kosongkan
                </button>
              </div>
            )}
          </>
        )}

        {/* ── STEP: FORM ── */}
        {step === 'form' && (
          <>
            <div style={{ flex: 1, overflowY: 'auto', padding: '1.125rem 1.25rem' }}>
              {/* Order summary mini */}
              <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '.75rem', marginBottom: '1.125rem' }}>
                <div style={{ fontSize: '.72rem', color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: '.5rem' }}>Ringkasan Pesanan</div>
                {cart.map(i => (
                  <div key={i.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '.84rem', padding: '.15rem 0' }}>
                    <span style={{ color: 'var(--text-sub)' }}>{i.name} <span style={{ color: 'var(--muted)' }}>×{i.qty}</span></span>
                    <span style={{ fontWeight: 600 }}>Rp {money(i.price * i.qty)}</span>
                  </div>
                ))}
                <div style={{ borderTop: '1px solid var(--border)', marginTop: '.5rem', paddingTop: '.5rem', display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: '.95rem' }}>
                  <span>Total</span>
                  <span style={{ color: 'var(--primary-dark)' }}>Rp {money(total)}</span>
                </div>
              </div>

              <div className="form-group">
                <label>Nama Kamu (opsional)</label>
                <input value={customerName} onChange={e => setCustomerName(e.target.value)} placeholder="Nama lengkap / panggilan" />
              </div>
              <div className="form-group">
                <label>No. HP / Akun Pembayaran *</label>
                <input value={customerAcc} onChange={e => setCustomerAcc(e.target.value)} placeholder="Contoh: 0851xxxxxxxx" />
                <div style={{ fontSize: '.73rem', color: 'var(--muted)', marginTop: '.3rem' }}>
                  Digunakan kasir untuk konfirmasi pembayaran
                </div>
              </div>
            </div>

            <div style={{ padding: '1rem 1.25rem', borderTop: '1px solid var(--border)', background: 'var(--bg2)', flexShrink: 0 }}>
              <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '.7rem' }} onClick={handleCheckout} disabled={placing}>
                {placing ? <span className="spinner" style={{ width: 16, height: 16 }} /> : <CheckCircle size={16} />}
                {placing ? 'Memproses...' : 'Kirim Pesanan'}
              </button>
            </div>
          </>
        )}

        {/* ── STEP: PAYMENT ── */}
        {step === 'payment' && (
          <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem 1.25rem' }}>
            {/* Success banner */}
            <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
              <CheckCircle size={52} style={{ color: 'var(--success)', margin: '0 auto .75rem', display: 'block' }} />
              <h3 style={{ margin: '0 0 .375rem', fontSize: '1.1rem' }}>Pesanan Berhasil Dikirim!</h3>
              <p style={{ margin: 0, fontSize: '.84rem', color: 'var(--muted)' }}>
                Lakukan pembayaran di bawah, lalu kasir akan memproses pesananmu.
              </p>
              {orderId && (
                <div style={{ marginTop: '.625rem', display: 'inline-flex', alignItems: 'center', gap: '.375rem', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 8, padding: '.35rem .75rem', fontSize: '.73rem', color: 'var(--muted)' }}>
                  ID: <span style={{ fontFamily: 'monospace', color: 'var(--text-sub)' }}>{orderId.slice(0, 8)}...</span>
                  <button onClick={() => copyText(orderId)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', display: 'flex', padding: 0 }}><Copy size={11} /></button>
                </div>
              )}
            </div>

            {/* Payment methods */}
            <div style={{ fontSize: '.72rem', color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: '.625rem' }}>
              Metode Pembayaran
            </div>

            {PAYMENT.dana?.account && (
              <div className="payment-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '.9rem', color: '#0EA5E9' }}>DANA</div>
                    <div style={{ fontSize: '.95rem', fontWeight: 800, marginTop: 2 }}>{PAYMENT.dana.account}</div>
                  </div>
                  <button onClick={() => copyText(PAYMENT.dana.account)} className="btn btn-ghost btn-sm" style={{ gap: '.25rem' }}>
                    <Copy size={13} /> Salin
                  </button>
                </div>
                {PAYMENT.dana.instruction && <p style={{ margin: '.5rem 0 0', fontSize: '.78rem', color: 'var(--muted)' }}>{PAYMENT.dana.instruction}</p>}
              </div>
            )}

            {PAYMENT.seabank?.account && (
              <div className="payment-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '.9rem', color: '#22C55E' }}>SeaBank</div>
                    <div style={{ fontSize: '.95rem', fontWeight: 800, marginTop: 2 }}>{PAYMENT.seabank.account}</div>
                  </div>
                  <button onClick={() => copyText(PAYMENT.seabank.account)} className="btn btn-ghost btn-sm" style={{ gap: '.25rem' }}>
                    <Copy size={13} /> Salin
                  </button>
                </div>
                {PAYMENT.seabank.instruction && <p style={{ margin: '.5rem 0 0', fontSize: '.78rem', color: 'var(--muted)' }}>{PAYMENT.seabank.instruction}</p>}
              </div>
            )}

            {PAYMENT.qris?.link && (
              <div className="payment-card">
                <div style={{ fontWeight: 700, fontSize: '.9rem', marginBottom: '.5rem', display: 'flex', alignItems: 'center', gap: '.375rem' }}>
                  <CreditCard size={15} /> QRIS
                  <span style={{ fontSize: '.72rem', fontWeight: 400, color: 'var(--muted)' }}>(Gopay, OVO, ShopeePay, dll.)</span>
                </div>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={PAYMENT.qris.link} alt="QRIS" style={{ width: '100%', maxWidth: 200, borderRadius: 8, margin: '0 auto', display: 'block', border: '1px solid var(--border)' }} />
                {PAYMENT.qris.instruction && <p style={{ margin: '.5rem 0 0', fontSize: '.78rem', color: 'var(--muted)', textAlign: 'center' }}>{PAYMENT.qris.instruction}</p>}
              </div>
            )}

            {!PAYMENT.dana?.account && !PAYMENT.seabank?.account && !PAYMENT.qris?.link && (
              <div style={{ textAlign: 'center', color: 'var(--muted)', fontSize: '.84rem', padding: '1.5rem 0' }}>
                Hubungi kasir untuk info pembayaran.
              </div>
            )}

            <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', marginTop: '1.5rem' }} onClick={handleClose}>
              Selesai
            </button>
          </div>
        )}
      </div>

      <style jsx>{`
        .qty-btn {
          width: 27px; height: 27px; border-radius: 6px;
          background: var(--bg2); border: 1.5px solid var(--border);
          color: var(--text); cursor: pointer; font-size: 1rem;
          display: flex; align-items: center; justify-content: center;
          font-family: inherit; transition: var(--transition);
        }
        .qty-btn:hover { background: var(--primary-muted); border-color: var(--primary); color: var(--primary-dark); }
        :global(.payment-card) {
          background: var(--bg2); border: 1px solid var(--border);
          border-radius: var(--radius); padding: .875rem 1rem;
          margin-bottom: .75rem;
        }
      `}</style>
    </>
  );
}
