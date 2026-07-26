import { useState } from 'react';
import { X, Star, Send } from 'lucide-react';
import { useStore } from '../lib/useStore';

export default function RatingModal({ open, onClose }) {
  const { toast } = useStore();
  const [name,     setName]     = useState('');
  const [rating,   setRating]   = useState(0);
  const [hov,      setHov]      = useState(0);
  const [feedback, setFeedback] = useState('');
  const [sending,  setSending]  = useState(false);
  const [done,     setDone]     = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!rating) { toast('Pilih bintang dulu', 'warning'); return; }
    setSending(true);
    try {
      // Kirim sebagai order kosong khusus rating
      const r = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer: name.trim() || 'Anonim',
          acc:      '-',
          items:    [],
          total:    0,
          rating,
          feedback: feedback.trim() || undefined,
        }),
      });
      const d = await r.json();
      if (d.success) {
        setDone(true);
        toast('Terima kasih atas ulasanmu! ⭐', 'success');
      } else {
        toast(d.error ?? 'Gagal mengirim ulasan', 'error');
      }
    } finally {
      setSending(false);
    }
  };

  const handleClose = () => {
    onClose();
    setTimeout(() => { setDone(false); setRating(0); setHov(0); setFeedback(''); setName(''); }, 350);
  };

  const LABELS = ['', 'Sangat Buruk', 'Kurang Baik', 'Cukup', 'Bagus', 'Luar Biasa!'];

  if (!open) return null;

  return (
    <div className={`modal-backdrop${open ? ' open' : ''}`} onClick={e => e.target === e.currentTarget && handleClose()}>
      <div className="modal-box narrow">
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem' }}>
            <Star size={18} style={{ color: 'var(--warning)' }} />
            <h3 style={{ margin: 0 }}>Beri Rating</h3>
          </div>
          <button className="btn btn-ghost btn-icon" onClick={handleClose}><X size={15} /></button>
        </div>

        {done ? (
          <div style={{ textAlign: 'center', padding: '1.5rem 0' }}>
            <div style={{ fontSize: '3rem', marginBottom: '.75rem' }}>⭐</div>
            <h4 style={{ margin: '0 0 .5rem' }}>Terima kasih!</h4>
            <p style={{ color: 'var(--muted)', fontSize: '.875rem', margin: '0 0 1.25rem' }}>
              Ulasanmu sangat berarti bagi kami.
            </p>
            <button className="btn btn-primary" onClick={handleClose} style={{ width: '100%', justifyContent: 'center' }}>Tutup</button>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <p style={{ margin: '0 0 1.125rem', fontSize: '.875rem', color: 'var(--text-sub)' }}>
              Bagaimana pengalaman berbelanja / menggunakan website ini?
            </p>

            {/* Stars */}
            <div style={{ display: 'flex', gap: '.5rem', justifyContent: 'center', marginBottom: '.375rem' }}>
              {[1,2,3,4,5].map(n => (
                <button
                  key={n} type="button"
                  onMouseEnter={() => setHov(n)}
                  onMouseLeave={() => setHov(0)}
                  onClick={() => setRating(n === rating ? 0 : n)}
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer', padding: '.1rem',
                    fontSize: '2.2rem', lineHeight: 1,
                    color: n <= (hov || rating) ? 'var(--warning)' : 'var(--border)',
                    transform: n <= (hov || rating) ? 'scale(1.15)' : 'scale(1)',
                    transition: 'all .15s',
                  }}
                >★</button>
              ))}
            </div>
            {(hov || rating) > 0 && (
              <div style={{ textAlign: 'center', fontSize: '.8rem', color: 'var(--warning)', fontWeight: 600, marginBottom: '1rem' }}>
                {LABELS[hov || rating]}
              </div>
            )}

            <div className="form-group" style={{ marginTop: '.75rem' }}>
              <label>Nama (opsional)</label>
              <input value={name} onChange={e => setName(e.target.value)} placeholder="Nama kamu" />
            </div>
            <div className="form-group">
              <label>Pesan / Ulasan (opsional)</label>
              <textarea value={feedback} onChange={e => setFeedback(e.target.value)} rows={3} placeholder="Ceritakan pengalamanmu..." style={{ resize: 'none' }} />
            </div>

            <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', marginTop: '.25rem' }} disabled={sending || !rating}>
              {sending ? <span className="spinner" style={{ width: 15, height: 15 }} /> : <Send size={15} />}
              {sending ? 'Mengirim...' : 'Kirim Ulasan'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
