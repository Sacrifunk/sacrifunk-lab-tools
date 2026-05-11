import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { viteSingleFile } from "vite-plugin-singlefile";
import path from "node:path";

// Single-file build: inlines JS + CSS into one .html so GitHub Pages serves it
// at the existing URL (`docs/sacrifunk_vortex_v2.html`) with zero asset paths
// to break. Keeps URL-stability with the legacy single-file pattern that
// every other Lab tool still uses.
export default defineConfig({
  plugins: [react(), viteSingleFile()],
  build: {
    outDir: path.resolve(__dirname, "../../docs"),
    emptyOutDir: false,
    cssCodeSplit: false,
    assetsInlineLimit: 100_000_000,
    rollupOptions: {
      input: path.resolve(__dirname, "sacrifunk_vortex_v2.html"),
      output: {
        entryFileNames: "sacrifunk_vortex_v2.js",
        chunkFileNames: "sacrifunk_vortex_v2-[hash].js",
        assetFileNames: "sacrifunk_vortex_v2-[name].[ext]",
      },
    },
  },
  // GH Pages serves from a sub-path; with single-file inlining `base` is moot,
  // but keep it relative for any future asset path that does escape inlining.
  base: "./",
});
