import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#0da12e',
          hover: '#0a8024',
          dark: '#0a2580',
        },
        success: {
          light: '#d4edda',
          DEFAULT: '#155724',
          border: '#c3e6cb',
        },
        danger: {
          light: '#f8d7da',
          DEFAULT: '#721c24',
          border: '#f5c6cb',
        },
      },
      fontFamily: {
        sans: [
          'Meiryo',
          'メイリオ',
          '游ゴシック',
          'YuGothic',
          'Hiragino Kaku Gothic ProN',
          'sans-serif',
        ],
      },
      keyframes: {
        pulse: {
          '0%, 100%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.05)' },
        },
      },
      animation: {
        pulse: 'pulse 1s infinite',
      },
    },
  },
  plugins: [],
};

export default config;
