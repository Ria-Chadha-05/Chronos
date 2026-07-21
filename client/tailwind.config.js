/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['Orbitron', 'monospace'],
        body: ['Inter', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      colors: {
        void:    '#050A14',
        deep:    '#080F1E',
        surface: '#0D1628',
        raised:  '#111D35',
        cyan:    '#00D4FF',
        amber:   '#FF8C00',
        red:     '#FF3366',
        green:   '#00FF88',
        purple:  '#9B59FF',
        muted:   '#7A9ABB',
        dim:     '#3D5A7A',
      },
      animation: {
        'pulse-dot': 'pulseDot 2s ease-in-out infinite',
        'spine':     'spineGlow 3s ease-in-out infinite',
        'conflict':  'conflictPulse 1s ease-in-out infinite',
        'slide-in':  'slideIn 0.35s ease forwards',
        'fade-up':   'fadeUp 0.35s ease forwards',
        'trace-in':  'traceIn 0.4s ease forwards',
        'spin-slow': 'spin 0.8s linear infinite',
      },
      keyframes: {
        pulseDot:     { '0%,100%': { opacity: 1 }, '50%': { opacity: 0.4 } },
        spineGlow:    { '50%': { opacity: 0.4 }, '0%,100%': { opacity: 0 } },
        conflictPulse:{ '50%': { boxShadow: '0 0 0 4px rgba(255,51,102,0.2)' } },
        slideIn:      { from: { opacity: 0, transform: 'translateX(-10px)' }, to: { opacity: 1, transform: 'translateX(0)' } },
        fadeUp:       { from: { opacity: 0, transform: 'translateY(10px)' }, to: { opacity: 1, transform: 'translateY(0)' } },
        traceIn:      { to: { opacity: 1, transform: 'translateX(0)' } },
      },
      boxShadow: {
        'cyan':   '0 0 20px rgba(0,212,255,0.35)',
        'green':  '0 0 20px rgba(0,255,136,0.35)',
        'red':    '0 0 20px rgba(255,51,102,0.35)',
        'amber':  '0 0 20px rgba(255,140,0,0.35)',
        'purple': '0 0 20px rgba(155,89,255,0.35)',
      },
    },
  },
  plugins: [],
};
