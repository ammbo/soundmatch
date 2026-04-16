import { Hono } from 'hono';
import type { Bindings, Generation } from '../types';

export const shareRouter = new Hono<{ Bindings: Bindings }>();

// Get generation metadata
shareRouter.get('/generations/:id', async (c) => {
  const id = c.req.param('id');
  const data = await c.env.GENERATIONS.get(id);

  if (!data) {
    return c.json({ error: 'Generation not found' }, 404);
  }

  return c.json(JSON.parse(data) as Generation);
});

// Stream audio from R2
shareRouter.get('/audio/:id', async (c) => {
  const id = c.req.param('id');
  const object = await c.env.AUDIO_BUCKET.get(`${id}.mp3`);

  if (!object) {
    return c.json({ error: 'Audio not found' }, 404);
  }

  return new Response(object.body, {
    headers: {
      'Content-Type': 'audio/mpeg',
      'Cache-Control': 'public, max-age=86400',
      'Content-Disposition': `inline; filename="wikisounds-${id}.mp3"`,
    },
  });
});
