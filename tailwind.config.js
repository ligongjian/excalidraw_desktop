/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        handwriting: ["Ma Shan Zheng", "Kaiti SC", "KaiTi", "STKaiti", "cursive"],
      },
    },
  },
  plugins: [],
};
