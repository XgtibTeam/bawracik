import { useState, useEffect } from 'react';
import Head from 'next/head';
import { Search, Star, Instagram, MessageCircle } from 'lucide-react';
import Header from '../components/Header';
import Sidebar from '../components/Sidebar';
import CartDrawer from '../components/CartDrawer';
import ProductCard from '../components/ProductCard';
import LoginModal from '../components/LoginModal';
import RatingModal from '../components/RatingModal';
import { useStore } from '../lib/useStore';
import { money, formatDate, safeRating } from '../lib/utils';

export default function ShopPage({ initialProducts, initialSettings }) {
  const { user, dispatch, toast } = useStore();

  const [products,    setProducts]    = useState(initialProducts ?? []);
  const [settings,    setSettings]    = useState(initialSettings ?? {});
  const [reviews,     setReviews]     = useState([]);
  const [search,      setSearch]      = useState('');
  const [category,    setCategory]    = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [cartOpen,    setCartOpen]    = useState(false);
  const [loginOpen,   setLoginOpen]   = useState(false);
  const [ratingOpen,  setRatingOpen]  = useState(false);

  const categories = ['', ...Array.from(new Set(products.map(p => p.category).filter(Boolean)))];

  const filtered = products.filter(p => {
    const matchSearch   = !search   || p.name.toLowerCase().includes(search) || (p.desc ?? '').toLowerCase().includes(search);
    const matchCategory = !category || p.category === category;
    return matchSearch && matchCategory;
  });

  useEffect(() => {
    fetch('/api/reviews')
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.data) setReviews(d.data); })
      .catch(() => {});
  }, []);

  const avgRating = reviews.length
    ? (reviews.reduce((s, o) => s + safeRating(o.rating), 0) / reviews.length).toFixed(1)
    : null;

  // Tambah ke keranjang — TIDAK auto-buka drawer
  const handleAddToCart = (product, qty) => {
    dispatch({ type: 'CART_ADD', payload: {
      id:    product.id,
      name:  product.name,
      price: product.price,
      qty,
      image: product.images?.[0] || product.img || '',
    }});
    toast(`"${product.name}" ditambahkan ke keranjang 🛒`, 'success');
    // Tidak panggil setCartOpen(true) — biarkan user buka sendiri
  };

  const handleLoginSuccess = (u) => {
    if (u.role === 'admin')      window.location.href = '/admin';
    else if (u.role === 'kasir') window.location.href = '/kasir';
  };

  const ig = settings?.social?.instagram;
  const wa = settings?.social?.whatsapp;

  return (
    <>
      <Head>
        <title>{settings.store_name ?? 'Toko Vorie'}</title>
        <meta name="description" content={settings.tagline ?? ''} />
      </Head>

      <Header
        storeName={settings.store_name}
        logoUrl={settings.logo_url}
        tagline={settings.tagline}
        onCartToggle={() => setCartOpen(v => !v)}
        onSidebarToggle={() => setSidebarOpen(v => !v)}
        onLoginClick={() => setLoginOpen(true)}
      />

      <div style={{ display: 'flex', minHeight: 'calc(100vh - var(--header-h))' }}>
        <Sidebar
          open={sidebarOpen}
          settings={settings}
          onLoginClick={() => setLoginOpen(true)}
          onClose={() => setSidebarOpen(false)}
          onRatingClick={() => setRatingOpen(true)}
        />

        <main style={{ flex: 1, padding: '1.375rem 1.5rem', overflowX: 'hidden', minWidth: 0 }}>

          {/* Search + filter bar */}
          <div style={{
            display: 'flex', gap: '.625rem', alignItems: 'center',
            background: 'var(--card-bg)', border: '1px solid var(--border)',
            borderRadius: 'var(--radius-lg)', padding: '.5rem .875rem',
            marginBottom: '1.375rem', boxShadow: 'var(--shadow)', flexWrap: 'wrap',
          }}>
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '.5rem', minWidth: 140 }}>
              <Search size={15} style={{ color: 'var(--muted)', flexShrink: 0 }} />
              <input
                value={search}
                onChange={e => setSearch(e.target.value.toLowerCase())}
                placeholder="Cari produk..."
                style={{ border: 'none', background: 'transparent', outline: 'none', width: '100%', padding: 0 }}
              />
            </div>
            {categories.length > 1 && (
              <>
                <div style={{ width: 1, height: 20, background: 'var(--border)' }} />
                <div style={{ display: 'flex', gap: '.3rem', flexWrap: 'wrap' }}>
                  {categories.map(cat => (
                    <button key={cat} onClick={() => setCategory(cat)} className={`pill${category === cat ? ' active' : ''}`}>
                      {cat || 'Semua'}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Products grid */}
          {filtered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '5rem 1rem', color: 'var(--muted)' }}>
              <Search size={48} style={{ margin: '0 auto 1rem', display: 'block', opacity: .15 }} />
              <p style={{ fontWeight: 600 }}>Produk tidak ditemukan</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))', gap: '1.125rem' }}>
              {filtered.map(p => (
                <ProductCard key={p.id} product={p} onAdd={handleAddToCart} />
              ))}
            </div>
          )}

          {/* Reviews section */}
          <section id="reviews" style={{ marginTop: '3rem' }}>
            <div className="divider" />
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.125rem', flexWrap: 'wrap', gap: '.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '.625rem' }}>
                <Star size={19} style={{ color: 'var(--warning)' }} />
                <h2 style={{ margin: 0, fontSize: '1.05rem' }}>Ulasan Pelanggan</h2>
                {avgRating && (
                  <span style={{ background: 'var(--warning-bg)', color: 'var(--warning)', padding: '.2rem .625rem', borderRadius: 20, fontSize: '.76rem', fontWeight: 700 }}>
                    ★ {avgRating} ({reviews.length})
                  </span>
                )}
              </div>
              <button className="btn btn-ghost btn-sm" onClick={() => setRatingOpen(true)} style={{ gap: '.375rem' }}>
                <Star size={13} /> Tulis Ulasan
              </button>
            </div>

            {reviews.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2.5rem 1rem', color: 'var(--muted)', border: '1px dashed var(--border)', borderRadius: 'var(--radius-lg)' }}>
                <Star size={32} style={{ margin: '0 auto .75rem', display: 'block', opacity: .2 }} />
                <p style={{ fontSize: '.875rem' }}>Belum ada ulasan. Jadilah yang pertama!</p>
                <button className="btn btn-primary btn-sm" style={{ marginTop: '.75rem' }} onClick={() => setRatingOpen(true)}>
                  Beri Rating
                </button>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '.875rem' }}>
                {reviews.slice(0, 12).map(o => (
                  <div key={o.id} className="card" style={{ padding: '.875rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '.3rem' }}>
                      <span style={{ fontWeight: 700, color: 'var(--primary-dark)', fontSize: '.875rem' }}>
                        {o.customer || 'Anonim'}
                      </span>
                      <span style={{ color: 'var(--warning)', fontSize: '.85rem', letterSpacing: '-1px' }}>
                        {'★'.repeat(safeRating(o.rating))}{'☆'.repeat(5 - safeRating(o.rating))}
                      </span>
                    </div>
                    {o.feedback && (
                      <p style={{ margin: '0 0 .375rem', fontSize: '.82rem', color: 'var(--text-sub)', lineHeight: 1.55 }}>
                        "{o.feedback}"
                      </p>
                    )}
                    <p style={{ margin: 0, fontSize: '.7rem', color: 'var(--muted)' }}>
                      {formatDate(o.created_at)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </section>
        </main>
      </div>

      {/* ── Footer ── */}
      <footer style={{
        borderTop: '1px solid var(--border)',
        background: 'var(--card-bg)',
        padding: '1.5rem 2rem 1.25rem',
      }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          {/* Top: logo + info */}
          <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'flex-start', flexWrap: 'wrap', marginBottom: '1.125rem' }}>
            {/* Logo & nama */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '.75rem', flexShrink: 0 }}>
              {settings.logo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={settings.logo_url} alt="logo" style={{ width: 46, height: 46, borderRadius: 12, objectFit: 'cover', border: '2px solid var(--border)' }} />
              ) : (
                <div style={{
                  width: 46, height: 46, borderRadius: 12,
                  background: 'linear-gradient(135deg, #5b21b6, #7c3aed)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontWeight: 900, fontSize: '1.2rem', color: 'white', flexShrink: 0,
                }}>
                  {(settings.store_name || 'V').charAt(0).toUpperCase()}
                </div>
              )}
              <div>
                <div style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--text)' }}>
                  {settings.store_name ?? 'Toko Vorie'}
                </div>
                {settings.tagline && (
                  <div style={{ fontSize: '.78rem', color: 'var(--muted)', fontStyle: 'italic' }}>
                    {settings.tagline}
                  </div>
                )}
              </div>
            </div>

            {/* Spacer */}
            <div style={{ flex: 1 }} />

            {/* Sosmed */}
            {(ig || wa) && (
              <div style={{ display: 'flex', gap: '.5rem', alignItems: 'center' }}>
                {ig && (
                  <a href={`https://instagram.com/${ig}`} target="_blank" rel="noreferrer"
                    style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--bg2)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-sub)', textDecoration: 'none', transition: 'all .2s' }}
                    onMouseEnter={e => { e.currentTarget.style.background='#e1306c'; e.currentTarget.style.color='white'; e.currentTarget.style.borderColor='#e1306c'; }}
                    onMouseLeave={e => { e.currentTarget.style.background='var(--bg2)'; e.currentTarget.style.color='var(--text-sub)'; e.currentTarget.style.borderColor='var(--border)'; }}
                    title={`@${ig}`}
                  ><Instagram size={16} /></a>
                )}
                {wa && (
                  <a href={`https://wa.me/${wa}`} target="_blank" rel="noreferrer"
                    style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--bg2)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-sub)', textDecoration: 'none', transition: 'all .2s' }}
                    onMouseEnter={e => { e.currentTarget.style.background='#25D366'; e.currentTarget.style.color='white'; e.currentTarget.style.borderColor='#25D366'; }}
                    onMouseLeave={e => { e.currentTarget.style.background='var(--bg2)'; e.currentTarget.style.color='var(--text-sub)'; e.currentTarget.style.borderColor='var(--border)'; }}
                    title="WhatsApp"
                  ><MessageCircle size={16} /></a>
                )}
              </div>
            )}
          </div>

          {/* Bottom: copyright */}
          <div style={{ borderTop: '1px solid var(--border)', paddingTop: '.875rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '.5rem' }}>
            <span style={{ fontSize: '.78rem', color: 'var(--muted)' }}>
              © {new Date().getFullYear()} {settings.store_name ?? 'Toko Vorie'}. All rights reserved.
            </span>
            <span style={{ fontSize: '.72rem', color: 'var(--muted)', opacity: .6 }}>
              Powered by Next.js + Supabase
            </span>
          </div>
        </div>
      </footer>

      <CartDrawer open={cartOpen} onClose={() => setCartOpen(false)} settings={settings} />
      <LoginModal open={loginOpen} onClose={() => setLoginOpen(false)} onSuccess={handleLoginSuccess} />
      <RatingModal open={ratingOpen} onClose={() => setRatingOpen(false)} />
    </>
  );
}

export async function getServerSideProps() {
  const { getCollection } = await import('../lib/jsonbin');

  const SETTINGS_DEFAULTS = {
    store_name: 'Toko Vorie',
    tagline: 'We Build And We Sell',
    logo_url: '',
    payment: {},
    social: {},
  };

  const [prodResult, settingsResult] = await Promise.allSettled([
    getCollection('products'),
    getCollection('settings'),
  ]);

  const rawSettings = settingsResult.status === 'fulfilled' ? settingsResult.value : null;
  const settings = Array.isArray(rawSettings)
    ? { ...SETTINGS_DEFAULTS, ...(rawSettings[0] ?? {}) }
    : { ...SETTINGS_DEFAULTS, ...(rawSettings ?? {}) };

  return {
    props: {
      initialProducts: prodResult.status === 'fulfilled' ? (prodResult.value ?? []) : [],
      initialSettings: settings,
    },
  };
}
