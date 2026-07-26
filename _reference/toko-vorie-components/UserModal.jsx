import { useState, useEffect } from 'react';
import { X, Save, Eye, EyeOff } from 'lucide-react';
import { useStore } from '../lib/useStore';

export default function UserModal({ open, user, onClose, onSaved }) {
  const { toast } = useStore();
  const [name,     setName]     = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirm,  setConfirm]  = useState('');
  const [role,     setRole]     = useState('kasir');
  const [showPw,   setShowPw]   = useState(false);
  const [saving,   setSaving]   = useState(false);

  useEffect(() => {
    if (open) {
      setName(user?.name ?? '');
      setUsername(user?.username ?? '');
      setPassword(''); setConfirm('');
      setRole(user?.role ?? 'kasir');
      setShowPw(false);
    }
  }, [open, user]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (username.length < 3) { toast('Username min 3 karakter', 'error'); return; }
    if (!user?.id && password.length < 6) { toast('Password min 6 karakter', 'error'); return; }
    if (!user?.id && password !== confirm) { toast('Password tidak cocok', 'error'); return; }

    setSaving(true);
    try {
      const payload = { name: name.trim(), username: username.trim(), role };
      if (password) payload.password = password;

      const url    = user?.id ? `/api/users/${user.id}` : '/api/users';
      const method = user?.id ? 'PUT' : 'POST';
      const r = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const d = await r.json();
      if (d.success) {
        toast(`Akun berhasil ${user?.id ? 'diupdate' : 'ditambahkan'}`, 'success');
        onSaved?.();
        onClose();
      } else {
        toast(d.error ?? 'Gagal menyimpan', 'error');
      }
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <div className={`modal-backdrop${open ? ' open' : ''}`} onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-box narrow">
        <div className="modal-header">
          <h3>{user?.id ? 'Edit Akun' : 'Tambah Akun Staff'}</h3>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={16} /></button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Nama Lengkap</label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="Nama lengkap" />
          </div>
          <div className="form-group">
            <label>Username *</label>
            <input value={username} onChange={e => setUsername(e.target.value)} placeholder="username" required />
          </div>
          <div className="form-group">
            <label>
              Password {user?.id && <span style={{ color: 'var(--muted)', fontWeight: 400 }}>(kosongkan jika tidak diubah)</span>}
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPw ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder={user?.id ? '••••••••' : 'Min 6 karakter'}
                required={!user?.id}
                style={{ paddingRight: '2.5rem' }}
              />
              <button type="button" onClick={() => setShowPw(v => !v)}
                style={{ position: 'absolute', right: '.75rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', padding: 0, display: 'flex' }}>
                {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>
          {(!user?.id || password) && (
            <div className="form-group">
              <label>Konfirmasi Password</label>
              <input
                type="password"
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                placeholder="Ulangi password"
                required={!user?.id}
              />
            </div>
          )}
          <div className="form-group">
            <label>Role</label>
            <select value={role} onChange={e => setRole(e.target.value)}>
              <option value="kasir">Kasir</option>
              <option value="admin">Admin</option>
            </select>
          </div>

          <div style={{ display: 'flex', gap: '.5rem', justifyContent: 'flex-end' }}>
            <button type="button" className="btn btn-ghost" onClick={onClose}>Batal</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? <span className="spinner" style={{ width: 14, height: 14 }} /> : <Save size={14} />}
              {saving ? 'Menyimpan...' : 'Simpan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
