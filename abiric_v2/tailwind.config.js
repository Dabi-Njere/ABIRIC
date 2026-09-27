/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx}",
    "./components/**/*.{js,jsx}",
  ],
  theme: {
    extend: {
      colors: {
        abiric: {
          forest: "#1e3a2f",
          forestDark: "#142720",
          black: "#141414",
          accent: "#2d6a4a",
          accentLight: "#3f8c63",
        },
      },
    },
  },
  plugins: [],
};
