import { useState, useEffect, useCallback } from 'react';
import Head from 'next/head';
import {
  LayoutDashboard, Package, Users, ShoppingBag, Settings, Database,
  Plus, Edit2, Trash2, Check, X, RefreshCw,
  LogOut, Store
} from 'lucide-react';
import { useStore } from '../lib/useStore';
import { money, formatDateTime, statusBadge, statusLabel, safeRating } from '../lib/utils';
import ProductModal from '../components/ProductModal';
import UserModal from '../components/UserModal';

const SQL_TEMPLATES = {
  select_products: `SELECT id, name, price, category, created_at FROM products ORDER BY created_at DESC;`,
  select_orders:   `SELECT id, customer, total, status, created_at FROM orders ORDER BY created_at DESC LIMIT 50;`,
  pending_orders:  `SELECT * FROM orders WHERE status = 'pending' ORDER BY created_at DESC;`,
};

const TABS = [
  { id: 'dashboard', label: 'Overview',   icon: LayoutDashboard },
  { id: 'orders',    label: 'Pesanan',    icon: ShoppingBag },
  { id: 'products',  label: 'Produk',     icon: Package },
  { id: 'users',     label: 'Akun',       icon: Users },
  { id: 'settings',  label: 'Pengaturan', icon: Settings },
  { id: 'sql',       label: 'SQL',        icon: Database },
];

