import { Link, useLocation } from 'react-router-dom';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

export const prefersReducedMotion = () =>
  typeof window !== 'undefined' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* --------------------------- Companion Context --------------------------- */

const Ctx = createContext(null);

export function useCompanion() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useCompanion must be used inside CompanionProvider');
  return v;
}

export function CompanionProvider({ children }) {
  const [orbState, setOrbState] = useState('idle'); // idle | thinking | speaking | listening | urgent
  const [amplitude, setAmplitude] = useState(0);
  const [nodePulse, setNodePulse] = useState(0);
  const [soundPeak, setSoundPeak] = useState(0);
  const [muted, setMuted] = useState(false);
  const [listening, setListening] = useState(false);

  const speakingRef = useRef(false);
  const listeningRef = useRef(false);
  const ampRafRef = useRef(null);
  const recognitionRef = useRef(null);
  const audioCtxRef = useRef(null);
  const micSourceRef = useRef(null);
  const analyserRef = useRef(null);
  const lastPeakRef = useRef(0);
  const mutedRef = useRef(muted);
  useEffect(() => { mutedRef.current = muted; }, [muted]);

  const pickVoice = () => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return null;
    const voices = window.speechSynthesis.getVoices();
    const prefer = [
      'Samantha', 'Google UK English Female', 'Karen', 'Serena',
      'Victoria', 'Google US English', 'Microsoft Aria Online',
    ];
    for (const name of prefer) {
      const v = voices.find((x) => x.name.includes(name));
      if (v) return v;
    }
    return voices.find((v) => v.lang?.startsWith('en')) ?? voices[0] ?? null;
  };

  useEffect(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    const load = () => window.speechSynthesis.getVoices();
    load();
    window.speechSynthesis.onvoiceschanged = load;
  }, []);

  const cancelSpeech = useCallback(() => {
    try { window.speechSynthesis?.cancel(); } catch {}
    if (ampRafRef.current) cancelAnimationFrame(ampRafRef.current);
    ampRafRef.current = null;
    speakingRef.current = false;
    setAmplitude(0);
  }, []);

  const speak = useCallback((text) => {
    if (mutedRef.current) return;
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    try {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      const v = pickVoice();
      if (v) u.voice = v;
      u.rate = 0.98;
      u.pitch = 1.02;

      speakingRef.current = true;
      setOrbState('speaking');

      let target = 0.6;
      let current = 0;
      const loop = () => {
        current += (target - current) * 0.18;
        const jitter = (Math.random() - 0.5) * 0.12;
        setAmplitude(Math.max(0, Math.min(1, current + jitter)));
        target *= 0.94;
        ampRafRef.current = requestAnimationFrame(loop);
      };
      ampRafRef.current = requestAnimationFrame(loop);

      u.onboundary = (e) => {
        if (e.name === 'word' || e.charLength) target = 0.75 + Math.random() * 0.25;
      };
      u.onstart = () => { target = 0.7; };
      const finish = () => {
        speakingRef.current = false;
        if (ampRafRef.current) cancelAnimationFrame(ampRafRef.current);
        setAmplitude(0);
        setOrbState((s) => (s === 'speaking' ? 'idle' : s));
      };
      u.onend = finish;
      u.onerror = finish;

      window.speechSynthesis.speak(u);
    } catch {
      /* ignore */
    }
  }, []);

  const stopListening = useCallback(() => {
    listeningRef.current = false;
    try { recognitionRef.current?.stop(); } catch {}
    recognitionRef.current = null;
    if (ampRafRef.current) cancelAnimationFrame(ampRafRef.current);
    ampRafRef.current = null;
    try { micSourceRef.current?.mediaStream.getTracks().forEach((t) => t.stop()); } catch {}
    try { audioCtxRef.current?.close(); } catch {}
    analyserRef.current = null;
    audioCtxRef.current = null;
    micSourceRef.current = null;
    setListening(false);
    if (!speakingRef.current) setOrbState((s) => (s === 'listening' ? 'idle' : s));
  }, []);

  const startListening = useCallback(async (onTranscript) => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SR) {
      const rec = new SR();
      rec.continuous = true;
      rec.interimResults = true;
      rec.lang = 'en-US';
      rec.onresult = (e) => {
        let interim = '';
        let finalT = '';
        for (let i = e.resultIndex; i < e.results.length; i++) {
          const r = e.results[i];
          if (r.isFinal) finalT += r[0].transcript;
          else interim += r[0].transcript;
        }
        if (finalT) onTranscript(finalT.trim(), true);
        else if (interim) onTranscript(interim.trim(), false);
      };
      rec.onerror = () => stopListening();
      rec.onend = () => {
        if (listeningRef.current) {
          try { rec.start(); } catch { setListening(false); listeningRef.current = false; }
        }
      };
      recognitionRef.current = rec;
      try { rec.start(); } catch { /* already started */ }
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const AC = window.AudioContext || window.webkitAudioContext;
      const ctx = new AC();
      audioCtxRef.current = ctx;
      const src = ctx.createMediaStreamSource(stream);
      micSourceRef.current = src;
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 512;
      analyser.smoothingTimeConstant = 0.6;
      src.connect(analyser);
      analyserRef.current = analyser;
      const data = new Uint8Array(analyser.frequencyBinCount);
      const loop = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteTimeDomainData(data);
        let sum = 0;
        for (let i = 0; i < data.length; i++) {
          const v = (data[i] - 128) / 128;
          sum += v * v;
        }
        const rms = Math.sqrt(sum / data.length);
        const nowT = performance.now();
        if (rms > 0.09 && nowT - lastPeakRef.current > 260) {
          lastPeakRef.current = nowT;
          setSoundPeak((n) => n + 1);
        }
        ampRafRef.current = requestAnimationFrame(loop);
      };
      loop();
    } catch {
      /* mic denied */
    }

    listeningRef.current = true;
    setListening(true);
    setOrbState('listening');
  }, [stopListening]);

  const toggleMute = useCallback(() => {
    setMuted((m) => {
      const next = !m;
      if (next) cancelSpeech();
      return next;
    });
  }, [cancelSpeech]);

  const pulseOnce = useCallback(() => setNodePulse((n) => n + 1), []);

  useEffect(() => () => {
    stopListening();
    cancelSpeech();
  }, [stopListening, cancelSpeech]);

  const value = useMemo(
    () => ({
      orbState, setOrbState, amplitude, nodePulse, soundPeak, pulseOnce,
      muted, toggleMute, speak, cancelSpeech,
      startListening, stopListening, listening,
    }),
    [orbState, amplitude, nodePulse, soundPeak, pulseOnce, muted, toggleMute, speak, cancelSpeech, startListening, stopListening, listening],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

/* --------------------------- Orb --------------------------- */

export function Orb({ size = 92, className = '' }) {
  const { orbState, amplitude, nodePulse, soundPeak } = useCompanion();
  const orbRef = useRef(null);
  const stageRef = useRef(null);
  const [ripples, setRipples] = useState([]);
  const idleT = useRef(0);

  useEffect(() => {
    if (prefersReducedMotion()) return;
    let raf = 0;
    const tick = () => {
      idleT.current += 0.016;
      const el = orbRef.current;
      const stage = stageRef.current;
      if (el) {
        const t = idleT.current;
        if (stage) {
          const dx = Math.sin(t * 0.6) * 4;
          const dy = Math.cos(t * 0.45) * 3;
          stage.style.transform = `translate(${dx}px, ${dy}px)`;
        }
        if (orbState === 'idle') {
          const s = 1 + Math.sin(t * 1.4) * 0.04;
          const hue = Math.sin(t * 0.35) * 6;
          el.style.transform = `scale(${s})`;
          el.style.filter = `blur(0.3px) saturate(1.1) hue-rotate(${hue}deg)`;
          el.style.borderRadius = '50%';
        } else if (orbState === 'thinking' || orbState === 'urgent') {
          const speed = orbState === 'urgent' ? 6.2 : 4.2;
          const s = 1 + Math.sin(t * speed) * 0.07;
          el.style.transform = `scale(${s})`;
          el.style.filter = `blur(0.3px) saturate(1.25) hue-rotate(${Math.sin(t * 1.5) * 14}deg)`;
          el.style.borderRadius = '50%';
        } else if (orbState === 'speaking') {
          const a = amplitude;
          const s = 1 + 0.03 + a * 0.14;
          const r1 = 50 + Math.sin(t * 9) * a * 22;
          const r2 = 50 + Math.cos(t * 11) * a * 22;
          const r3 = 50 + Math.sin(t * 7 + 1.2) * a * 22;
          const r4 = 50 + Math.cos(t * 8 + 0.7) * a * 22;
          el.style.transform = `scale(${s})`;
          el.style.borderRadius = `${r1}% ${r2}% ${r3}% ${r4}% / ${r2}% ${r3}% ${r4}% ${r1}%`;
          el.style.filter = `blur(0.3px) saturate(${1.1 + a * 0.4}) hue-rotate(${a * 20}deg)`;
        } else if (orbState === 'listening') {
          const s = 1 + Math.sin(t * 3) * 0.05;
          el.style.transform = `scale(${s})`;
          el.style.filter = 'blur(0.3px) saturate(1.3) brightness(1.15)';
          el.style.borderRadius = '50%';
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [orbState, amplitude]);

  useEffect(() => {
    if (!nodePulse || prefersReducedMotion()) return;
    const el = orbRef.current;
    if (!el) return;
    el.animate(
      [{ transform: 'scale(1)' }, { transform: 'scale(1.16)' }, { transform: 'scale(1)' }],
      { duration: 620, easing: 'cubic-bezier(.2,.7,.2,1)' },
    );
  }, [nodePulse]);

  useEffect(() => {
    if (!soundPeak || prefersReducedMotion()) return;
    const id = Date.now() + Math.random();
    setRipples((r) => [...r, id]);
    const t = setTimeout(() => setRipples((r) => r.filter((x) => x !== id)), 1700);
    return () => clearTimeout(t);
  }, [soundPeak]);

  const wrapSize = size + 40;

  return (
    <div className={`orb-wrap ${className}`} style={{ height: wrapSize }}>
      <div className="orb-stage orb-in" ref={stageRef} style={{ width: size + 30, height: size + 30 }}>
        <div className={`orb-ring ${orbState === 'thinking' || orbState === 'urgent' ? 'active' : ''} ${orbState === 'urgent' ? 'urgent' : ''}`} />
        {ripples.map((r) => (
          <div key={r} className="orb-ripple" />
        ))}
        <div
          ref={orbRef}
          className={`orb ${orbState === 'listening' ? 'listening' : ''} ${orbState === 'urgent' ? 'urgent' : ''}`}
          style={{ width: size, height: size }}
          aria-hidden="true"
        />
        <RobotFigure size={size} state={orbState} amplitude={amplitude} />
      </div>
    </div>
  );
}

/* --------------------------- Robot Figure --------------------------- */

function RobotFigure({ size, state, amplitude }) {
  const robotSize = Math.round(size * 0.72);
  const mouthScale = state === 'speaking' ? 1 + amplitude * 0.8 : 1;
  return (
    <div
      className={`robot-figure robot-${state}`}
      style={{ width: robotSize, height: robotSize }}
      aria-label="Chronos companion"
      role="img"
    >
      <svg viewBox="0 0 100 100" width={robotSize} height={robotSize}>
        <defs>
          <linearGradient id="rob-body" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor="#f4ecff" />
            <stop offset="1" stopColor="#c9b8e6" />
          </linearGradient>
          <linearGradient id="rob-visor" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor="#241a30" />
            <stop offset="1" stopColor="#3a2954" />
          </linearGradient>
        </defs>
        <line x1="50" y1="14" x2="50" y2="24" stroke="#ede7f6" strokeWidth="2.4" strokeLinecap="round" />
        <circle className="robot-antenna-tip" cx="50" cy="12" r="3.2" fill="#ff9d6c" />
        <rect x="22" y="24" width="56" height="46" rx="16" fill="url(#rob-body)" stroke="rgba(24,18,32,0.25)" strokeWidth="1" />
        <rect x="16" y="38" width="8" height="18" rx="4" fill="#c9b8e6" />
        <rect x="76" y="38" width="8" height="18" rx="4" fill="#c9b8e6" />
        <rect x="30" y="34" width="40" height="22" rx="11" fill="url(#rob-visor)" />
        <circle className="robot-eye robot-eye-l" cx="42" cy="45" r="3.4" fill="#7ad9c9" />
        <circle className="robot-eye robot-eye-r" cx="58" cy="45" r="3.4" fill="#7ad9c9" />
        <circle cx="42.8" cy="44.2" r="1" fill="#fff" opacity="0.9" />
        <circle cx="58.8" cy="44.2" r="1" fill="#fff" opacity="0.9" />
        <circle cx="30" cy="60" r="3" fill="#ff9d6c" opacity="0.55" />
        <circle cx="70" cy="60" r="3" fill="#ff9d6c" opacity="0.55" />
        <rect
          x={50 - 6 * mouthScale}
          y={62 - 1.5 * mouthScale}
          width={12 * mouthScale}
          height={3 * mouthScale}
          rx="1.5"
          fill="#241a30"
        />
        <rect x="34" y="72" width="32" height="14" rx="7" fill="url(#rob-body)" stroke="rgba(24,18,32,0.2)" strokeWidth="1" />
        <circle cx="50" cy="79" r="2.4" fill="#c98bff" />
      </svg>
    </div>
  );
}

/* --------------------------- Presence Field --------------------------- */

export function PresenceField() {
  const aRef = useRef(null);
  const bRef = useRef(null);
  const cRef = useRef(null);
  const { orbState } = useCompanion();

  useEffect(() => {
    if (prefersReducedMotion()) return;
    let raf = 0;
    let t = 0;
    const tick = () => {
      t += 0.006;
      if (aRef.current) aRef.current.style.transform = `translate(${Math.sin(t * 0.7) * 40}px, ${Math.cos(t * 0.5) * 30}px)`;
      if (bRef.current) bRef.current.style.transform = `translate(${Math.cos(t * 0.4 + 1.1) * 50}px, ${Math.sin(t * 0.6 + 0.7) * 40}px)`;
      if (cRef.current) cRef.current.style.transform = `translate(${Math.sin(t * 0.55 + 2.3) * 45}px, ${Math.cos(t * 0.35 + 1.9) * 35}px)`;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div className={`presence-field ${orbState === 'urgent' ? 'urgent' : ''}`} aria-hidden="true">
      <div ref={aRef} className="blob blob-a" />
      <div ref={bRef} className="blob blob-b" />
      <div ref={cRef} className="blob blob-c" />
    </div>
  );
}

/* --------------------------- Wandering Companion --------------------------- */

export function WanderingCompanion() {
  const ref = useRef(null);
  const trailRef = useRef(null);
  const { orbState, nodePulse } = useCompanion();

  useEffect(() => {
    if (prefersReducedMotion()) return;
    let raf = 0;
    let t = Math.random() * 100;
    const tick = () => {
      t += 0.004;
      const w = window.innerWidth;
      const h = window.innerHeight;
      const x = w * 0.5 + Math.sin(t * 0.7) * w * 0.32 + Math.sin(t * 0.23 + 1.3) * w * 0.12;
      const y = h * 0.55 + Math.cos(t * 0.5 + 0.4) * h * 0.32 + Math.sin(t * 0.19 + 2.1) * h * 0.1;
      if (ref.current) ref.current.style.transform = `translate3d(${x}px, ${y}px, 0)`;
      if (trailRef.current) {
        const tx = w * 0.5 + Math.sin((t - 0.08) * 0.7) * w * 0.32 + Math.sin((t - 0.08) * 0.23 + 1.3) * w * 0.12;
        const ty = h * 0.55 + Math.cos((t - 0.08) * 0.5 + 0.4) * h * 0.32 + Math.sin((t - 0.08) * 0.19 + 2.1) * h * 0.1;
        trailRef.current.style.transform = `translate3d(${tx}px, ${ty}px, 0)`;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  useEffect(() => {
    if (!nodePulse || prefersReducedMotion()) return;
    ref.current?.animate(
      [{ transform: ref.current.style.transform + ' scale(1)' }, { transform: ref.current.style.transform + ' scale(1.6)' }],
      { duration: 600, easing: 'cubic-bezier(.2,.7,.2,1)' },
    );
  }, [nodePulse]);

  return (
    <>
      <div ref={trailRef} className={`mote mote-trail ${orbState}`} aria-hidden="true" />
      <div ref={ref} className={`runner runner-${orbState}`} aria-hidden="true">
        <svg viewBox="0 0 60 70" width="44" height="52" className="runner-svg">
          <defs>
            <linearGradient id="run-body" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0" stopColor="#f4ecff" />
              <stop offset="1" stopColor="#c9b8e6" />
            </linearGradient>
          </defs>
          <line x1="30" y1="2" x2="30" y2="10" stroke="#ede7f6" strokeWidth="1.6" strokeLinecap="round" />
          <circle cx="30" cy="2" r="2" fill="#ff9d6c" />
          <rect x="14" y="9" width="32" height="26" rx="9" fill="url(#run-body)" stroke="rgba(24,18,32,0.3)" strokeWidth="0.8" />
          <rect x="18" y="15" width="24" height="12" rx="6" fill="#241a30" />
          <circle cx="25" cy="21" r="2" fill="#7ad9c9" />
          <circle cx="35" cy="21" r="2" fill="#7ad9c9" />
          <rect x="19" y="35" width="22" height="14" rx="6" fill="url(#run-body)" stroke="rgba(24,18,32,0.25)" strokeWidth="0.8" />
          <rect className="runner-arm runner-arm-l" x="10" y="36" width="6" height="12" rx="3" fill="#c9b8e6" />
          <rect className="runner-arm runner-arm-r" x="44" y="36" width="6" height="12" rx="3" fill="#c9b8e6" />
          <rect className="runner-leg runner-leg-l" x="20" y="48" width="7" height="16" rx="3" fill="#c9b8e6" />
          <rect className="runner-leg runner-leg-r" x="33" y="48" width="7" height="16" rx="3" fill="#c9b8e6" />
          <ellipse cx="30" cy="67" rx="14" ry="1.6" fill="#000" opacity="0.25" />
        </svg>
      </div>
    </>
  );
}

/* --------------------------- Top Bar --------------------------- */

function useClock() {
  const [now, setNow] = useState('');
  useEffect(() => {
    const fmt = () => {
      const d = new Date();
      const day = d.toLocaleDateString([], { weekday: 'long' });
      const time = d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
      setNow(`${day}, ${time}`);
    };
    fmt();
    const id = setInterval(fmt, 30_000);
    return () => clearInterval(id);
  }, []);
  return now;
}

export function TopBar({ subtitle }) {
  const { muted, toggleMute } = useCompanion();
  const now = useClock();
  return (
    <header className="top">
      <Link to="/dashboard" className="wordmark">Chronos</Link>
      <div className="time-chip">
        <span>{subtitle ?? `${now || 'Sunday'} · Delhi`}</span>
        <button
          className={`mute-btn ${muted ? 'on' : ''}`}
          onClick={toggleMute}
          aria-pressed={muted}
          aria-label={muted ? 'Unmute voice' : 'Mute voice'}
        >
          {muted ? 'Voice off' : 'Voice on'}
        </button>
      </div>
    </header>
  );
}

/* --------------------------- Bottom Nav --------------------------- */

const NAV = [
  {
    to: '/dashboard',
    label: 'Today',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="4" />
        <circle cx="12" cy="12" r="9" opacity=".4" />
      </svg>
    ),
  },
  {
    to: '/converse',
    label: 'Talk',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.4A8 8 0 1 1 21 12z" />
      </svg>
    ),
  },
  {
    to: '/rescue',
    label: 'Rescue',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 3l2.5 5 5.5.7-4 3.8 1 5.5L12 15.5 7 18l1-5.5-4-3.8L9.5 8z" />
      </svg>
    ),
  },
];

export function BottomNav() {
  const path = useLocation().pathname;
  if (path === '/welcome') return null;
  return (
    <nav className="bottom-nav" aria-label="Chronos sections">
      <div className="bottom-nav-inner">
        {NAV.map((n) => {
          const active = path.startsWith(n.to);
          return (
            <Link key={n.to} to={n.to} className={`nav-item ${active ? 'active' : ''}`}>
              <span className="nav-icon">{n.icon}</span>
              <span className="nav-label">{n.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
