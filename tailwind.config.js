/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        clockify: {
          orange: '#ff9800',
          blue: '#03a9f4',
          dark: '#1f2937'
        },
        quickbooks: {
          green: '#2ca01c',
          darkgreen: '#1e6b13'
        }
      }
    },
  },
  plugins: [],
};
