import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './lib/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // Intel Live design system
        'bg-primary': '#060A0F',
        'bg-secondary': '#0A0E14',
        'bg-panel': '#0C1018',
        'accent': '#00E5FF',
        'alert': '#FF3B30',
        'warning': '#FFB020',
        'success': '#30D158',
        'intel-purple': '#A78BFA',
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        display: ['Space Grotesk', 'Inter', 'sans-serif'],
      },
      animation: {
        'pulse-glow': 'pulseGlow 2s ease-in-out infinite',
        'ticker-scroll': 'tickerScroll 40s linear infinite',
        'float-drift': 'floatDrift 20s ease-in-out infinite alternate',
        'radar-sweep': 'radarSweep 4s linear infinite',
        'spin-slow': 'spin 3s linear infinite',
        'fade-in': 'fadeIn 0.3s ease forwards',
        'slide-in-left': 'slideInLeft 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
        'slide-in-right': 'slideInRight 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
        'alert-flash': 'alertFlash 2s ease infinite',
        'card-reveal': 'cardReveal 0.25s ease forwards',
      },
      keyframes: {
        pulseGlow: {
          '0%, 100%': { boxShadow: '0 0 6px rgba(0,229,255,0.3)' },
          '50%': { boxShadow: '0 0 20px rgba(0,229,255,0.6)' },
        },
        tickerScroll: {
          from: { transform: 'translateX(0)' },
          to: { transform: 'translateX(-50%)' },
        },
        floatDrift: {
          '0%': { transform: 'translate(0, 0)' },
          '25%': { transform: 'translate(10px, -15px)' },
          '50%': { transform: 'translate(-5px, -30px)' },
          '75%': { transform: 'translate(15px, -10px)' },
          '100%': { transform: 'translate(-10px, 5px)' },
        },
        radarSweep: {
          from: { transform: 'rotate(0deg)' },
          to: { transform: 'rotate(360deg)' },
        },
        fadeIn: {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        slideInLeft: {
          from: { opacity: '0', transform: 'translateX(-16px)' },
          to: { opacity: '1', transform: 'translateX(0)' },
        },
        slideInRight: {
          from: { opacity: '0', transform: 'translateX(16px)' },
          to: { opacity: '1', transform: 'translateX(0)' },
        },
        alertFlash: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.4' },
        },
        cardReveal: {
          from: { opacity: '0', transform: 'translateY(8px) scale(0.98)' },
          to: { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
      },
      backdropBlur: {
        xs: '2px',
      },
    },
  },
  plugins: [],
}

export default config
