# WikiSounds

Paste any text. Get its song.

WikiSounds matches your text against thousands of Wikipedia music genres using [turbopuffer](https://turbopuffer.com) vector search, then generates a unique 30-second track with [ElevenLabs](https://elevenlabs.io). Built for ElevenHacks #4.

**Live:** https://wikisounds.ammonb.workers.dev

## How it works

1. Your text is embedded and matched against Wikipedia's music genre taxonomy via turbopuffer
2. OpenAI synthesizes a music generation prompt from the matched genres + a summary of your text
3. ElevenLabs generates a 30-second custom track
4. Audio is stored in Cloudflare R2 with a shareable URL

## Setup

```bash
npm install
cd frontend && npm install && cd ..

# Set secrets
wrangler secret put TURBOPUFFER_API_KEY
wrangler secret put ELEVENLABS_API_KEY
wrangler secret put OPENAI_API_KEY

# Index Wikipedia genres (one-time)
npm run pipeline

# Local dev
npm run dev

# Deploy
npm run deploy
```

## Stack

- **Runtime:** Cloudflare Workers (Hono)
- **Frontend:** React + Vite
- **Vector search:** turbopuffer
- **Music generation:** ElevenLabs
- **Storage:** Cloudflare R2 + KV
