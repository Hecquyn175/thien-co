import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

// `base` cấu hình qua biến môi trường VITE_BASE (CI đặt thành /<tên-repo>/).
const base = process.env.VITE_BASE ?? './';

export default defineConfig({
  base,
  resolve: {
    preserveSymlinks: true,
  },
  build: {
    target: 'es2022',
    sourcemap: false,
  },
  worker: { format: 'es' },
  plugins: [
    VitePWA({
      registerType: 'prompt',
      injectRegister: false,
      includeAssets: [
        'icons/icon.svg',
        'icons/maskable-icon.svg',
        'icons/icon-192.png',
        'icons/icon-512.png',
        'icons/maskable-512.png',
        'fonts/fonts.css',
      ],
      manifest: {
        name: 'Thiên Cơ — Dự đoán sự kiện & Lịch Vạn Niên Can Chi',
        short_name: 'Thiên Cơ',
        description:
          'Ứng dụng dự đoán sự kiện theo Can Chi, Bát Tự, Lịch Vạn Niên Việt Nam, Phương hướng và Kinh Dịch (100% Offline).',
        theme_color: '#b8332a',
        background_color: '#f6efe0',
        display: 'standalone',
        lang: 'vi',
        icons: [
          {
            src: 'icons/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: 'icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: 'icons/maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,json,woff2}'],
      },
    }),
  ],
});
