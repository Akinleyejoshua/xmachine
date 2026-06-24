/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-bricolage)", "sans-serif"],
      },
      colors: {
        royalblue: {
          50: '#f0f4ff',
          100: '#dce5ff',
          200: '#c1d2ff',
          300: '#97b4ff',
          400: '#648bff',
          500: '#4169e1', // Royal Blue
          600: '#2b4bc8',
          700: '#213aa6',
          800: '#1f3286',
          900: '#1e2d6b',
          950: '#121940',
        },
      },
    },
  },
  plugins: [],
};
