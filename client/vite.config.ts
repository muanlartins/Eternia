import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    port: 5173,
    // Bind on 0.0.0.0 so the dev server is reachable over Tailscale
    // (default is localhost-only). Phase 8.A — multiplayer alpha.
    host: true,
    proxy: {
      // Proxy WebSocket connections to the Go server during dev
      '/ws': {
        target: 'ws://localhost:8080',
        ws: true,
        changeOrigin: true,
      },
      // Proxy REST API calls to the Go server during dev
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
    },
  },
  build: {
    target: 'es2022',
    sourcemap: true,
  },
});
