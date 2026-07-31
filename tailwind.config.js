/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        ink: '#101828',
        paper: '#F7F8FA',
        accent: '#0F5B4C',
        accentSoft: '#E4F0EC',
        warn: '#B4530A',
        danger: '#B3261E',
      },
      fontFamily: {
        display: ['var(--font-display)'],
        body: ['var(--font-body)'],
      },
      borderRadius: {
        card: '14px',
      },
    },
  },
  plugins: [],
};
