import { Store, ShoppingBag, Star, LayoutDashboard, Briefcase, LogOut, LogIn, Instagram, MessageCircle, Phone } from 'lucide-react';
import { useStore } from '../lib/useStore';

export default function Sidebar({ open, settings, onLoginClick, onClose, onRatingClick }) {
  const { user, logout } = useStore();

  const navItems = [
    { icon: Store,         label: 'Toko',            href: '/' },
    { icon: Star,          label: 'Ulasan',           href: '/#reviews' },
    ...(user?.role === 'kasir' ? [{ icon: Briefcase,       label: 'Pesanan Masuk',   href: '/kasir' }] : []),
    ...(user?.role === 'admin' ? [{ icon: LayoutDashboard, label: 'Dashboard Admin', href: '/admin' }] : []),
  ];

  const ig = settings?.social?.instagram;
  const wa = settings?.social?.whatsapp;
  const tt = settings?.social?.tiktok;

  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <div onClick={onClose} className="sidebar-overlay" />
      )}

      <aside className={`sidebar${open ? '' : ' sidebar-hidden'}`}>

        {/* ── Profile card ── */}
        <div style={{
          background: 'linear-gradient(135deg, #4c1d95, #7c3aed)',
          borderRadius: 'var(--radius)', padding: '.875rem 1rem',
          marginBottom: '1rem', color: 'white',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '.75rem' }}>
            <div style={{
              width: 40, height: 40, borderRadius: '50%',
              background: user ? 'rgba(245,158,11,.3)' : 'rgba(255,255,255,.18)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              border: '2px solid rgba(255,255,255,.3)', flexShrink: 0,
            }}>
              {user?.role === 'admin' ? <LayoutDashboard size={17} />
                : user?.role === 'kasir' ? <Briefcase size={17} />
                : <ShoppingBag size={17} />}
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: '.9rem', lineHeight: 1.2 }}>
                {user ? (user.name || user.username) : 'Halo, Tamu!'}
              </div>
              <div style={{ fontSize: '.7rem', color: 'rgba(255,255,255,.75)', marginTop: 1 }}>
                {user ? (user.role === 'admin' ? 'Administrator' : 'Kasir') : 'Selamat berbelanja 👋'}
              </div>
            </div>
          </div>
          {user && (
            <button onClick={logout} style={{
              width: '100%', marginTop: '.625rem',
              background: 'rgba(255,255,255,.15)', color: 'white',
              border: '1px solid rgba(255,255,255,.25)', padding: '.35rem .75rem',
              borderRadius: 8, cursor: 'pointer', fontSize: '.8rem', fontFamily: 'inherit',
              display: 'flex', alignItems: 'center', gap: '.375rem', justifyContent: 'center',
            }}>
              <LogOut size={13} /> Logout
            </button>
          )}
        </div>

        {/* ── Nav ── */}
        <div className="sidebar-section-label">Menu</div>
        <nav style={{ marginBottom: '.75rem' }}>
          {navItems.map(({ icon: Icon, label, href }) => (
            <a key={href} href={href} className="sidebar-nav-item">
              <span className="sidebar-nav-icon"><Icon size={15} /></span>
              {label}
            </a>
          ))}

          {/* Rating tanpa belanja */}
          <button onClick={onRatingClick} className="sidebar-nav-item sidebar-nav-btn">
            <span className="sidebar-nav-icon"><Star size={15} /></span>
            Beri Rating
          </button>

          {!user && (
            <button onClick={onLoginClick} className="sidebar-nav-item sidebar-nav-btn">
              <span className="sidebar-nav-icon"><LogIn size={15} /></span>
              Masuk (Staff)
            </button>
          )}
        </nav>

        {/* ── Info toko ── */}
        {settings?.store_name && (
          <>
            <div className="sidebar-section-label">Tentang Toko</div>
            <div style={{
              background: 'var(--bg2)', border: '1px solid var(--border)',
              borderRadius: 'var(--radius-sm)', padding: '.75rem',
              marginBottom: '.75rem', fontSize: '.82rem', color: 'var(--text-sub)',
            }}>
              <strong style={{ color: 'var(--text)', display: 'block', marginBottom: '.2rem' }}>
                {settings.store_name}
              </strong>
              {settings.tagline && (
                <span style={{ fontStyle: 'italic', color: 'var(--muted)', fontSize: '.78rem' }}>
                  "{settings.tagline}"
                </span>
              )}
            </div>
          </>
        )}

        {/* ── Sosial media & kontak ── */}
        {(ig || wa || tt) && (
          <>
            <div className="sidebar-section-label">Hubungi Kami</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '.375rem', marginBottom: '.75rem' }}>
              {ig && (
                <a href={`https://instagram.com/${ig}`} target="_blank" rel="noreferrer" className="sidebar-social-item">
                  <Instagram size={15} />
                  <span>@{ig}</span>
                </a>
              )}
              {wa && (
                <a href={`https://wa.me/${wa}`} target="_blank" rel="noreferrer" className="sidebar-social-item" style={{ '--hover-color': '#25D366' }}>
                  <MessageCircle size={15} />
                  <span>WhatsApp</span>
                </a>
              )}
              {tt && (
                <a href={`https://tiktok.com/@${tt}`} target="_blank" rel="noreferrer" className="sidebar-social-item" style={{ '--hover-color': '#ff0050' }}>
                  <Phone size={15} />
                  <span>@{tt}</span>
                </a>
              )}
            </div>
          </>
        )}

        {/* ── Payment info ── */}
        {(settings?.payment?.dana?.account || settings?.payment?.seabank?.account) && (
          <>
            <div className="sidebar-section-label">Pembayaran</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '.3rem' }}>
              {settings.payment.dana?.account && (
                <div style={{ fontSize: '.78rem', color: 'var(--text-sub)', padding: '.35rem .5rem', background: 'var(--bg2)', borderRadius: 6, border: '1px solid var(--border)' }}>
                  <span style={{ color: 'var(--muted)', display: 'block', fontSize: '.68rem', fontWeight: 600 }}>DANA</span>
                  {settings.payment.dana.account}
                </div>
              )}
              {settings.payment.seabank?.account && (
                <div style={{ fontSize: '.78rem', color: 'var(--text-sub)', padding: '.35rem .5rem', background: 'var(--bg2)', borderRadius: 6, border: '1px solid var(--border)' }}>
                  <span style={{ color: 'var(--muted)', display: 'block', fontSize: '.68rem', fontWeight: 600 }}>SeaBank</span>
                  {settings.payment.seabank.account}
                </div>
              )}
            </div>
          </>
        )}
      </aside>

      <style jsx>{`
        .sidebar-overlay {
          position: fixed; inset: 0; background: rgba(0,0,0,.45);
          z-index: 140; display: none;
        }
        .sidebar {
          width: var(--sidebar-w);
          background: var(--card-bg);
          border-right: 1px solid var(--border);
          padding: 1rem .875rem;
          position: sticky;
          top: var(--header-h);
          height: calc(100vh - var(--header-h));
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          flex-shrink: 0;
          transition: transform .3s cubic-bezier(.4,0,.2,1), margin .3s;
          z-index: 100;
          scrollbar-width: none;
        }
        .sidebar::-webkit-scrollbar { display: none; }
        .sidebar-hidden {
          transform: translateX(calc(-1 * var(--sidebar-w)));
          margin-right: calc(-1 * var(--sidebar-w));
        }
        .sidebar-section-label {
          font-size: .62rem; text-transform: uppercase; letter-spacing: .1em;
          color: var(--muted); margin-bottom: .3rem; padding: 0 .5rem;
          font-weight: 700; margin-top: .25rem;
        }
        :global(.sidebar-nav-item) {
          display: flex; align-items: center; gap: .55rem;
          padding: .5rem .75rem; border-radius: 8;
          color: var(--text-sub); text-decoration: none;
          margin-bottom: 2px; font-weight: 500; font-size: .85rem;
          transition: all .15s;
        }
        :global(.sidebar-nav-item:hover) {
          background: var(--primary-muted); color: var(--primary-dark);
        }
        :global(.sidebar-nav-btn) {
          background: none; border: none; width: 100%;
          cursor: pointer; font-family: inherit; text-align: left;
        }
        :global(.sidebar-nav-icon) {
          width: 20px; height: 20px; display: flex;
          align-items: center; justify-content: center; flex-shrink: 0;
        }
        :global(.sidebar-social-item) {
          display: flex; align-items: center; gap: .55rem;
          padding: .45rem .75rem; border-radius: 8;
          border: 1px solid var(--border);
          color: var(--text-sub); text-decoration: none;
          font-size: .82rem; font-weight: 500; transition: all .15s;
          background: var(--bg2);
        }
        :global(.sidebar-social-item:hover) {
          background: var(--primary-muted); border-color: var(--primary); color: var(--primary-dark);
        }
        @media (max-width: 768px) {
          .sidebar {
            position: fixed; top: var(--header-h); left: 0;
            height: calc(100vh - var(--header-h)); z-index: 150;
          }
          .sidebar-hidden { transform: translateX(-100%); margin-right: 0; }
          .sidebar-overlay { display: block !important; }
        }
      `}</style>
    </>
  );
}
