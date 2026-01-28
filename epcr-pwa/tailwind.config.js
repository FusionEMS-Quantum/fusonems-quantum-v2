/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: '#1e40af',
        dark: '#111827',
        'dark-lighter': '#1f2937',
      },
    },
  },
  plugins: [],
}
