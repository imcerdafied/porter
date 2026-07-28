import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: [
        "porter-icon.svg",
        "porter-icon-maskable.svg",
        "icon-192.png",
        "icon-512.png"
      ],
      manifest: {
        name: "Porter Concierge",
        short_name: "Porter",
        description: "Your property concierge, ready when you are.",
        start_url: "/",
        scope: "/",
        display: "standalone",
        background_color: "#f5f1e8",
        theme_color: "#12372a",
        icons: [
          {
            src: "/icon-192.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "any"
          },
          {
            src: "/icon-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any maskable"
          },
          {
            src: "/porter-icon.svg",
            sizes: "any",
            type: "image/svg+xml",
            purpose: "any"
          },
          {
            src: "/porter-icon-maskable.svg",
            sizes: "any",
            type: "image/svg+xml",
            purpose: "maskable"
          }
        ]
      },
      workbox: {
        navigateFallback: "/index.html",
        globPatterns: ["**/*.{js,css,html,svg,woff2}"],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/.*\.supabase\.co\/functions\/v1\//,
            handler: "NetworkOnly"
          }
        ]
      }
    })
  ],
  test: {
    environment: "jsdom",
    setupFiles: "./src/test/setup.ts",
    css: true
  }
});
