/**
 * GoogleAuthButton.jsx
 *
 * This component is the only part of the UI layer that touches authentication.
 * It handles three states:
 *
 *   1. Signed out   → "Connect Google" button (triggers signIn)
 *   2. Signed in, token valid → status pill + dropdown
 *   3. Signed in, token missing/expired → "Reconnect Calendar" affordance
 *
 * State 3 is new. It surfaces cleanly when getAccessToken() returns null
 * (e.g. after the sessionStorage is cleared on tab close, or after the 1-hour
 * token lifetime). The user clicks "Reconnect Calendar", which calls
 * reconnectCalendar() — a gesture-bound popup that re-issues the token without
 * requiring a full sign-out/sign-in cycle.
 *
 * NOTHING downstream changes. CalendarService and CommitmentContext behave
 * identically; they just get a valid token on the next attempt after reconnect.
 */

import React, { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';

export default function GoogleAuthButton() {
  const { user, loading, signIn, signOut, getAccessToken, reconnectCalendar } = useAuth();

  const [busy,          setBusy]          = useState(false);
  const [showDropdown,  setShowDropdown]  = useState(false);
  const [tokenReady,    setTokenReady]    = useState(false);
  const [reconnecting,  setReconnecting]  = useState(false);

  // Check whether a valid token exists whenever the user state changes.
  // We don't need to poll — the token either exists in sessionStorage or it
  // doesn't. This runs once on mount and once on sign-in.
  useEffect(() => {
    if (!user) { setTokenReady(false); return; }

    let cancelled = false;
    getAccessToken().then((token) => {
      if (!cancelled) setTokenReady(!!token);
    });

    return () => { cancelled = true; };
  }, [user, getAccessToken]);

  const handleSignIn = async () => {
    try {
      setBusy(true);
      await signIn();
      // After signIn(), token is stored. Update local indicator.
      const token = await getAccessToken();
      setTokenReady(!!token);
    } catch (e) {
      console.error('[Chronos Auth]', e.message);
    } finally {
      setBusy(false);
    }
  };

  const handleReconnect = useCallback(async () => {
    // reconnectCalendar() opens a GIS popup — must be called from a click handler.
    try {
      setReconnecting(true);
      await reconnectCalendar();
      setTokenReady(true);
    } catch (e) {
      console.error('[Chronos Auth] Reconnect failed:', e.message);
    } finally {
      setReconnecting(false);
    }
  }, [reconnectCalendar]);

  if (loading) return null;

  /* ── Signed out ─────────────────────────────────────────── */
  if (!user) {
    return (
      <button
        onClick={handleSignIn}
        disabled={busy}
        title="Sign in with Google"
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 7,
          padding: '6px 13px', borderRadius: 10,
          border: '1px solid rgba(0,212,255,0.28)',
          background: 'rgba(0,212,255,0.08)',
          color: '#00D4FF',
          fontFamily: 'Orbitron, monospace', fontSize: 9,
          fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase',
          cursor: busy ? 'not-allowed' : 'pointer',
          opacity: busy ? 0.5 : 1, transition: 'all 0.2s', whiteSpace: 'nowrap',
        }}
      >
        <GoogleMark size={13} />
        {busy ? 'Connecting…' : 'Connect Google'}
      </button>
    );
  }

  /* ── Signed in, token missing / expired — reconnect affordance ── */
  if (!tokenReady) {
    return (
      <button
        onClick={handleReconnect}
        disabled={reconnecting}
        title="Calendar access expired — click to reconnect"
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 7,
          padding: '6px 13px', borderRadius: 10,
          border: '1px solid rgba(255,165,0,0.4)',
          background: 'rgba(255,165,0,0.08)',
          color: '#FFA500',
          fontFamily: 'Orbitron, monospace', fontSize: 9,
          fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase',
          cursor: reconnecting ? 'not-allowed' : 'pointer',
          opacity: reconnecting ? 0.5 : 1, transition: 'all 0.2s', whiteSpace: 'nowrap',
        }}
      >
        <GoogleMark size={13} />
        {reconnecting ? 'Reconnecting…' : 'Reconnect Calendar'}
      </button>
    );
  }

  /* ── Signed in, token valid ─────────────────────────────── */
  return (
    <div style={{ position: 'relative' }}>

      {/* Trigger pill */}
      <button
        onClick={() => setShowDropdown(d => !d)}
        title={user.email}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          padding: '5px 10px 5px 6px', borderRadius: 10,
          border: '1px solid rgba(0,255,136,0.3)',
          background: 'rgba(0,255,136,0.07)',
          color: '#00FF88',
          fontFamily: 'JetBrains Mono, monospace', fontSize: 10,
          cursor: 'pointer', transition: 'all 0.2s', whiteSpace: 'nowrap',
        }}
      >
        {user.photoURL ? (
          <img src={user.photoURL} alt="" referrerPolicy="no-referrer"
            style={{ width: 20, height: 20, borderRadius: '50%', border: '1.5px solid rgba(0,255,136,0.5)', flexShrink: 0 }} />
        ) : (
          <InitialAvatar name={user.displayName || user.email} />
        )}

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 1 }}>
          <span style={{ fontSize: 9, fontFamily: 'Orbitron, monospace', fontWeight: 700, letterSpacing: '0.08em', color: '#00FF88' }}>
            GOOGLE CONNECTED
          </span>
          <span style={{ fontSize: 8, color: 'rgba(0,255,136,0.55)', letterSpacing: '0.04em' }}>
            Calendar · Gmail
          </span>
        </div>

        <span style={{ fontSize: 8, opacity: 0.5, marginLeft: 2 }}>▾</span>
      </button>

      {/* Dropdown */}
      {showDropdown && (
        <>
          <div onClick={() => setShowDropdown(false)}
            style={{ position: 'fixed', inset: 0, zIndex: 199 }} />

          <div style={{
            position: 'absolute', top: 'calc(100% + 8px)', right: 0,
            minWidth: 220,
            background: '#0D1628',
            border: '1px solid rgba(0,212,255,0.15)',
            borderRadius: 14, padding: 14, zIndex: 200,
            boxShadow: '0 8px 40px rgba(0,0,0,0.55)',
          }}>

            {/* User identity */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
              {user.photoURL ? (
                <img src={user.photoURL} alt="" referrerPolicy="no-referrer"
                  style={{ width: 32, height: 32, borderRadius: '50%', border: '2px solid rgba(0,255,136,0.4)', flexShrink: 0 }} />
              ) : (
                <InitialAvatar name={user.displayName || user.email} size={32} />
              )}
              <div>
                <div style={{ fontWeight: 600, fontSize: 13, color: '#E8F4FF', marginBottom: 1 }}>
                  {user.displayName}
                </div>
                <div style={{ fontFamily: 'JetBrains Mono', fontSize: 10, color: '#7A9ABB' }}>
                  {user.email}
                </div>
              </div>
            </div>

            {/* Service status grid */}
            <div style={{
              padding: '10px 12px', marginBottom: 10,
              background: 'rgba(0,0,0,0.3)',
              border: '1px solid rgba(0,212,255,0.08)',
              borderRadius: 10,
              display: 'grid', gap: 7,
            }}>
              <StatusRow label="Google Account" status="connected" />
              <StatusRow label="Calendar"       status="ready"     />
              <StatusRow label="Gmail"          status="ready"     />
            </div>

            {/* Sign out */}
            <button
              onClick={async () => { setShowDropdown(false); await signOut(); }}
              style={{
                width: '100%', padding: '8px 10px', borderRadius: 8,
                border: '1px solid rgba(255,51,102,0.25)',
                background: 'rgba(255,51,102,0.07)',
                color: '#FF3366',
                fontFamily: 'Orbitron, monospace', fontSize: 9,
                fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase',
                cursor: 'pointer', textAlign: 'center', transition: 'all 0.2s',
              }}
            >
              Disconnect
            </button>

          </div>
        </>
      )}
    </div>
  );
}

