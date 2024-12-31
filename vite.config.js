import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// Use environment variable with fallback for cache dir
const cacheDir = process.env.VITE_CACHE_DIR || path.resolve('/tmp/vite')

export default defineConfig({
  base: 'citrix-calc',  // Replace with your actual repo name
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
    hmr: {
      clientPort: 5173
    }
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  cacheDir: cacheDir,
  optimizeDeps: {
    cacheDir: path.join(cacheDir, 'deps')
  },
  // Ensure temp files also go to writable location
  build: {
    outDir: path.join(cacheDir, 'dist')
  }
})