import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    host: true,
    cors: {
      origin: ['http://localhost:8000'], // Allow agent backend
      credentials: true
    }
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          utils: ['zod']
        }
      }
    }
  },
  optimizeDeps: {
    include: ['react', 'react-dom', 'zod']
  }
})
