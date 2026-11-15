/// <reference types="vitest/config" />
import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue()],
  server: {
    // 開発中は、/api をバックエンド(FastAPI)へ回す。Cookie が同じ場所のものとして扱える
    proxy: { '/api': 'http://localhost:8000' },
  },
  test: {
    environment: 'jsdom',
  },
})
