/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          violet: '#7c3aed', // Violet-600
          dark: '#1e1b4b',    // Indigo-950
        },
        accent: {
          teal: '#2dd4bf',    // Teal-400
        },
        ui: {
          bg: '#020617',      // Slate-950
          card: '#0f172a',    // Slate-900
        }
      }
    },
  },
  plugins: [],
}