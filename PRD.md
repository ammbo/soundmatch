# WikiSounds — Project Spec
### ElevenHacks #4: turbopuffer + ElevenLabs

---

## Concept

Paste any text. Get its song.

WikiSounds indexes the entire Wikipedia music genre taxonomy into turbopuffer. When you paste anything — a Slack argument, a job rejection, a Reddit thread, a company about page — it semantically matches your text against thousands of human-written genre descriptions, then uses those retrieved descriptions to generate a custom track via ElevenLabs Music API.

turbopuffer is structurally necessary: without the retrieval layer, you're free-prompting ElevenLabs from raw input. With it, you're grounding generation in a curated musical vocabulary of the entire documented history of human musical expression. That's the pitch.

---

## Tech Stack

- **Frontend:** Single-page React app, make it look cool and edgy while remaining simple and straightforward
- **Backend:** Node.js (Express) or Cloudflare Workers
- **Vector DB:** turbopuffer
- **Embeddings:** OpenAI `text-embedding-3-small` (cheap, fast)
- **Music generation:** ElevenLabs Music API
- **Data source:** Wikipedia REST API (free, no key required)

---

## Data Pipeline — How to Fetch Wikipedia at Scale

This is the most important build step. Run it once before the demo. Target: **2,000-4,000 documents** in turbopuffer.

### Source 1: "List of Styles of Music" pages (highest density, do this first)

Wikipedia has three pages that are pure gold — compact one-liner descriptions of every documented music style:

```
https://en.wikipedia.org/wiki/List_of_styles_of_music:_A%E2%80%93F
https://en.wikipedia.org/wiki/List_of_styles_of_music:_G%E2%80%93M
https://en.wikipedia.org/wiki/List_of_styles_of_music:_N%E2%80%93Z
```

Each entry is structured like: `"Acid house – a psychedelic style of house music defined primarily by the deep basslines and squelching sounds of the Roland TB-303..."`. These are ideal embedding units — dense, descriptive, self-contained. Parse them with a simple regex and you get ~1,500 genre descriptions immediately.

Fetch via Wikipedia API (returns wikitext you can parse):
```
https://en.wikipedia.org/w/api.php?action=query&titles=List_of_styles_of_music:_A%E2%80%93F&prop=extracts&explaintext=true&format=json&origin=*
```

### Source 2: Wikipedia Category Tree (full genre articles)

Use the MediaWiki `categorymembers` API to recursively crawl music genre categories. Each article's intro paragraph is your document.

**Root categories to crawl (start here, recurse 2-3 levels deep):**

```
Category:Music genres
Category:Musical subgenres by genre
Category:21st-century music genres
Category:Electronic music genres
Category:Rock music genres
Category:Jazz genres
Category:Hip hop music genres
Category:Folk music genres
Category:Classical music genres
Category:Film score genres
Category:Music by mood          ← if it exists, it's perfect
Category:Ambient music
```

**Step 1: Get category members (paginated, up to 500 per call)**
```
https://en.wikipedia.org/w/api.php?action=query&list=categorymembers&cmtitle=Category:Music_genres&cmlimit=500&cmnamespace=0&format=json&origin=*
```
- `cmnamespace=0` returns articles only (not subcategories)
- Paginate with `cmcontinue` from response until exhausted
- For subcategories: repeat with `cmnamespace=14`, then recurse into each

**Step 2: Batch-fetch article intros (up to 50 titles per request)**
```
https://en.wikipedia.org/w/api.php?action=query&prop=extracts&exintro=true&explaintext=true&titles=POST-PUNK|AMBIENT|BOSSA+NOVA&format=json&origin=*
```
- `exintro=true` returns only the lead section (the good part — pure description)
- `explaintext=true` strips all wiki markup
- Pipe-separate up to 50 titles per call

**Step 3: Also fetch these specific high-value articles directly**
```
Music and emotion
Musical mood
Film score
Psychoacoustics
Soundscape
Ambient music
Music therapy
```

NOTE: You can also just fetch this page's HTML and get the links then fetch each (assuming it is comprehensive, worth testing):
https://en.wikipedia.org/wiki/List_of_music_genres_and_styles

### Crawler pseudocode

