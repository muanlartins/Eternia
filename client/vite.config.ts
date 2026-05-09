import { defineConfig } from 'vite';
import fs from 'node:fs/promises';
import path from 'node:path';

const naiaPropsDevSave = {
  name: 'eternia-naia-props-dev-save',
  configureServer(server: import('vite').ViteDevServer) {
    server.middlewares.use(
      '/__dev/save-naia-props',
      async (req, res, next) => {
        if (req.method !== 'POST') {
          next();
          return;
        }
        let body = '';
        req.on('data', (chunk) => (body += chunk));
        req.on('end', async () => {
          try {
            const data = JSON.parse(body) as {
              bow?: unknown;
              glasses?: unknown;
              bowstring?: unknown;
            };
            if (typeof data !== 'object' || data === null) {
              throw new Error('payload must be an object');
            }
            const target = path.resolve(
              process.cwd(),
              'src/three/naia-props-offsets.json',
            );
            await fs.writeFile(target, body + '\n', 'utf8');
            res.statusCode = 204;
            res.end();
          } catch (err) {
            res.statusCode = 400;
            res.setHeader('Content-Type', 'text/plain');
            res.end(`naia-props save failed: ${(err as Error).message}`);
          }
        });
      },
    );
  },
};

export default defineConfig({
  plugins: [naiaPropsDevSave],
  server: {
    port: 5173,
    host: true,
    proxy: {
      '/ws': {
        target: 'ws://localhost:8080',
        ws: true,
        changeOrigin: true,
      },
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
    },
  },
  build: {
    target: 'es2022',
    sourcemap: true,
    rollupOptions: {
      input: {
        main: 'index.html',
        editor: 'editor.html',
      },
    },
  },
});
