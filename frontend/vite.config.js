import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0', // <-- این خط را اضافه کن
    port: 5173,
    proxy: {
      '/api': {
        const API_URL = 'https://api.asemantile.com',
        changeOrigin: true
      }
    }
  }
})
