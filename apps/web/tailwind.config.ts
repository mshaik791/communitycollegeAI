import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        serif: ['DM Serif Display', 'Georgia', 'serif'],
        sans: ['Instrument Sans', 'system-ui', 'sans-serif'],
        mono: ['DM Mono', 'monospace'],
      },
      colors: {
        teal: { DEFAULT: '#7eb8b0', dark: '#4a9e95' },
        lavender: { DEFAULT: '#9b8ec4', dark: '#7c5cbf' },
        calm: { bg: '#f8f5fc', surface: '#f0f7f6', card: '#f5f0fa' },
      },
      borderRadius: {
        DEFAULT: '10px',
        lg: '12px',
        xl: '16px',
        glass: '16px',
        'glass-lg': '20px',
      },
      backdropBlur: {
        glass: '16px',
        'glass-lg': '24px',
      },
    },
  },
  plugins: [],
};

export default config;
