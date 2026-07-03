import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { videoProxyPlugin } from './vite-plugin-proxy'

export default defineConfig({
  plugins: [react(), videoProxyPlugin()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
