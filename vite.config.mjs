import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  build: {
    outDir: "dist/client",
    rollupOptions: {
      // Deux pages d'entrée : le site public, et une page neutre pour les
      // galeries et le panneau, avec son propre aperçu de lien.
      input: {
        main: "index.html",
        galerie: "galerie.html",
      },
    },
  },
  optimizeDeps: {
    include: ["react", "react-dom/client"],
  },
  server: {
    host: "0.0.0.0",
    // En développement, /api/* part vers le Worker lancé par `wrangler dev`.
    proxy: {
      "/api": { target: "http://127.0.0.1:8787", changeOrigin: false },
    },
    allowedHosts: ["terminal.local"],
    warmup: {
      clientFiles: ["./src/main.jsx"],
    },
  },
  plugins: [react()],
});
