/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: "#4f46e5",
        secondary: "#10b981",
      },
      spacing: {
        128: "32rem",
      },
    },
  },
  plugins: [],
}
