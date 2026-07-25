import { useState, useEffect, useCallback } from 'react';
import Head from 'next/head';
import { ShoppingBag, Check, X, RefreshCw, LogOut, Store, Clock, CheckCircle } from 'lucide-react';
import { useStore } from '../lib/useStore';
import { money, formatDateTime, statusBadge, statusLabel, safeRating } from '../lib/utils';

const TABS = [
  { id: 'pending',   label: 'Masuk',   icon: Clock },
  { id: 'accepted',  label: 'Proses',  icon: ShoppingBag },
  { id: 'completed', label: 'Selesai', icon: CheckCircle },
  { id: 'all',       label: 'Semua',   icon: RefreshCw },
];

export default function KasirPage() {
  const { user, logout } = useStore();
  const [orders,   setOrders]   = useState([]);
  const [loading,  setLoading]  = useState(false);
  const [tab,      setTab]      = useState('pending');
  const [search,   setSearch]   = useState('');
  const [settings, setSettings] = useState({});

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const [oRes, sRes] = await Promise.all([
        fetch('/api/orders').then(r => r.json()),
        fetch('/api/settings').then(r => r.json()),
      ]);
      if (oRes.data) setOrders(oRes.data.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)));
      if (sRes.data) setSettings(sRes.data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOrders();
    const interval = setInterval(fetchOrders, 30000);
    return () => clearInterval(interval);
  }, [fetchOrders]);

  useEffect(() => {
    fetch('/api/auth/login')
      .then(r => r.json())
      .then(d => { if (!d.user || !['kasir', 'admin'].includes(d.user.role)) window.location.href = '/'; })
      .catch(() => { window.location.href = '/'; });
  }, []);

  const handleStatus = async (id, status) => {
    const d = await fetch(`/api/orders/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    }).then(r => r.json());
    if (d.success) fetchOrders();
  };

  const pending   = orders.filter(o => o.status === 'pending').length;
  const accepted  = orders.filter(o => o.status === 'accepted').length;
  const todayDone = orders.filter(o =>
    o.status === 'completed' &&
    o.created_at?.startsWith(new Date().toISOString().slice(0, 10))
  ).length;

  const filtered = orders.filter(o => {
    const matchTab = tab === 'all' || o.status === tab;
    const q = search.toLowerCase();
    return matchTab && (!q || o.customer?.toLowerCase().includes(q) || o.acc?.toLowerCase().includes(q));
  });

  const PAYMENT = settings.payment ?? {};

  return (
    <>
      <Head><title>Pesanan Masuk — {settings.store_name ?? 'Toko Vorie'}</title></Head>

      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', paddingBottom: 64 }}>

        {/* ── Header ── */}
        <header style={{
          height: 'var(--header-h)', position: 'sticky', top: 0, zIndex: 100,
          background: 'linear-gradient(135deg, #312e81, #4f46e5, #7c3aed)',
          display: 'flex', alignItems: 'center', padding: '0 1.25rem',
          justifyContent: 'space-between',
          boxShadow: '0 2px 20px rgba(79,70,229,.5)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '.625rem', color: 'white' }}>
            <ShoppingBag size={18} />
            <span style={{ fontWeight: 800, fontSize: '1rem' }}>Kasir</span>
            {pending > 0 && (
              <span style={{ background: '#ef4444', padding: '.1rem .55rem', borderRadius: 20, fontSize: '.7rem', fontWeight: 800, color: 'white' }}>
                {pending} baru
              </span>
            )}
          </div>
          <div style={{ display: 'flex', gap: '.5rem', alignItems: 'center', color: 'white' }}>
            <span style={{ fontSize: '.8rem', opacity: .8 }}>{user?.name ?? user?.username}</span>
            <a href="/" title="Ke Toko" style={{ width: 32, height: 32, background: 'rgba(255,255,255,.15)', border: '1px solid rgba(255,255,255,.2)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', textDecoration: 'none' }}>
              <Store size={15} />
            </a>
            <button onClick={logout} title="Logout" style={{ width: 32, height: 32, background: 'rgba(255,255,255,.15)', border: '1px solid rgba(255,255,255,.2)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', cursor: 'pointer' }}>
              <LogOut size={15} />
            </button>
          </div>
        </header>

        <main style={{ flex: 1, padding: '1.25rem 1.25rem', maxWidth: 760, width: '100%', margin: '0 auto' }}>

          {/* Stats */}
          <div className="stat-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', marginBottom: '1.25rem' }}>
            <div className="stat-card amber">
              <div className="stat-label">Menunggu</div>
              <div className="stat-value">{pending}</div>
            </div>
            <div className="stat-card blue">
              <div className="stat-label">Diproses</div>
              <div className="stat-value">{accepted}</div>
            </div>
            <div className="stat-card green">
              <div className="stat-label">Selesai Hari Ini</div>
              <div className="stat-value">{todayDone}</div>
            </div>
          </div>

          {/* Search */}
          <div style={{ marginBottom: '1rem' }}>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Cari nama pelanggan atau nomor..."
              style={{ width: '100%' }}
            />
          </div>

          {/* Refresh button */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '.75rem' }}>
            <button className="btn btn-ghost btn-sm" onClick={fetchOrders}>
              {loading ? <span className="spinner" style={{ width: 13, height: 13 }} /> : <RefreshCw size={13} />}
              Refresh
            </button>
          </div>

          {/* Orders list */}
          {filtered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '4rem 1rem', color: 'var(--muted)' }}>
              <ShoppingBag size={48} style={{ margin: '0 auto 1rem', display: 'block', opacity: .2 }} />
              <p>Tidak ada pesanan{tab !== 'all' ? ` "${statusLabel(tab)}"` : ''}</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '.875rem' }}>
              {filtered.map(o => (
                <div key={o.id} className="card" style={{ padding: '1rem 1.125rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '.625rem', flexWrap: 'wrap', gap: '.5rem' }}>
                    <div>
                      <div style={{ fontWeight: 700 }}>{o.customer || 'Anonim'}</div>
                      <div style={{ fontSize: '.78rem', color: 'var(--muted)' }}>{o.acc} · {formatDateTime(o.created_at)}</div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem' }}>
                      <span className={`badge badge-${statusBadge(o.status)}`}>{statusLabel(o.status)}</span>
                      <span style={{ fontWeight: 800, color: 'var(--primary-dark)' }}>Rp {money(o.total)}</span>
                    </div>
                  </div>

                  {/* Items */}
                  <div style={{ background: 'var(--bg2)', borderRadius: 8, padding: '.5rem .75rem', marginBottom: '.625rem', fontSize: '.84rem' }}>
                    {o.items?.map((item, i) => (
                      <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '.15rem 0', borderBottom: i < o.items.length - 1 ? '1px solid var(--border)' : 'none' }}>
                        <span>{item.name} <span style={{ color: 'var(--muted)' }}>×{item.qty}</span></span>
                        <span style={{ fontWeight: 600 }}>Rp {money(item.price * item.qty)}</span>
                      </div>
                    ))}
                  </div>

                  {/* Rating */}
                  {o.rating && (
                    <div style={{ fontSize: '.78rem', color: 'var(--warning)', marginBottom: '.625rem' }}>
                      {'★'.repeat(safeRating(o.rating))}{'☆'.repeat(5 - safeRating(o.rating))}
                      {o.feedback && <span style={{ color: 'var(--muted)', marginLeft: '.375rem' }}>"{o.feedback}"</span>}
                    </div>
                  )}

                  {/* Payment info */}
                  {(o.status === 'pending' || o.status === 'accepted') && (
                    <div style={{ fontSize: '.75rem', color: 'var(--muted)', marginBottom: '.625rem', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                      {PAYMENT.dana?.account && <span>DANA: <strong>{PAYMENT.dana.account}</strong></span>}
                      {PAYMENT.seabank?.account && <span>SeaBank: <strong>{PAYMENT.seabank.account}</strong></span>}
                    </div>
                  )}

                  {/* Actions */}
                  <div style={{ display: 'flex', gap: '.5rem' }}>
                    {o.status === 'pending' && (
                      <>
                        <button className="btn btn-success btn-sm" onClick={() => handleStatus(o.id, 'accepted')}>
                          <Check size={13} /> Terima
                        </button>
                        <button className="btn btn-danger btn-sm" onClick={() => handleStatus(o.id, 'rejected')}>
                          <X size={13} /> Tolak
                        </button>
                      </>
                    )}
                    {o.status === 'accepted' && (
                      <button className="btn btn-primary btn-sm" onClick={() => handleStatus(o.id, 'completed')}>
                        <Check size={13} /> Tandai Selesai
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>

        {/* ── Bottom Navigation ── */}
        <nav style={{
          position: 'fixed', bottom: 0, left: 0, right: 0, height: 64,
          background: 'var(--card-bg)', borderTop: '1px solid var(--border)',
          display: 'flex', alignItems: 'stretch',
          zIndex: 200, boxShadow: '0 -4px 20px rgba(0,0,0,.3)',
        }}>
          {TABS.map(({ id, label, icon: Icon }) => {
            const count = id === 'pending' ? pending : id === 'accepted' ? accepted : 0;
            return (
              <button
                key={id}
                onClick={() => setTab(id)}
                style={{
                  flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
                  justifyContent: 'center', gap: 3, border: 'none', cursor: 'pointer',
                  background: 'transparent', fontFamily: 'inherit',
                  color: tab === id ? 'var(--primary-dark)' : 'var(--muted)',
                  position: 'relative', transition: 'color .15s',
                  borderTop: tab === id ? '2px solid var(--primary)' : '2px solid transparent',
                }}
              >
                <Icon size={18} strokeWidth={tab === id ? 2.5 : 1.8} />
                <span style={{ fontSize: '.62rem', fontWeight: tab === id ? 700 : 500, lineHeight: 1 }}>
                  {label}
                </span>
                {count > 0 && (
                  <span style={{
                    position: 'absolute', top: 8, right: '50%', transform: 'translateX(14px)',
                    background: '#ef4444', color: 'white', borderRadius: 20,
                    padding: '0 4px', fontSize: '.58rem', fontWeight: 800, lineHeight: '14px', minWidth: 14, textAlign: 'center',
                  }}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>
    </>
  );
}
