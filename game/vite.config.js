import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    //outDir: '../server/public', // Build directly to server public folder for easy testing? Or just 'dist'
    // The user wants to "tach ra thanh cau truc project server".
    // If we build to server/public, the server can serve it.
    // Let's build to 'dist' inside game first, then user can copy or we configure server to serve from there.
    // Actually, usually in dev we use vite dev server.
    // For production/capacitor, we build to 'dist'.
    outDir: 'dist',
    emptyOutDir: true
  },
  server: {
    host: true,
    port: 8080
  },
  proxy: {
    '/api': {
      target: 'http://localhost:3000',
      changeOrigin: true,
      secure: false,
      rewrite: (path) => path.replace(/^\/api/, '')
    },
    '/socket.io': {
      target: 'http://localhost:3000',
      ws: true,
      changeOrigin: true,
      secure: false
    }
  }
});
