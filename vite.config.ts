import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'Margin',
        short_name: 'Margin',
        description:
          '今日の余白をつくるための個人用課題管理アプリ',
        theme_color: '#f5f4ef',
        background_color: '#f5f4ef',
        display: 'standalone',
        start_url: '.',
        scope: '.',
        lang: 'ja',
      },
    }),
  ],
})