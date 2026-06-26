import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      devOptions: { enabled: true },
      includeAssets: ["favicon.ico", "apple-touch-icon.png", "pwa-192.png", "pwa-512.png"],
      manifest: {
        name: "Sridhi Ventures BOS",
        short_name: "Sridhi BOS",
        description: "Business Operating System — Sridhi Ventures, Bengaluru. Manage leads, sales, samples and expenses.",
        theme_color: "#060B16",
        background_color: "#060B16",
        display: "standalone",
        display_override: ["standalone", "minimal-ui"],
        orientation: "portrait",
        scope: "/",
        start_url: "/",
        categories: ["business", "productivity"],
        lang: "en",
        icons: [
          {
            src: "pwa-192.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "any"
          },
          {
            src: "pwa-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any"
          },
          {
            src: "pwa-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable"
          },
          {
            src: "apple-touch-icon.png",
            sizes: "180x180",
            type: "image/png"
          }
        ],
        shortcuts: [
          {
            name: "Leads CRM",
            short_name: "Leads",
            url: "/?tab=leads",
            icons: [{ src: "pwa-192.png", sizes: "192x192" }]
          },
          {
            name: "Dashboard",
            short_name: "Home",
            url: "/",
            icons: [{ src: "pwa-192.png", sizes: "192x192" }]
          }
        ]
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg,webp}"],
        runtimeCaching: [
          {
            urlPattern: /^https?:\/\/.*\/api\/sheets/,
            handler: "StaleWhileRevalidate",
            options: {
              cacheName: "sheets-api-cache",
              expiration: { maxEntries: 20, maxAgeSeconds: 120 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
  ],
  server: {
    proxy: {
      "/api": {
        target: "http://localhost:8000",
        changeOrigin: true,
      },
    },
  },
});
