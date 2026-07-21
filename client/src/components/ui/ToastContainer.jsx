import { useToast } from '../../context/ToastContext.jsx';

const COLORS = {
  success: { bg: 'rgba(0,255,136,0.1)',  border: 'rgba(0,255,136,0.4)',  text: '#00FF88' },
  error:   { bg: 'rgba(255,51,102,0.13)',border: 'rgba(255,51,102,0.4)', text: '#FF3366' },
  info:    { bg: 'rgba(0,212,255,0.13)', border: 'rgba(0,212,255,0.4)', text: '#00D4FF' },
};

export default function ToastContainer() {
  const { toasts } = useToast();

  return (
    <div style={{
      position: 'fixed', bottom: 24, right: 24, zIndex: 400,
      display: 'flex', flexDirection: 'column', gap: 8,
    }}>
      {toasts.map(t => {
        const c = COLORS[t.type] || COLORS.info;
        return (
          <div key={t.id} style={{
            padding: '12px 16px', borderRadius: 10, border: `1px solid ${c.border}`,
            background: c.bg, color: c.text,
            fontFamily: 'JetBrains Mono', fontSize: 12,
            backdropFilter: 'blur(12px)', maxWidth: 300, lineHeight: 1.4,
            animation: 'slideInRight 0.3s ease',
          }}>
            {t.message}
          </div>
        );
      })}
      <style>{`
        @keyframes slideInRight {
          from { opacity: 0; transform: translateX(16px); }
          to   { opacity: 1; transform: translateX(0); }
        }
      `}</style>
    </div>
  );
}
