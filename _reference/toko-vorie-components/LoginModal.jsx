import { useState } from 'react';
import { X, LogIn, Eye, EyeOff } from 'lucide-react';
import { useStore } from '../lib/useStore';

export default function LoginModal({ open, onClose, onSuccess }) {
  const { login, loading } = useStore();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPw,   setShowPw]   = useState(false);
  const [error,    setError]    = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const result = await login(username.trim(), password.trim());
    if (result.ok) {
      setUsername(''); setPassword('');
      onClose();
      onSuccess?.(result.user);
    } else {
      setError('Username atau password salah');
    }
  };

  if (!open) return null;

  return (
    <div className={`modal-backdrop${open ? ' open' : ''}`} onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-box narrow" style={{ maxWidth: 380 }}>
        {/* Header */}
        <div className="modal-header">
          <div>
            <h3 style={{ margin: 0 }}>Masuk</h3>
            <p style={{ fontSize: '.8rem', color: 'var(--muted)', margin: '.2rem 0 0' }}>
              Khusus kasir &amp; admin
            </p>
          </div>
          <button className="btn btn-ghost btn-icon" onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Username</label>
            <input
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder="Username"
              autoFocus
              autoComplete="username"
              required
            />
          </div>

          <div className="form-group">
            <label>Password</label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPw ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Password"
                autoComplete="current-password"
                required
                style={{ paddingRight: '2.5rem' }}
              />
              <button
                type="button"
                onClick={() => setShowPw(v => !v)}
                style={{
                  position: 'absolute', right: '.75rem', top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', padding: 0,
                  display: 'flex',
                }}
              >
                {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {error && (
            <div style={{
              background: 'var(--danger-bg)', color: 'var(--danger)',
              border: '1px solid var(--danger)', borderRadius: 8,
              padding: '.5rem .75rem', fontSize: '.82rem', marginBottom: '1rem',
            }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%', justifyContent: 'center', padding: '.65rem', marginTop: '.25rem' }}
            disabled={loading}
          >
            {loading ? <span className="spinner" style={{ width: 16, height: 16 }} /> : <LogIn size={16} />}
            {loading ? 'Memproses...' : 'Masuk'}
          </button>
        </form>

        <p style={{ textAlign: 'center', fontSize: '.75rem', color: 'var(--muted)', marginTop: '1rem' }}>
          Login hanya untuk staff. Pembeli tidak perlu login.
        </p>
      </div>
    </div>
  );
}
