export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: '#ff6b35',
        'primary-hover': '#e85a2b',
        'primary/20': 'rgba(255, 107, 53, 0.2)',
        dark: '#0f0f12',
        surface: '#18181c',
        'surface-elevated': '#222228',
        card: '#1e1e24',
        'card-hover': '#26262e',
        border: '#2d2d35',
        muted: '#71717a',
        'muted-light': '#a1a1aa',
      },
      boxShadow: {
        card: '0 2px 8px rgba(0,0,0,0.3), 0 1px 2px rgba(0,0,0,0.2)',
        'card-hover': '0 4px 16px rgba(0,0,0,0.35), 0 2px 4px rgba(0,0,0,0.2)',
        header: '0 1px 0 rgba(255,255,255,0.06)',
        nav: '0 -1px 0 rgba(255,255,255,0.06)',
      },
      borderRadius: {
        card: '0.75rem',
        'card-lg': '1rem',
        button: '0.5rem',
        pill: '9999px',
      },
      keyframes: {
        fadeIn: { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
        slideUp: { '0%': { opacity: '0', transform: 'translateY(8px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
        pulseSoft: { '0%, 100%': { opacity: '1' }, '50%': { opacity: '0.85' } },
      },
      animation: {
        'fade-in': 'fadeIn 0.25s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'pulse-soft': 'pulseSoft 1.5s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}
