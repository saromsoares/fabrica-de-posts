/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['Syne', 'sans-serif'],
        body: ['DM Sans', 'sans-serif'],
      },
      fontWeight: {
        300: '300',
        400: '400',
        500: '500',
        600: '600',
        700: '700',
        800: '800',
        900: '900',
      },
      colors: {
        brand: {
          50: '#fdf4f3', 100: '#fce8e4', 200: '#fad4ce', 300: '#f5b5ab',
          400: '#ed8a7a', 500: '#e0604e', 600: '#cc4533', 700: '#ab3727',
          800: '#8d3124', 900: '#762e24', 950: '#40140e',
        },
        dark: {
          50: '#f6f6f9', 100: '#ededf1', 200: '#d7d8e0', 300: '#b4b5c5',
          400: '#8b8da5', 500: '#6d6f8b', 600: '#575972', 700: '#47485d',
          800: '#3d3e4f', 900: '#1a1b2e', 950: '#0f1020',
        },
      },
      animation: {
        'fade-in-up': 'fadeInUp 0.4s ease-out forwards',
        'fade-in': 'fadeIn 0.3s ease-out forwards',
        'slide-in-right': 'slideInRight 0.3s ease-out forwards',
        'scale-in': 'scaleIn 0.2s ease-out forwards',
        'shimmer': 'shimmer 1.8s ease-in-out infinite',
        'pulse-glow': 'pulseGlow 2s ease-in-out infinite',
      },
      keyframes: {
        fadeInUp: {
          from: { opacity: '0', transform: 'translateY(16px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        fadeIn: {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        slideInRight: {
          from: { opacity: '0', transform: 'translateX(16px)' },
          to: { opacity: '1', transform: 'translateX(0)' },
        },
        scaleIn: {
          from: { opacity: '0', transform: 'scale(0.95)' },
          to: { opacity: '1', transform: 'scale(1)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        pulseGlow: {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(204, 69, 51, 0)' },
          '50%': { boxShadow: '0 0 0 6px rgba(204, 69, 51, 0.1)' },
        },
      },
      backdropBlur: {
        xs: '2px',
      },
      borderRadius: {
        '3xl': '1.5rem',
        '4xl': '2rem',
      },
      boxShadow: {
        'brand': '0 4px 24px rgba(204, 69, 51, 0.18)',
        'brand-sm': '0 2px 12px rgba(204, 69, 51, 0.12)',
        'card': '0 2px 16px rgba(0, 0, 0, 0.35)',
        'card-lg': '0 8px 32px rgba(0, 0, 0, 0.5)',
      },
    },
  },
  plugins: [],
};
