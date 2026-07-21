import { useEffect, useState } from 'react';

// Module-level pub-sub so any module can call showLoading/hideLoading
let _listeners = [];
let _state = { on: false, text: '', sub: '' };

export function showLoading(text = 'CHRONOS PROCESSING', sub = '') {
  _state = { on: true, text, sub };
  _listeners.forEach(fn => fn(_state));
}
export function hideLoading() {
  _state = { on: false, text: '', sub: '' };
  _listeners.forEach(fn => fn(_state));
}

export default function LoadingOverlay() {
  const [state, setState] = useState(_state);
  useEffect(() => {
    _listeners.push(setState);
    return () => { _listeners = _listeners.filter(f => f !== setState); };
  }, []);

  if (!state.on) return null;
  return (
    <div style={{ position:'fixed',inset:0,background:'rgba(5,10,20,0.88)',backdropFilter:'blur(10px)',zIndex:300,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:18 }}>
      <div style={{ width:52,height:52,borderRadius:'50%',border:'2px solid rgba(0,212,255,0.12)',borderTopColor:'#00D4FF',animation:'spin .8s linear infinite',boxShadow:'0 0 28px rgba(0,212,255,0.35)' }}/>
      <div style={{ fontFamily:'Orbitron,monospace',fontSize:13,letterSpacing:'0.2em',color:'#00D4FF' }}>{state.text}</div>
      <div style={{ fontFamily:'JetBrains Mono,monospace',fontSize:10,color:'#7A9ABB',textAlign:'center' }}>{state.sub}</div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
