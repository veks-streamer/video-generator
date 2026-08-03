import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

// GitHub Project Pages are served from https://<user>.github.io/<repo>/
// so the app must be built with a matching base path. Override with
// VITE_BASE at build time if you rename the repository.
const base = process.env.VITE_BASE ?? "/video-generator/";

export default defineConfig({
  base,
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  // ffmpeg.wasm ships its own web worker; let Vite serve it untouched
  // instead of trying to pre-bundle it.
  optimizeDeps: {
    exclude: ["@ffmpeg/ffmpeg", "@ffmpeg/util"],
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
    target: "es2020",
  },
});