export default function AdminPage() {
  const { user, logout, toast } = useStore();
  const [tab,       setTab]      = useState('dashboard');
  const [products,  setProducts] = useState([]);
  const [users,     setUsers]    = useState([]);
  const [orders,    setOrders]   = useState([]);
  const [settings,  setSettings] = useState({});
  const [loading,   setLoading]  = useState(false);

  const [prodModal,  setProdModal]  = useState({ open: false, product: null });
  const [userModal,  setUserModal]  = useState({ open: false, user: null });
  const [sqlQuery,   setSqlQuery]   = useState('');
  const [sqlResult,  setSqlResult]  = useState(null);
  const [sqlLoading, setSqlLoading] = useState(false);

  const [storeName,      setStoreName]      = useState('');
  const [tagline,        setTagline]        = useState('');
  const [logoUrl,        setLogoUrl]        = useState('');
  const [payDana,        setPayDana]        = useState('');
  const [paySeabank,     setPaySeabank]     = useState('');
  const [payQris,        setPayQris]        = useState('');
  const [igHandle,       setIgHandle]       = useState('');
  const [waNumber,       setWaNumber]       = useState('');
  const [savingSettings, setSavingSettings] = useState(false);

  const [orderFilter, setOrderFilter] = useState('');
  const [orderSearch, setOrderSearch] = useState('');

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [pRes, uRes, oRes, sRes] = await Promise.all([
        fetch('/api/products').then(r => r.json()),
        fetch('/api/users').then(r => r.json()),
        fetch('/api/orders').then(r => r.json()),
        fetch('/api/settings').then(r => r.json()),
      ]);
      if (pRes.data) setProducts(pRes.data);
      if (uRes.data) setUsers(uRes.data);
      if (oRes.data) setOrders(oRes.data);
      if (sRes.data) {
        const s = sRes.data;
        setSettings(s);
        setStoreName(s.store_name ?? '');
        setTagline(s.tagline ?? '');
        setLogoUrl(s.logo_url ?? '');
        setPayDana(s.payment?.dana?.account ?? '');
        setPaySeabank(s.payment?.seabank?.account ?? '');
        setPayQris(s.payment?.qris?.link ?? '');
        setIgHandle(s.social?.instagram ?? '');
        setWaNumber(s.social?.whatsapp ?? '');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  useEffect(() => {
    fetch('/api/auth/login')
      .then(r => r.json())
      .then(d => { if (!d.user || d.user.role !== 'admin') window.location.href = '/'; })
      .catch(() => { window.location.href = '/'; });
  }, []);

  const totalRevenue   = orders.filter(o => o.status === 'completed').reduce((s, o) => s + o.total, 0);
  const pendingCount   = orders.filter(o => o.status === 'pending').length;
  const completedCount = orders.filter(o => o.status === 'completed').length;
  const avgRating      = orders.filter(o => o.rating).length
    ? (orders.filter(o => o.rating).reduce((s, o) => s + o.rating, 0) / orders.filter(o => o.rating).length).toFixed(1)
    : '-';

  const handleDeleteProduct = async (id) => {
    if (!confirm('Hapus produk ini?')) return;
    const d = await fetch(`/api/products/${id}`, { method: 'DELETE' }).then(r => r.json());
    if (d.success) { toast('Produk dihapus', 'info'); fetchAll(); }
    else toast(d.error, 'error');
  };

  const handleDeleteUser = async (id) => {
    if (!confirm('Hapus akun ini?')) return;
    const d = await fetch(`/api/users/${id}`, { method: 'DELETE' }).then(r => r.json());
    if (d.success) { toast('Akun dihapus', 'info'); fetchAll(); }
    else toast(d.error, 'error');
  };

  const handleOrderStatus = async (id, status) => {
    const d = await fetch(`/api/orders/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    }).then(r => r.json());
    if (d.success) { toast(`Status: ${statusLabel(status)}`, 'success'); fetchAll(); }
    else toast(d.error, 'error');
  };

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    setSavingSettings(true);
    const d = await fetch('/api/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        store_name: storeName, tagline, logo_url: logoUrl,
        payment: {
          dana:    { name: 'DANA',    account: payDana,    instruction: 'Transfer ke DANA lalu tunjukkan bukti ke kasir.' },
          seabank: { name: 'SeaBank', account: paySeabank, instruction: 'Transfer ke SeaBank lalu tunjukkan bukti ke kasir.' },
          qris:    { name: 'QRIS',    link: payQris,       instruction: 'Scan QRIS.' },
        },
        social: { instagram: igHandle, whatsapp: waNumber },
      }),
    }).then(r => r.json());
    setSavingSettings(false);
    if (d.success) toast('Pengaturan disimpan', 'success');
    else toast(d.error, 'error');
  };

  const runSQL = async () => {
    if (!sqlQuery.trim()) return;
    setSqlLoading(true); setSqlResult(null);
    try {
      const d = await fetch('/api/sql', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: sqlQuery }),
      }).then(r => r.json());
      setSqlResult(d);
    } finally { setSqlLoading(false); }
  };

  const filteredOrders = orders.filter(o => {
    const matchFilter = !orderFilter || o.status === orderFilter;
    const q = orderSearch.toLowerCase();
    return matchFilter && (!q || o.customer?.toLowerCase().includes(q) || o.acc?.toLowerCase().includes(q));
  });

  return (
    <>
      <Head><title>Dashboard Admin — {settings.store_name ?? 'Toko Vorie'}</title></Head>

      <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', paddingBottom: 64 }}>

        {/* ── Top header ── */}
        <header style={{
          height: 'var(--header-h)', position: 'sticky', top: 0, zIndex: 100,
          background: 'linear-gradient(135deg, #3b0764, #5b21b6, #7c3aed)',
          display: 'flex', alignItems: 'center', padding: '0 1.25rem',
          justifyContent: 'space-between',
          boxShadow: '0 2px 20px rgba(91,33,182,.5)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '.625rem', color: 'white' }}>
            <LayoutDashboard size={18} />
            <span style={{ fontWeight: 800, fontSize: '1rem' }}>Admin</span>
            <span style={{ background: 'rgba(255,255,255,.15)', padding: '.1rem .55rem', borderRadius: 20, fontSize: '.7rem', fontWeight: 700 }}>
              {settings.store_name ?? 'Toko Vorie'}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem', color: 'white' }}>
            <span style={{ fontSize: '.8rem', opacity: .8 }}>{user?.name ?? user?.username}</span>
            <a href="/" title="Ke Toko" style={{ width: 32, height: 32, background: 'rgba(255,255,255,.15)', border: '1px solid rgba(255,255,255,.2)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', textDecoration: 'none' }}>
              <Store size={15} />
            </a>
            <button onClick={logout} title="Logout" style={{ width: 32, height: 32, background: 'rgba(255,255,255,.15)', border: '1px solid rgba(255,255,255,.2)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', cursor: 'pointer' }}>
              <LogOut size={15} />
            </button>
          </div>
        </header>

        {/* ── Main content ── */}
        <main style={{ flex: 1, padding: '1.25rem 1.5rem', maxWidth: 1100, width: '100%', margin: '0 auto', overflowX: 'hidden' }}>

          {/* ── DASHBOARD ── */}
          {tab === 'dashboard' && (
            <div className="fade-in">
              <div className="section-header">
                <h2>Overview</h2>
                <button className="btn btn-ghost btn-sm" onClick={fetchAll}><RefreshCw size={13} /> Refresh</button>
              </div>
              <div className="stat-grid">
                <div className="stat-card"><div className="stat-label">Total Produk</div><div className="stat-value">{products.length}</div></div>
                <div className="stat-card green">
                  <div className="stat-label">Pendapatan</div>
                  <div className="stat-value" style={{ fontSize: '1.3rem' }}>Rp {money(totalRevenue)}</div>
                  <div className="stat-sub">{completedCount} selesai</div>
                </div>
                <div className="stat-card amber">
                  <div className="stat-label">Menunggu</div>
                  <div className="stat-value">{pendingCount}</div>
                </div>
                <div className="stat-card blue">
                  <div className="stat-label">Rating</div>
                  <div className="stat-value">★ {avgRating}</div>
                </div>
              </div>

              <div className="section-header" style={{ marginTop: '1.5rem' }}>
                <h3 style={{ fontSize: '1rem' }}>Pesanan Terbaru</h3>
                <button className="btn btn-ghost btn-sm" onClick={() => setTab('orders')}>Lihat Semua</button>
              </div>
              <div className="table-wrap">
                <table>
                  <thead><tr><th>Pelanggan</th><th>Total</th><th>Status</th><th>Waktu</th><th>Aksi</th></tr></thead>
                  <tbody>
                    {orders.slice(0, 8).map(o => (
                      <tr key={o.id}>
                        <td><strong>{o.customer}</strong><br /><span className="text-xs text-muted">{o.acc}</span></td>
                        <td style={{ fontWeight: 700 }}>Rp {money(o.total)}</td>
                        <td><span className={`badge badge-${statusBadge(o.status)}`}>{statusLabel(o.status)}</span></td>
                        <td className="text-muted text-sm">{formatDateTime(o.created_at)}</td>
                        <td>
                          <div style={{ display: 'flex', gap: '.3rem' }}>
                            {o.status === 'pending' && <>
                              <button className="btn btn-success btn-sm" onClick={() => handleOrderStatus(o.id, 'accepted')}><Check size={12} /></button>
                              <button className="btn btn-danger btn-sm" onClick={() => handleOrderStatus(o.id, 'rejected')}><X size={12} /></button>
                            </>}
                            {o.status === 'accepted' && <button className="btn btn-primary btn-sm" onClick={() => handleOrderStatus(o.id, 'completed')}>Selesai</button>}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── ORDERS ── */}
          {tab === 'orders' && (
            <div className="fade-in">
              <div className="section-header">
                <h2>Pesanan</h2>
                <button className="btn btn-ghost btn-sm" onClick={fetchAll}><RefreshCw size={13} /> Refresh</button>
              </div>
              <div style={{ display: 'flex', gap: '.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
                <input value={orderSearch} onChange={e => setOrderSearch(e.target.value)} placeholder="Cari pelanggan..." style={{ width: 200 }} />
                <select value={orderFilter} onChange={e => setOrderFilter(e.target.value)} style={{ width: 160 }}>
                  <option value="">Semua Status</option>
                  <option value="pending">Menunggu</option>
                  <option value="accepted">Diproses</option>
                  <option value="completed">Selesai</option>
                  <option value="rejected">Ditolak</option>
                </select>
              </div>
              <div className="table-wrap">
                <table>
                  <thead><tr><th>#</th><th>Pelanggan</th><th>Item</th><th>Total</th><th>Status</th><th>Waktu</th><th>Aksi</th></tr></thead>
                  <tbody>
                    {filteredOrders.map((o, i) => (
                      <tr key={o.id}>
                        <td className="text-xs text-muted">{i + 1}</td>
                        <td>
                          <strong>{o.customer}</strong>
                          <br /><span className="text-xs text-muted">{o.acc}</span>
                          {o.rating && <span style={{ display: 'block', color: 'var(--warning)', fontSize: '.72rem' }}>{'★'.repeat(safeRating(o.rating))}</span>}
                        </td>
                        <td className="text-sm">{o.items?.map(i => `${i.name} ×${i.qty}`).join(', ')}</td>
                        <td style={{ fontWeight: 700 }}>Rp {money(o.total)}</td>
                        <td><span className={`badge badge-${statusBadge(o.status)}`}>{statusLabel(o.status)}</span></td>
                        <td className="text-xs text-muted">{formatDateTime(o.created_at)}</td>
                        <td>
                          <div style={{ display: 'flex', gap: '.3rem' }}>
                            {o.status === 'pending' && <>
                              <button className="btn btn-success btn-sm" onClick={() => handleOrderStatus(o.id, 'accepted')} title="Terima"><Check size={12} /></button>
                              <button className="btn btn-danger btn-sm" onClick={() => handleOrderStatus(o.id, 'rejected')} title="Tolak"><X size={12} /></button>
                            </>}
                            {o.status === 'accepted' && <button className="btn btn-primary btn-sm" onClick={() => handleOrderStatus(o.id, 'completed')}>Selesai</button>}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── PRODUCTS ── */}
          {tab === 'products' && (
            <div className="fade-in">
              <div className="section-header">
                <h2>Produk</h2>
                <div style={{ display: 'flex', gap: '.5rem' }}>
                  <button className="btn btn-ghost btn-sm" onClick={fetchAll}><RefreshCw size={13} /></button>
                  <button className="btn btn-primary btn-sm" onClick={() => setProdModal({ open: true, product: null })}>
                    <Plus size={13} /> Tambah
                  </button>
                </div>
              </div>
              <div className="table-wrap">
                <table>
                  <thead><tr><th>Foto</th><th>Nama</th><th>Kategori</th><th>Harga</th><th>Foto</th><th>Aksi</th></tr></thead>
                  <tbody>
                    {products.map(p => {
                      const thumb = p.images?.[0] || p.img;
                      const imgCount = p.images?.length || (p.img ? 1 : 0);
                      return (
                        <tr key={p.id}>
                          <td>
                            {thumb
                              ? <img src={thumb} alt="" style={{ width: 44, height: 36, objectFit: 'cover', borderRadius: 6, border: '1px solid var(--border)' }} />
                              : <div style={{ width: 44, height: 36, background: 'var(--bg2)', borderRadius: 6 }} />
                            }
                          </td>
                          <td><strong>{p.name}</strong>{p.desc && <p className="text-xs text-muted" style={{ margin: '2px 0 0' }}>{p.desc.slice(0, 50)}</p>}</td>
                          <td>{p.category ? <span className="badge badge-purple">{p.category}</span> : <span className="text-muted">—</span>}</td>
                          <td style={{ fontWeight: 700 }}>Rp {money(p.price)}</td>
                          <td className="text-sm text-muted">{imgCount}</td>
                          <td>
                            <div style={{ display: 'flex', gap: '.3rem' }}>
                              <button className="btn btn-ghost btn-sm" onClick={() => setProdModal({ open: true, product: p })}><Edit2 size={12} /></button>
                              <button className="btn btn-danger btn-sm" onClick={() => handleDeleteProduct(p.id)}><Trash2 size={12} /></button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── USERS ── */}
          {tab === 'users' && (
            <div className="fade-in">
              <div className="section-header">
                <h2>Akun Staff</h2>
                <div style={{ display: 'flex', gap: '.5rem' }}>
                  <button className="btn btn-ghost btn-sm" onClick={fetchAll}><RefreshCw size={13} /></button>
                  <button className="btn btn-primary btn-sm" onClick={() => setUserModal({ open: true, user: null })}>
                    <Plus size={13} /> Tambah
                  </button>
                </div>
              </div>
              <div className="table-wrap">
                <table>
                  <thead><tr><th>Nama</th><th>Username</th><th>Role</th><th>Dibuat</th><th>Aksi</th></tr></thead>
                  <tbody>
                    {users.map(u => (
                      <tr key={u.id}>
                        <td><strong>{u.name ?? u.username}</strong></td>
                        <td className="font-mono text-sm">{u.username}</td>
                        <td><span className={`badge ${u.role === 'admin' ? 'badge-warning' : 'badge-info'}`}>{u.role}</span></td>
                        <td className="text-xs text-muted">{u.created_at ? formatDateTime(u.created_at) : '—'}</td>
                        <td>
                          <div style={{ display: 'flex', gap: '.3rem' }}>
                            <button className="btn btn-ghost btn-sm" onClick={() => setUserModal({ open: true, user: u })}><Edit2 size={12} /></button>
                            <button className="btn btn-danger btn-sm" onClick={() => handleDeleteUser(u.id)}><Trash2 size={12} /></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── SETTINGS ── */}
          {tab === 'settings' && (
            <div className="fade-in" style={{ maxWidth: 620 }}>
              <h2 style={{ marginBottom: '1.25rem' }}>Pengaturan Toko</h2>
              <form onSubmit={handleSaveSettings}>
                <div className="card" style={{ marginBottom: '1rem' }}>
                  <h4 style={{ margin: '0 0 1rem', fontSize: '.85rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.06em' }}>Identitas Toko</h4>
                  <div className="form-group"><label>Nama Toko</label><input value={storeName} onChange={e => setStoreName(e.target.value)} /></div>
                  <div className="form-group"><label>Tagline</label><input value={tagline} onChange={e => setTagline(e.target.value)} /></div>
                  <div className="form-group"><label>URL Logo</label><input value={logoUrl} onChange={e => setLogoUrl(e.target.value)} placeholder="https://..." /></div>
                </div>
                <div className="card" style={{ marginBottom: '1rem' }}>
                  <h4 style={{ margin: '0 0 1rem', fontSize: '.85rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.06em' }}>Pembayaran</h4>
                  <div className="form-group"><label>No. DANA</label><input value={payDana} onChange={e => setPayDana(e.target.value)} /></div>
                  <div className="form-group"><label>No. SeaBank</label><input value={paySeabank} onChange={e => setPaySeabank(e.target.value)} /></div>
                  <div className="form-group"><label>Link QRIS (URL gambar)</label><input value={payQris} onChange={e => setPayQris(e.target.value)} /></div>
                </div>
                <div className="card" style={{ marginBottom: '1.25rem' }}>
                  <h4 style={{ margin: '0 0 1rem', fontSize: '.85rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.06em' }}>Media Sosial</h4>
                  <div className="form-group"><label>Instagram (tanpa @)</label><input value={igHandle} onChange={e => setIgHandle(e.target.value)} /></div>
                  <div className="form-group"><label>WhatsApp (format internasional)</label><input value={waNumber} onChange={e => setWaNumber(e.target.value)} placeholder="628xxxxxxx" /></div>
                </div>
                <button type="submit" className="btn btn-primary" disabled={savingSettings}>
                  {savingSettings ? <span className="spinner" style={{ width: 14, height: 14 }} /> : null}
                  {savingSettings ? 'Menyimpan...' : 'Simpan Pengaturan'}
                </button>
              </form>
            </div>
          )}

          {/* ── SQL EDITOR ── */}
          {tab === 'sql' && (
            <div className="fade-in">
              <div className="section-header">
                <h2>SQL Editor</h2>
                <span className="text-xs text-muted">Supabase queries</span>
              </div>
              <div style={{ display: 'flex', gap: '.375rem', flexWrap: 'wrap', marginBottom: '.75rem' }}>
                {Object.entries(SQL_TEMPLATES).map(([k, v]) => (
                  <button key={k} type="button" className="btn btn-ghost btn-sm" onClick={() => setSqlQuery(v)}>
                    {k.replace(/_/g, ' ')}
                  </button>
                ))}
              </div>
              <textarea
                value={sqlQuery}
                onChange={e => setSqlQuery(e.target.value)}
                rows={8}
                placeholder="SELECT * FROM products LIMIT 10;"
                style={{ fontFamily: "'Fira Code','Courier New',monospace", fontSize: '.85rem', background: '#0f172a', color: '#e2e8f0', borderColor: '#1e293b', resize: 'vertical' }}
              />
              <button className="btn btn-primary btn-sm" onClick={runSQL} disabled={sqlLoading} style={{ marginTop: '.5rem' }}>
                {sqlLoading ? <span className="spinner" style={{ width: 14, height: 14 }} /> : <Database size={13} />}
                {sqlLoading ? 'Running...' : 'Jalankan'}
              </button>
              {sqlResult && (
                <div style={{ marginTop: '1rem' }}>
                  {sqlResult.error
                    ? <div style={{ background: 'var(--danger-bg)', color: 'var(--danger)', padding: '.75rem', borderRadius: 8, fontSize: '.84rem' }}>{sqlResult.error}</div>
                    : Array.isArray(sqlResult.data) && sqlResult.data.length > 0
                      ? <div className="table-wrap"><table>
                          <thead><tr>{Object.keys(sqlResult.data[0]).map(k => <th key={k}>{k}</th>)}</tr></thead>
                          <tbody>{sqlResult.data.slice(0, 100).map((row, i) => (
                            <tr key={i}>{Object.values(row).map((v, j) => <td key={j} className="text-sm">{v !== null ? String(v).slice(0, 120) : <em style={{ opacity: .4 }}>null</em>}</td>)}</tr>
                          ))}</tbody>
                        </table></div>
                      : <div style={{ color: 'var(--success)', fontSize: '.84rem', padding: '.5rem' }}>Query berhasil.</div>
                  }
                </div>
              )}
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
          {TABS.map(({ id, label, icon: Icon }) => (
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
              {id === 'orders' && pendingCount > 0 && (
                <span style={{
                  position: 'absolute', top: 8, right: '50%', transform: 'translateX(14px)',
                  background: '#ef4444', color: 'white', borderRadius: 20,
                  padding: '0 4px', fontSize: '.58rem', fontWeight: 800, lineHeight: '14px', minWidth: 14, textAlign: 'center',
                }}>
                  {pendingCount}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      <ProductModal
        open={prodModal.open}
        product={prodModal.product}
        onClose={() => setProdModal({ open: false, product: null })}
        onSaved={fetchAll}
      />
      <UserModal
        open={userModal.open}
        user={userModal.user}
        onClose={() => setUserModal({ open: false, user: null })}
        onSaved={fetchAll}
      />
    </>
  );
}
