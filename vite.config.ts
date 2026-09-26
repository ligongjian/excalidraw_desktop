import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Tauri 期望的 Vite 配置：固定端口、关闭自动清屏、忽略 src-tauri 目录
export default defineConfig({
  plugins: [react()],
  clearScreen: false,
  server: {
    port: 1422,
    strictPort: true,
    watch: {
      ignored: ["**/src-tauri/**"],
    },
  },
  envPrefix: ["VITE_", "TAURI_"],
  build: {
    target: "esnext",
    outDir: "dist",
    sourcemap: false,
  },
});
