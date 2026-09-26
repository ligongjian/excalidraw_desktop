/** @type {import('tailwindcss').Config} */
export default {
  // 改为 class 策略，方便前端统一控制深/浅色
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // 品牌色（靛蓝，呼应 Excalidraw 的手绘蓝）
        brand: {
          50: "#eef2ff",
          100: "#e0e7ff",
          200: "#c7d2fe",
          300: "#a5b4fc",
          400: "#818cf8",
          500: "#6366f1",
          600: "#4f46e5",
          700: "#4338ca",
          800: "#3730a3",
          900: "#312e81",
          950: "#1e1b4b",
        },
      },
      fontFamily: {
        handwriting: ["Ma Shan Zheng", "Kaiti SC", "KaiTi", "STKaiti", "cursive"],
      },
      keyframes: {
        "fade-in": {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        "scale-in": {
          from: { opacity: "0", transform: "scale(.96) translateY(6px)" },
          to: { opacity: "1", transform: "scale(1) translateY(0)" },
        },
        "toast-in": {
          from: { opacity: "0", transform: "translateY(10px) scale(.97)" },
          to: { opacity: "1", transform: "translateY(0) scale(1)" },
        },
        "pop": {
          "0%": { opacity: "0", transform: "scale(.9)" },
          "60%": { transform: "scale(1.03)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
      },
      animation: {
        "fade-in": "fade-in .18s ease-out both",
        "scale-in": "scale-in .22s cubic-bezier(.16,1,.3,1) both",
        "toast-in": "toast-in .22s cubic-bezier(.16,1,.3,1) both",
        pop: "pop .25s cubic-bezier(.16,1,.3,1) both",
      },
    },
  },
  plugins: [],
};
