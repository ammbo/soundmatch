import { Hono } from 'hono';
import type { Bindings, Generation } from '../types';
import { embedText } from '../services/embeddings';
import { queryGenres } from '../services/turbopuffer';
import { generateMusic } from '../services/elevenlabs';
import { buildMusicPrompt } from '../services/prompt';

export const musicRouter = new Hono<{ Bindings: Bindings }>();

musicRouter.post('/text-to-music', async (c) => {
  const { text } = await c.req.json<{ text: string }>();

  if (!text || text.trim().length === 0) {
    return c.json({ error: 'Text is required' }, 400);
  }

  // 1. Embed the user input
  const vector = await embedText(text, c.env.OPENAI_API_KEY);

  // 2. Query turbopuffer for genre matches
  const genres = await queryGenres(vector, c.env.TURBOPUFFER_API_KEY);

  // 3. Build a rich music prompt using OpenAI
  const prompt = await buildMusicPrompt(text, genres, c.env.OPENAI_API_KEY);

  // 4. Generate music with ElevenLabs
  const audioBuffer = await generateMusic(prompt, c.env.ELEVENLABS_API_KEY);

  // 5. Store in R2 with a unique ID
  const id = crypto.randomUUID().slice(0, 8);
  await c.env.AUDIO_BUCKET.put(`${id}.mp3`, audioBuffer, {
    httpMetadata: { contentType: 'audio/mpeg' },
  });

  // 6. Store generation metadata in KV
  const generation: Generation = {
    id,
    genres,
    prompt,
    textSnippet: text.slice(0, 300),
    createdAt: new Date().toISOString(),
  };
  await c.env.GENERATIONS.put(id, JSON.stringify(generation), {
    expirationTtl: 60 * 60 * 24 * 30, // 30 days
  });

  return c.json(generation);
});
