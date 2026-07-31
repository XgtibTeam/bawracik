import { ShoppingCart, Moon, Sun, Menu, LogIn, LayoutDashboard } from 'lucide-react';
import { useStore } from '../lib/useStore';

export default function Header({ storeName, logoUrl, tagline, onCartToggle, onSidebarToggle, onLoginClick }) {
  const { theme, setTheme, cart, user } = useStore();
  const cartCount = cart.reduce((s, i) => s + i.qty, 0);

  return (
    <header style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '0 1.25rem',
      height: 'auto', minHeight: 64,
      background: 'linear-gradient(135deg, #2e1065 0%, #5b21b6 45%, #7c3aed 100%)',
      position: 'sticky', top: 0, zIndex: 200,
      boxShadow: '0 3px 24px rgba(91,33,182,0.55)',
      gap: '1rem', paddingTop: '.5rem', paddingBottom: '.5rem',
    }}>
      {/* Left: hamburger + brand */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '.75rem' }}>
        <button
          onClick={onSidebarToggle}
          style={{
            width: 38, height: 38,
            background: 'rgba(255,255,255,0.12)',
            border: '1px solid rgba(255,255,255,0.22)',
            borderRadius: 10, color: 'white',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', transition: 'background .2s', flexShrink: 0,
          }}
        >
          <Menu size={18} />
        </button>

        <div style={{ display: 'flex', gap: '.625rem', alignItems: 'center' }}>
          {/* Logo */}
          {logoUrl ? (
            <div style={{
              width: 42, height: 42, borderRadius: 12, overflow: 'hidden',
              border: '2px solid rgba(255,255,255,0.35)', flexShrink: 0,
              boxShadow: '0 2px 10px rgba(0,0,0,.3)',
            }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={logoUrl} alt="logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
          ) : (
            <div style={{
              width: 42, height: 42, borderRadius: 12,
              background: 'rgba(255,255,255,0.15)', border: '2px solid rgba(255,255,255,0.3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: 900, fontSize: '1.1rem', color: 'white', flexShrink: 0,
              letterSpacing: '-1px', boxShadow: '0 2px 10px rgba(0,0,0,.25)',
            }}>
              {(storeName || 'V').charAt(0).toUpperCase()}
            </div>
          )}

          {/* Store name + tagline */}
          <div>
            <div style={{
              fontWeight: 900, fontSize: '1.2rem', color: 'white',
              letterSpacing: '-0.5px', lineHeight: 1.15,
              textShadow: '0 1px 6px rgba(0,0,0,.3)',
            }}>
              {storeName || 'Toko Vorie'}
            </div>
            {tagline && (
              <div style={{
                color: 'rgba(255,255,255,0.85)', fontSize: '.75rem',
                marginTop: 1, fontStyle: 'italic', fontWeight: 500,
                letterSpacing: '.01em',
              }}>
                {tagline}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Right: actions */}
      <div style={{ display: 'flex', gap: '.5rem', alignItems: 'center' }}>
        {/* Theme toggle */}
        <button
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          title="Toggle tema"
          style={{
            width: 36, height: 36,
            background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.2)',
            borderRadius: 8, color: 'white',
            display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
          }}
        >
          {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
        </button>

        {/* Cart — hanya tampil badge, tidak auto-buka */}
        <button
          onClick={onCartToggle}
          style={{
            position: 'relative',
            background: cartCount > 0 ? 'rgba(255,255,255,0.22)' : 'rgba(255,255,255,0.12)',
            border: `1px solid ${cartCount > 0 ? 'rgba(255,255,255,0.45)' : 'rgba(255,255,255,0.2)'}`,
            borderRadius: 8, color: 'white', padding: '.45rem .75rem',
            display: 'flex', alignItems: 'center', gap: '.375rem',
            cursor: 'pointer', fontFamily: 'inherit',
            fontWeight: 600, fontSize: '.82rem', transition: 'all .2s',
          }}
        >
          <ShoppingCart size={16} />
          <span className="cart-label">Keranjang</span>
          {cartCount > 0 && (
            <span style={{
              background: '#ef4444', color: 'white', borderRadius: '50%',
              width: 18, height: 18, fontSize: '.65rem', fontWeight: 800,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              position: 'absolute', top: -5, right: -5,
              boxShadow: '0 0 0 2px rgba(91,33,182,.8)',
            }}>
              {cartCount}
            </span>
          )}
        </button>

        {/* Login / Dashboard */}
        {user ? (
          <a href={user.role === 'admin' ? '/admin' : '/kasir'} style={{
            background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.2)',
            borderRadius: 8, color: 'white', padding: '.45rem .75rem',
            display: 'flex', alignItems: 'center', gap: '.375rem',
            fontWeight: 600, fontSize: '.82rem', textDecoration: 'none',
          }}>
            <LayoutDashboard size={15} />
            <span className="cart-label">Dashboard</span>
          </a>
        ) : (
          <button
            onClick={onLoginClick}
            style={{
              background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.2)',
              borderRadius: 8, color: 'white', padding: '.45rem .75rem',
              display: 'flex', alignItems: 'center', gap: '.375rem',
              fontWeight: 600, fontSize: '.82rem', fontFamily: 'inherit', cursor: 'pointer',
            }}
          >
            <LogIn size={15} />
            <span className="cart-label">Masuk</span>
          </button>
        )}
      </div>

      <style jsx>{`
        @media (max-width: 480px) { .cart-label { display: none; } }
      `}</style>
    </header>
  );
}
