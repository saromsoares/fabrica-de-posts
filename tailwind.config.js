/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['Syne', 'sans-serif'],
        body: ['DM Sans', 'sans-serif'],
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
        'fade-in-up': 'fadeInUp 0.5s ease-out forwards',
        'shimmer': 'shimmer 2s infinite',
      },
      keyframes: {
        fadeInUp: {
          from: { opacity: '0', transform: 'translateY(20px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
    },
  },
  plugins: [],
};
