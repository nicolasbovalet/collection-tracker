import path from "node:path";

import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    watch: {
      // This project lives on a Windows-mounted path under WSL2
      // (/mnt/c/...), where native filesystem events don't reliably cross
      // the 9p/DrvFs boundary — chokidar's default watcher silently misses
      // edits there, so the dev server can keep serving a stale bundle
      // indefinitely. Polling guarantees changes are picked up.
      usePolling: true,
    },
    proxy: {
      "/api": "http://localhost:8000",
    },
  },
});
