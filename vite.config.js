import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// Use environment variable with fallback for cache dir
const cacheDir = process.env.VITE_CACHE_DIR || path.resolve('/tmp/vite')

export default defineConfig({
  base: '/citrix-calc/', 
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
  // Remove the custom outDir to use default 'dist' in project root
  build: {
    // outDir: path.join(cacheDir, 'dist') // Remove or comment this out
  }
})