/* ── Sub-components ──────────────────────────────────────────── */

function InitialAvatar({ name = '?', size = 20 }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0,
      background: 'rgba(0,255,136,0.15)', border: '1.5px solid rgba(0,255,136,0.4)',
      display: 'grid', placeItems: 'center',
      fontSize: size * 0.45, fontWeight: 700, color: '#00FF88',
    }}>
      {name[0].toUpperCase()}
    </div>
  );
}

const STATUS_META = {
  connected: { dot: '#00FF88', glow: 'rgba(0,255,136,0.5)', label: 'Connected' },
  ready:     { dot: '#00D4FF', glow: 'rgba(0,212,255,0.5)', label: 'Ready'     },
  error:     { dot: '#FF3366', glow: 'rgba(255,51,102,0.5)', label: 'Error'    },
};

function StatusRow({ label, status }) {
  const m = STATUS_META[status] || STATUS_META.ready;
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <span style={{ fontFamily: 'JetBrains Mono', fontSize: 10, color: '#7A9ABB' }}>{label}</span>
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
        <span style={{
          width: 6, height: 6, borderRadius: '50%',
          background: m.dot, boxShadow: `0 0 6px ${m.glow}`,
          animation: 'statusBlink 2s ease-in-out infinite',
          display: 'inline-block',
        }} />
        <span style={{ fontFamily: 'JetBrains Mono', fontSize: 9, color: m.dot }}>{m.label}</span>
      </span>
    </div>
  );
}

function GoogleMark({ size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  );
}
