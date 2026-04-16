# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**WikiSounds** (repo: soundmatch) — Paste any text, get its song. A hackathon project for ElevenHacks #4 (turbopuffer + ElevenLabs).

Indexes Wikipedia's music genre taxonomy into turbopuffer for semantic retrieval. User input is embedded and matched against genre descriptions, then OpenAI synthesizes a music generation prompt from the genres + a summary of the user's text, and ElevenLabs generates a 30-second custom track. Audio is stored in R2 with shareable URLs.

## Build Commands

```bash
npm run build:frontend   # Build React SPA → public/
npm run dev              # wrangler dev (local Worker + SPA)
npm run deploy           # Build frontend + wrangler deploy
npm run crawl            # Crawl Wikipedia corpus → scripts/corpus.json
npm run index            # Embed corpus + upsert to turbopuffer
npm run pipeline         # crawl + index (run once before first use)
```

## Architecture

**Single Cloudflare Worker** (Hono) serving API routes at `/api/*`. React SPA served as static assets from `public/` with SPA fallback. Data pipeline scripts run locally with Node.

- `src/index.ts` — Hono entry, CORS, routes, SPA fallback via ASSETS binding
- `src/routes/music.ts` — `POST /api/text-to-music` (embed → turbopuffer → prompt → ElevenLabs → R2 + KV)
- `src/routes/share.ts` — `GET /api/generations/:id` (KV metadata), `GET /api/audio/:id` (R2 stream)
- `src/services/` — embeddings, turbopuffer, elevenlabs, prompt (all raw fetch, no SDKs in Worker)
- `frontend/` — React SPA with Vite (builds to `../public`)
- `scripts/` — Wikipedia crawler + turbopuffer indexer (use SDKs, run locally)

## Deployment

- **Production:** https://wikisounds.ammonb.workers.dev
- **Secrets:** Set via `wrangler secret put` (TURBOPUFFER_API_KEY, ELEVENLABS_API_KEY, OPENAI_API_KEY)
- **R2 bucket:** `wikisounds-audio` (stores generated MP3s)
- **KV namespace:** `GENERATIONS` (stores generation metadata, 30-day TTL)
- **turbopuffer namespace:** `wikisounds-genres`

## Key Design Decisions

- Raw `fetch` in Worker (no OpenAI/turbopuffer SDKs) to avoid Node.js bundle issues
- Audio stored in R2, metadata in KV — enables shareable URLs at `/share/:id`
- OpenAI chat completion builds music prompts that reference topics/people from the pasted text
- Genre tags displayed prominently as the core demo visual proving turbopuffer retrieval works

## Reference

Full spec with pseudocode: `PRD.md`
