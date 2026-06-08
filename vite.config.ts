import path from "path";
import { fileURLToPath } from "url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";
import { viteSingleFile } from "vite-plugin-singlefile";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// https://vite.dev/config/
export default defineConfig({
  // SPA: refresh on /admin/* or /app/* serves index.html (dev + preview)
  appType: "spa",
  plugins: [
    react(),
    tailwindcss(),
    viteSingleFile(),
    VitePWA({
      registerType: "autoUpdate",
      injectRegister: "auto",
      includeAssets: ["icon-192.png", "icon-512.png", "manifest.json"],
      manifest: false,
      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg,webmanifest}"],
        runtimeCaching: [],
      },
      devOptions: {
        enabled: true,
      },
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  preview: {
    // Ensure deep links work in `vite preview`
    strictPort: false,
  },
  server: {
    // History API fallback is default for SPA in Vite 7
    strictPort: false,
  },
});
