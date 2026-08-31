/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        terra: {
          50:  '#fdf4ef',
          100: '#fae4d3',
          200: '#f5c6a5',
          300: '#eda070',
          400: '#e8734a',
          500: '#d95a2e',
          600: '#bb4423',
          700: '#963422',
          800: '#7a2d22',
          900: '#642820',
        },
        forest: {
          50:  '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          300: '#cbd5e1',
          400: '#94a3b8',
          500: '#64748b',
          600: '#475569',
          700: '#334155',
          800: '#1e293b',
          900: '#0f172a',
          950: '#020617',
        },
        cream: {
          50:  '#fefdf9',
          100: '#fdf8f0',
          200: '#faf0de',
          300: '#f5e2c0',
        }
      },
      fontFamily: {
        display: ['Inter', '"Segoe UI"', 'system-ui', 'sans-serif'],
        body:    ['Inter', '"Segoe UI"', 'system-ui', 'sans-serif'],
      },
      animation: {
        'fade-up':    'fadeUp 0.5s ease forwards',
        'fade-in':    'fadeIn 0.4s ease forwards',
        'slide-in':   'slideIn 0.3s ease forwards',
        'pulse-soft': 'pulseSoft 2s ease-in-out infinite',
        'shimmer':    'shimmer 1.5s infinite',
        'float':      'float 3s ease-in-out infinite',
        'paw-trail':  'pawTrail 8s linear infinite',
      },
      keyframes: {
        fadeUp:    { '0%': { opacity: 0, transform: 'translateY(20px)' }, '100%': { opacity: 1, transform: 'translateY(0)' } },
        fadeIn:    { '0%': { opacity: 0 }, '100%': { opacity: 1 } },
        slideIn:   { '0%': { transform: 'translateX(-10px)', opacity: 0 }, '100%': { transform: 'translateX(0)', opacity: 1 } },
        pulseSoft: { '0%,100%': { opacity: 1 }, '50%': { opacity: 0.6 } },
        shimmer:   { '0%': { backgroundPosition: '-200% 0' }, '100%': { backgroundPosition: '200% 0' } },
        float:     { '0%,100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(-8px)' } },
        pawTrail:  { '0%': { transform: 'translateX(-100%)' }, '100%': { transform: 'translateX(100vw)' } },
      },
      boxShadow: {
        'warm':    '0 4px 24px -4px rgba(232,115,74,0.25)',
        'warm-lg': '0 12px 48px -8px rgba(232,115,74,0.35)',
        'card':    '0 2px 16px -2px rgba(28,43,43,0.12)',
        'card-hover': '0 12px 40px -8px rgba(28,43,43,0.2)',
      },
    },
  },
  plugins: [],
};
