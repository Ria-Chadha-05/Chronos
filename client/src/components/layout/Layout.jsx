import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useChronos } from '../../context/ChronosContext.jsx';
import { useDemo }    from '../../context/DemoContext.jsx';
import GoogleAuthButton from '../ui/GoogleAuthButton.jsx';
import DemoModeToggle   from '../demo/DemoModeToggle.jsx';
import DemoBadge        from '../demo/DemoBadge.jsx';

const TABS = [
  { path: '/dashboard', label: 'TODAY',  icon: '⬡' },
  { path: '/converse',  label: 'TALK',   icon: '⚡' },
  { path: '/rescue',    label: 'RESCUE', icon: '⚠' },
];

export default function Layout({ children }) {
  const { pathname } = useLocation();
  const navigate     = useNavigate();
  const { lifeMode } = useChronos();
  const { isDemoMode, toggleDemoMode } = useDemo();

  return (
    <div style={{ position: 'relative', zIndex: 2, minHeight: '100vh' }}>
      {/* ── Desktop Nav ───────────────────────────────────────────────────── */}
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, height: 62,
        background: 'rgba(5,10,20,0.9)', backdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(0,212,255,0.12)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 24px', zIndex: 100,
      }}>
        {/* Brand */}
        <div
          onClick={() => navigate('/dashboard')}
          style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}
        >
          <div style={{
            width: 34, height: 34, border: '1.5px solid var(--cyan)',
            borderRadius: 8, display: 'grid', placeItems: 'center',
            fontFamily: 'Orbitron, monospace', fontWeight: 900,
            color: 'var(--cyan)', fontSize: 14,
            boxShadow: '0 0 16px rgba(0,212,255,0.13)',
          }}>C</div>
          <div>
            <div style={{ fontFamily: 'Orbitron', fontSize: 16, fontWeight: 700, letterSpacing: '0.15em', color: 'var(--cyan)', textShadow: '0 0 20px rgba(0,212,255,0.35)' }}>
              CHRONOS
            </div>
            <div style={{ fontFamily: 'JetBrains Mono', fontSize: 9, color: 'var(--muted)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              AI Life Negotiator · {lifeMode}
            </div>
          </div>
        </div>

        {/* Desktop Tabs */}
        <div style={{ display: 'flex', gap: 3, alignItems: 'center' }} className="hidden-mobile">
          {TABS.map(tab => {
            const active = pathname === tab.path;
            return (
              <button
                key={tab.path}
                onClick={() => navigate(tab.path)}
                title={tab.label}
                className="cos-button"
                style={{
                  padding: '7px 14px', borderRadius: 10,
                  border: `1px solid ${active ? 'rgba(0,212,255,0.28)' : 'transparent'}`,
                  background: active ? 'rgba(0,212,255,0.13)' : 'transparent',
                  color: active ? 'var(--cyan)' : 'var(--muted)',
                  fontFamily: 'Orbitron', fontSize: 9, fontWeight: 700,
                  letterSpacing: '0.1em', cursor: 'pointer',
                  textTransform: 'uppercase',
                  transition: 'color 220ms cubic-bezier(0.16,1,0.3,1), background 220ms cubic-bezier(0.16,1,0.3,1), border-color 220ms cubic-bezier(0.16,1,0.3,1), box-shadow 220ms ease',
                  boxShadow: active ? '0 0 14px rgba(0,212,255,0.13)' : 'none',
                }}>
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Right side */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <DemoModeToggle
            isDemoMode={isDemoMode}
            onToggle={() => toggleDemoMode()}
            className="hidden-mobile"
          />
          {!isDemoMode && <GoogleAuthButton />}
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontFamily: 'JetBrains Mono', fontSize: 10, color: isDemoMode ? 'var(--cyan)' : 'var(--green)' }}>
            <div className="status-blink" style={{ width: 7, height: 7, borderRadius: '50%', background: isDemoMode ? 'var(--cyan)' : 'var(--green)', boxShadow: isDemoMode ? '0 0 8px var(--cyan)' : '0 0 8px var(--green)' }} />
            {isDemoMode ? 'DEMO' : 'GEMINI ONLINE'}
          </div>
        </div>
      </nav>

      {/* ── Demo Badge ────────────────────────────────────────────────────── */}
      {isDemoMode && (
        <div style={{ position: 'fixed', top: 70, right: 24, zIndex: 99 }}>
          <DemoBadge size="sm" showSubline={false} />
        </div>
      )}

      {/* ── Main ──────────────────────────────────────────────────────────── */}
      <main style={{ paddingTop: 62, minHeight: '100vh', paddingBottom: 74 }}>
        <div key={pathname} className="screen-enter" style={{ minHeight: 'calc(100vh - 62px)', padding: '28px 24px' }}>
          {children}
        </div>
      </main>

      {/* ── Mobile Bottom Nav (scrollable row) ────────────────────────────── */}
      <nav style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, height: 64,
        background: 'rgba(5,10,20,0.96)', backdropFilter: 'blur(20px)',
        borderTop: '1px solid rgba(0,212,255,0.12)', zIndex: 100,
        display: 'flex', alignItems: 'center',
        overflowX: 'auto', padding: '0 6px',
        gap: 2,
      }}>
        {/* Demo toggle pill */}
        <div style={{ flexShrink: 0, padding: '4px 8px' }}>
          <DemoModeToggle isDemoMode={isDemoMode} onToggle={() => toggleDemoMode()} />
        </div>

        {TABS.map(tab => {
          const active = pathname === tab.path;
          return (
            <button
              key={tab.path}
              onClick={() => navigate(tab.path)}
              title={tab.label}
              className="cos-button"
              style={{
                flexShrink: 0,
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
                padding: '6px 10px', border: 'none',
                background: active ? 'rgba(0,212,255,0.09)' : 'transparent',
                color: active ? 'var(--cyan)' : 'var(--dim)',
                fontFamily: 'JetBrains Mono', fontSize: 7, letterSpacing: '0.05em',
                cursor: 'pointer', borderRadius: 8,
                transition: 'color 220ms cubic-bezier(0.16,1,0.3,1), background 220ms cubic-bezier(0.16,1,0.3,1)',
                minWidth: 44,
              }}>
              <span style={{ fontSize: 15, lineHeight: 1, transition: 'transform 150ms cubic-bezier(0.16,1,0.3,1)' }}>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
