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

const STAGE_ID_RE = /^[a-z0-9-]+$/;

const stageDevSave = {
  name: 'eternia-stage-dev-save',
  configureServer(server: import('vite').ViteDevServer) {
    server.middlewares.use(
      '/__dev/save-stage',
      async (req, res, next) => {
        if (req.method !== 'POST') {
          next();
          return;
        }
        let body = '';
        req.on('data', (chunk) => (body += chunk));
        req.on('end', async () => {
          try {
            const data = JSON.parse(body) as { id?: unknown; shapes?: unknown; spawns?: unknown };
            if (typeof data !== 'object' || data === null) {
              throw new Error('payload must be an object');
            }
            if (typeof data.id !== 'string' || !STAGE_ID_RE.test(data.id)) {
              throw new Error('invalid stage id');
            }
            if (!Array.isArray(data.shapes) || !Array.isArray(data.spawns)) {
              throw new Error('shapes and spawns must be arrays');
            }
            const target = path.resolve(
              process.cwd(),
              `src/data/stages/${data.id}.json`,
            );
            await fs.writeFile(target, JSON.stringify(data, null, 2) + '\n', 'utf8');
            res.statusCode = 204;
            res.end();
          } catch (err) {
            res.statusCode = 400;
            res.setHeader('Content-Type', 'text/plain');
            res.end(`stage save failed: ${(err as Error).message}`);
          }
        });
      },
    );
  },
};

export default defineConfig({
  plugins: [naiaPropsDevSave, stageDevSave],
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
        mapEditor: 'map-editor.html',
      },
    },
  },
});