```javascript
async function fetchWikipediaCorpus() {
  const seen = new Set();
  const documents = [];
  
  // Phase 1: Parse list pages (fastest, highest density)
  const listPages = [
    'List_of_styles_of_music:_A–F',
    'List_of_styles_of_music:_G–M', 
    'List_of_styles_of_music:_N–Z'
  ];
  for (const page of listPages) {
    const text = await fetchWikiExtract(page);
    const entries = parseListPage(text); // regex: /^([A-Za-z].+?) – (.+)$/gm
    for (const [name, description] of entries) {
      if (!seen.has(name)) {
        seen.add(name);
        documents.push({ id: slugify(name), title: name, text: description, source: 'list' });
      }
    }
  }
  
  // Phase 2: Category tree crawl
  const rootCategories = [
    'Category:Music_genres',
    'Category:Electronic_music_genres',
    'Category:Rock_music_genres',
    'Category:Jazz_genres',
    'Category:Hip_hop_music_genres',
    'Category:Film_score_genres',
  ];
  
  const articleTitles = [];
  for (const cat of rootCategories) {
    await crawlCategory(cat, articleTitles, seen, depth=0, maxDepth=2);
  }
  
  // Phase 3: Batch fetch article intros in chunks of 50
  for (let i = 0; i < articleTitles.length; i += 50) {
    const batch = articleTitles.slice(i, i + 50);
    const extracts = await fetchBatchExtracts(batch);
    for (const [title, text] of Object.entries(extracts)) {
      if (text && text.length > 100) { // skip stubs
        documents.push({ id: slugify(title), title, text: text.slice(0, 1000), source: 'article' });
      }
    }
    await sleep(200); // be polite to Wikipedia
  }
  
  return documents;
}

async function crawlCategory(catTitle, titles, seen, depth, maxDepth) {
  if (depth > maxDepth) return;
  let cmcontinue = null;
  
  do {
    const url = `https://en.wikipedia.org/w/api.php?action=query&list=categorymembers` +
      `&cmtitle=${encodeURIComponent(catTitle)}&cmlimit=500&cmnamespace=0` +
      `&format=json&origin=*` + (cmcontinue ? `&cmcontinue=${cmcontinue}` : '');
    
    const res = await fetch(url);
    const data = await res.json();
    
    for (const member of data.query.categorymembers) {
      if (!seen.has(member.title)) {
        seen.add(member.title);
        titles.push(member.title);
      }
    }
    
    cmcontinue = data.continue?.cmcontinue || null;
    await sleep(150);
  } while (cmcontinue);
  
  // Also recurse into subcategories
  if (depth < maxDepth) {
    const subCatUrl = `https://en.wikipedia.org/w/api.php?action=query&list=categorymembers` +
      `&cmtitle=${encodeURIComponent(catTitle)}&cmlimit=500&cmnamespace=14&format=json&origin=*`;
    const res = await fetch(subCatUrl);
    const data = await res.json();
    for (const sub of data.query.categorymembers) {
      await crawlCategory(sub.title, titles, seen, depth + 1, maxDepth);
      await sleep(150);
    }
  }
}
```

**Expected yield:** ~2,500-4,000 unique documents. More than enough. turbopuffer handles this in seconds.

---

## Turbopuffer Indexing

```javascript
import { Turbopuffer } from "@turbopuffer/turbopuffer";
import OpenAI from "openai";

const tpuf = new Turbopuffer({ apiKey: process.env.TURBOPUFFER_API_KEY });
const openai = new OpenAI();
const ns = tpuf.namespace("wikisounds-genres");

async function indexDocuments(documents) {
  // Embed in batches of 100
  for (let i = 0; i < documents.length; i += 100) {
    const batch = documents.slice(i, i + 100);
    const texts = batch.map(d => `${d.title}: ${d.text}`);
    
    const embeddingRes = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: texts,
    });
    
    const vectors = batch.map((doc, j) => ({
      id: doc.id,
      vector: embeddingRes.data[j].embedding,
      attributes: {
        title: doc.title,
        text: doc.text.slice(0, 500), // store for retrieval
        source: doc.source,
      }
    }));
    
    await ns.upsert({ vectors, distance_metric: "cosine_distance" });
    console.log(`Indexed ${i + batch.length}/${documents.length}`);
  }
}
```

---

## Query + Generation Flow

```javascript
async function textToMusic(userInput) {
  // 1. Embed the user input
  const embedding = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: userInput,
  });
  
  // 2. Query turbopuffer for top 5 genre matches
  const results = await ns.query({
    vector: embedding.data[0].embedding,
    top_k: 5,
    include_attributes: ["title", "text"],
    distance_metric: "cosine_distance",
  });
  
  // 3. Build music generation prompt from retrieved genres
  const genreContext = results.map(r => 
    `${r.attributes.title}: ${r.attributes.text}`
  ).join("\n\n");
  
  const musicPrompt = buildMusicPrompt(userInput, genreContext);
  
  // 4. Generate with ElevenLabs Music API
  const response = await fetch("https://api.elevenlabs.io/v1/sound-generation", {
    method: "POST",
    headers: {
      "xi-api-key": process.env.ELEVENLABS_API_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      text: musicPrompt,
      duration_seconds: 30,
    }),
  });
  
  return response; // stream audio back to client
}

function buildMusicPrompt(userInput, genreContext) {
  // Use Claude to synthesize genre context into a clean music prompt
  // OR do it inline with a simple template:
  const topGenre = genreContext.split("\n")[0];
  return `Instrumental music in the style of: ${topGenre}. ` +
    `Tone should reflect the emotional quality of: "${userInput.slice(0, 200)}"`;
}
```

---

## Frontend

Single page. Keep it dead simple.

**Layout:**
```
[WikiSounds logo]
[Large textarea: "Paste anything..."]
[Generate button]

--- after generation ---
[Audio player with waveform]
[Matched genres displayed as tags: "Post-punk" "Shoegaze" "Cold wave"]
[Share button]
```

**The matched genres displayed as tags is important for the demo video** — it shows turbopuffer actually doing something visible. User pastes a Monday standup thread, sees the genres it matched ("Noise rock, Drone metal, Industrial"), then hears the track. That's the moment.

---

## Notes

- You do not have to use the code examples here. Do what makes sense.
- Wikipedia's API requires a `User-Agent` header identifying your app. Use: `WikiSounds/1.0 (hackathon; contact@youremail.com)`
- Rate limit: stay under 200 requests/minute to avoid getting throttled. 150ms sleep between calls is fine.
- Article intros (`exintro=true`) average ~300-600 words. Truncate to 800 chars before embedding to keep costs low.
- `text-embedding-3-small` is $0.02/million tokens. Embedding 4,000 docs at 500 tokens each = ~$0.04 total.
- turbopuffer free tier ($128 credits) handles this easily.
- ElevenLabs Music API is the `POST /v1/sound-generation` endpoint (same endpoint as sound effects — the `duration_seconds` param and text prompt style determine output character).