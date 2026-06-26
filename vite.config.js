import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.ico", "apple-touch-icon.png", "masked-icon.svg"],
      manifest: {
        name: "Sridhi Ventures BOS",
        short_name: "Sridhi BOS",
        description: "Business Operating System — Sridhi Ventures, Bengaluru",
        theme_color: "#060B16",
        background_color: "#060B16",
        display: "standalone",
        orientation: "portrait",
        scope: "/",
        start_url: "/",
        icons: [
          { src: "pwa-192.png", sizes: "192x192", type: "image/png" },
          { src: "pwa-512.png", sizes: "512x512", type: "image/png", purpose: "any maskable" }
        ],
      },
      workbox: {
        // Cache all JS/CSS/HTML assets for offline
        globPatterns: ["**/*.{js,css,html,ico,png,svg,webp}"],
        // Runtime caching for the API — stale-while-revalidate for instant load
        runtimeCaching: [
          {
            urlPattern: /^https?:\/\/.*\/api\/sheets\?tab=all/,
            handler: "StaleWhileRevalidate",
            options: {
              cacheName: "sheets-api-cache",
              expiration: { maxEntries: 10, maxAgeSeconds: 120 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
  ],
  server: {
    // During local dev, proxy /api to a local Python server
    proxy: {
      "/api": {
        target: "http://localhost:8000",
        changeOrigin: true,
      },
    },
  },
});
