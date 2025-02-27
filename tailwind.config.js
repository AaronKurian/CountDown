/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        satoshi: ['var(--font-satoshi)'],
        khuja: ['var(--font-khuja)'],
        productsansbold: ['var(--font-productsans-bold)'],
      },
      fontFamily: {
        satoshi: ["var(--font-satoshi)", "sans-serif"],
      },
    },
  },
  plugins: [],
} 