import { Hono } from 'hono';
import { cors } from 'hono/cors';
import type { Bindings } from './types';
import { musicRouter } from './routes/music';
import { shareRouter } from './routes/share';

const app = new Hono<{ Bindings: Bindings }>();

// Global error handler for API routes
app.onError((err, c) => {
  console.error(err);
  if (c.req.path.startsWith('/api')) {
    return c.json({ error: err.message }, 500);
  }
  return c.text('Internal Server Error', 500);
});

app.use('/api/*', cors());
app.route('/api', musicRouter);
app.route('/api', shareRouter);

// Non-API routes: let static assets / SPA fallback handle them
app.all('*', async (c) => {
  return c.env.ASSETS.fetch(c.req.raw);
});

export default app;
