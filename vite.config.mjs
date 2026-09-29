import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// En local (npm run dev), Vite ne connaît pas les règles de public/_redirects.
// Ce petit plugin reproduit /galerie/* -> galerie.html et /admin -> galerie.html
// uniquement pour le serveur de développement, comme le fait Netlify en ligne.
function galerieDevRewrite() {
  return {
    name: "galerie-dev-rewrite",
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (req.url && (req.url.startsWith("/galerie/") || req.url === "/admin" || req.url.startsWith("/admin?"))) {
          req.url = "/galerie.html";
        }
        next();
      });
    },
  };
}

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
  plugins: [react(), galerieDevRewrite()],
});
