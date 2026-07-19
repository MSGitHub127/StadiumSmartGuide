/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-inter)', 'sans-serif'],
        display: ['var(--font-outfit)', 'sans-serif'],
      },
      colors: {
        obsidian: '#020617',
        pitch: {
          400: '#34d399',
          500: '#10b981',
        },
        alertGold: '#fbbf24',
        crimson: '#f43f5e',
      },
      animation: {
        pulseSlow: 'pulse 2.4s cubic-bezier(0.4,0,0.6,1) infinite',
      },
    },
  },
  plugins: [],
};

