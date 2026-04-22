import { serve } from 'bun';
import { logger } from './logger';

const PORT = 8080;

serve({
  port: PORT,
  async fetch(req) {
    const url = new URL(req.url);
    let filePath: string;

    if (url.pathname === '/' || url.pathname === '/index.html') {
      filePath = './src/dist/index.html';
    } else if (url.pathname === '/rpc-browser.js') {
      filePath = './src/rpc-browser.js';
    } else {
      filePath = `./src/dist${url.pathname}`;
    }

    const file = Bun.file(filePath);
    if (await file.exists()) {
      return new Response(file);
    }
    return new Response('Not Found', { status: 404 });
  },
  error(e) {
    return new Response('Server Error: ' + e.message, { status: 500 });
  },
});

logger.info({ port: PORT }, 'UI Server running at http://localhost:%d');
