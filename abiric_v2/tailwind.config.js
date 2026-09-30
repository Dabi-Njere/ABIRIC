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
          // Core brand
          forest: "#173D32",
          forestDark: "#0D2B23",
          forestSoft: "#245447",

          // Salmon brand accent
          salmon: "#F28C82",
          salmonLight: "#F7AAA2",
          salmonDark: "#D96F66",

          // Application surfaces
          black: "#101312",
          charcoal: "#161A18",
          surface: "#1C211F",
          surfaceLight: "#242A27",

          // Typography
          cream: "#F5F1EA",
          muted: "#9CA8A2",

          // Compatibility with existing components
          accent: "#F28C82",
          accentLight: "#F7AAA2",
        },
      },
    },
  },
  plugins: [],
};