/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class', // nunca auto, solo si se agrega clase "dark" manualmente
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {},
  },
  plugins: [],
}

