import { defineConfig } from 'vite'

export default defineConfig({
  server: {
    host: '0.0.0.0',   // ✅ allows external access (for DigitalOcean)
    port: 8080,         // ✅ DigitalOcean health checks use this
    strictPort: true,   // ✅ avoids port switching
  },
  preview: {
    host: '0.0.0.0',
    port: 8080,
    strictPort: true,
  },
  build: {
    outDir: 'dist',     // Output directory
  },
  // ✅ Proxy API calls to backend (edit URL if needed)
  server: {
    proxy: {
      '/api': {
        target: 'https://fusonems-quantum-v2-backend.ondigitalocean.app',
        changeOrigin: true,
        secure: true,
      },
    },
  },
})
