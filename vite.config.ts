/// <reference types="vitest" />
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

// BAK-204 (WU-16): installable, offline-capable PWA via generateSW.
// The Phaser chunk is large, so the Workbox precache size cap is raised to ~6MB.
// devOptions stays disabled so `vite`/`vitest` never register a SW or cache churn.
export default defineConfig({
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      strategies: 'generateSW',
      manifest: {
        name: 'NRL Sim',
        short_name: 'NRLSim',
        display: 'standalone',
        orientation: 'landscape',
        theme_color: '#1a1a2e',
        background_color: '#1a1a2e',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          {
            src: 'icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,png}'],
        maximumFileSizeToCacheInBytes: 6_000_000,
      },
      devOptions: { enabled: false },
    }),
  ],
  test: { globals: true, environment: 'node', include: ['tests/**/*.test.ts'] },
});
