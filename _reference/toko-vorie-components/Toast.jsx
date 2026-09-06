import { useStore } from '../lib/useStore';
import { CheckCircle, XCircle, AlertTriangle, Info } from 'lucide-react';

const ICONS = {
  success: CheckCircle,
  error:   XCircle,
  warning: AlertTriangle,
  info:    Info,
};
const COLORS = {
  success: 'var(--success)',
  error:   'var(--danger)',
  warning: 'var(--warning)',
  info:    'var(--info)',
};
const TITLES = { success: 'Berhasil!', error: 'Error!', warning: 'Perhatian!', info: 'Info' };

export default function ToastContainer() {
  const { toasts } = useStore();
  return (
    <div className="toast-container">
      {toasts.map(t => {
        const Icon = ICONS[t.type] ?? Info;
        return (
          <div key={t.id} className={`toast toast-${t.type} show`}>
            <Icon size={18} style={{ color: COLORS[t.type], flexShrink: 0 }} />
            <div>
              <strong style={{ display: 'block', fontSize: '.84rem', fontWeight: 700 }}>
                {TITLES[t.type] ?? 'Info'}
              </strong>
              <span style={{ fontSize: '.78rem', color: 'var(--muted)' }}>{t.msg}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
