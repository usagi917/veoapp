/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './index.html',
    './src/**/*.{ts,tsx,js,jsx}',
  ],
  theme: {
    extend: {},
  },
  // ダークモードはOS設定に追随
  darkMode: 'media',
  plugins: [],
};

