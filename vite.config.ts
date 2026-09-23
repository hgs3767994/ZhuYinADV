import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  base: './',
  plugins: [
    react(),
    VitePWA({
      registerType: 'prompt',
      manifest: {
        id: 'tw.app.zhuyin.adventure',
        name: '小小注音冒險家',
        short_name: '注音冒險家',
        description: '適合幼兒練習與熟悉注音符號的冒險遊戲',
        lang: 'zh-TW',
        start_url: '.',
        scope: '.',
        display: 'standalone',
        orientation: 'portrait-primary',
        background_color: '#0f172a',
        theme_color: '#0f172a',
        icons: [
          {
            src: 'assets/images/icon-192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'assets/images/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any'
          }
        ],
        screenshots: [
          {
            src: 'assets/images/screenshot.webp',
            sizes: '540x1033',
            type: 'image/webp',
            form_factor: 'narrow',
            label: '小小注音冒險家主畫面'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,png,webp,mp3,webmanifest}'],
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true,
        navigateFallback: 'index.html'
      }
    })
  ]
});
