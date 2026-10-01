import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { fileURLToPath, URL } from 'node:url';

const base = process.env.VITE_BASE ?? '/';

export default defineConfig({
  base,
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  plugins: [
    react(),
    VitePWA({
      // "prompt": la app nueva se descarga en segundo plano y NO se activa hasta que
      // la usuaria toca "Actualizar ahora". Los datos viven en Supabase, no en la caché.
      registerType: 'prompt',
      includeAssets: ['icon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'VIVIA',
        short_name: 'VIVIA',
        description: 'VIVIA — Tu vida, en un solo lugar.',
        lang: 'es',
        start_url: base,
        scope: base,
        display: 'standalone',
        background_color: '#F6F2FF',
        theme_color: '#7C5CD6',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: 'icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
        ]
      },
      workbox: {
        cleanupOutdatedCaches: true,
        navigateFallback: `${base}index.html`,
        // Nunca cachear llamadas a la API/Storage: los datos siempre vienen del servidor.
        navigateFallbackDenylist: [/^\/api/]
      }
    })
  ],
  define: { __APP_VERSION__: JSON.stringify(process.env.npm_package_version ?? '1.0.0') }
});
