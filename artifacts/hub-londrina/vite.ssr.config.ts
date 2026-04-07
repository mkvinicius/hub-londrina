import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
    },
    dedupe: ["react", "react-dom"],
  },
  root: path.resolve(import.meta.dirname),
  build: {
    ssr: true,
    rollupOptions: {
      input: "src/entry-server.tsx",
      output: {
        format: "esm",
      },
    },
    outDir: "dist/server",
    emptyOutDir: true,
  },
  ssr: {
    noExternal: ["wouter"],
  },
});
