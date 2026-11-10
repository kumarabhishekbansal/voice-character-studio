import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

function localApiMiddlewarePlugin() {
  const mountApi = (server) => {
    server.middlewares.use(async (req, res, next) => {
      const reqUrl = req.url || '';
      if (!reqUrl.startsWith('/api/')) return next();

      try {
        const cleanPath = reqUrl.split('?')[0].replace('/api/', '').replace(/[^a-zA-Z0-9_-]/g, '');
        const moduleUrl = new URL(`./api/${cleanPath}.js`, import.meta.url).href;
        const mod = await import(`${moduleUrl}?t=${Date.now()}`);
        if (typeof mod.default === 'function') {
          await mod.default(req, res);
          return;
        }
      } catch (err) {
        if (!res.headersSent) {
          res.statusCode = 404;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ code: 'NOT_FOUND', message: 'API route not found.' }));
        }
        return;
      }
      next();
    });
  };

  return {
    name: 'local-api-routes',
    configureServer: mountApi,
    configurePreviewServer: mountApi,
  };
}

export default defineConfig({
  plugins: [react(), localApiMiddlewarePlugin()],
  optimizeDeps: {
    exclude: ['onnxruntime-web', '@huggingface/transformers', 'kokoro-js'],
  },
  build: {
    target: 'esnext',
  },
  worker: {
    format: 'es',
  },
  server: {
    port: 5173,
    host: true,
    open: false,
  },
});
