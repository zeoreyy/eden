import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["icon.svg", "apple-touch-icon.png"],
      manifest: {
        name: "eden — cinema em Lisboa",
        short_name: "eden",
        description: "Sessões de cinema em Lisboa.",
        lang: "pt",
        start_url: "/",
        display: "standalone",
        background_color: "#1a1613",
        theme_color: "#1a1613",
        icons: [
          { src: "icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "icon-512.png", sizes: "512x512", type: "image/png" },
          { src: "icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
      workbox: {
        navigateFallback: "/index.html",
        navigateFallbackDenylist: [/^\/api\//],
        runtimeCaching: [
          // Offline: the last programme we fetched (spec: offline last data).
          {
            urlPattern: ({ url }) => url.pathname === "/api/programme",
            handler: "NetworkFirst",
            options: { cacheName: "programme", networkTimeoutSeconds: 5, expiration: { maxEntries: 1 } },
          },
          {
            urlPattern: ({ request }) => request.destination === "image",
            handler: "CacheFirst",
            options: { cacheName: "posters", expiration: { maxEntries: 400, maxAgeSeconds: 30 * 86400 }, cacheableResponse: { statuses: [0, 200] } },
          },
        ],
      },
    }),
  ],
  // `npm run dev` reads the live programme from the deployed Worker.
  server: { port: 5173, proxy: { "/api": { target: "https://eden.zeorey.workers.dev", changeOrigin: true } } },
});
