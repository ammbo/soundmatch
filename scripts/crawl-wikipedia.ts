import { writeFileSync } from 'fs';

const USER_AGENT = 'WikiSounds/1.0 (hackathon; wikisounds@example.com)';
const API_BASE = 'https://en.wikipedia.org/w/api.php';

interface Document {
  id: string;
  title: string;
  text: string;
  source: string;
}

function slugify(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 63);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function wikiFetch(params: Record<string, string>): Promise<any> {
  const url = new URL(API_BASE);
  url.searchParams.set('format', 'json');
  url.searchParams.set('origin', '*');
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v);
  }

  const res = await fetch(url.toString(), {
    headers: { 'User-Agent': USER_AGENT },
  });

  if (!res.ok) {
    throw new Error(`Wikipedia API error: ${res.status} ${await res.text()}`);
  }

  return res.json();
}

// ── Source 1: "List of styles of music" pages ─────────────────────
// These have compact one-liner descriptions — ideal embedding units
async function fetchListPages(): Promise<Document[]> {
  const pages = [
    'List_of_styles_of_music:_A–F',
    'List_of_styles_of_music:_G–M',
    'List_of_styles_of_music:_N–Z',
  ];

  const documents: Document[] = [];
  const seen = new Set<string>();

  for (const page of pages) {
    console.log(`Fetching list page: ${page}`);
    const data = await wikiFetch({
      action: 'query',
      titles: page,
      prop: 'extracts',
      explaintext: 'true',
    });

    const pageData = Object.values(data.query.pages)[0] as any;
    const text = pageData.extract || '';

    // Parse entries like "Genre name – description text"
    const regex = /^([A-Za-z][^\n–—]+?)\s*[–—]\s*(.+)$/gm;
    let match;
    while ((match = regex.exec(text)) !== null) {
      const name = match[1].trim();
      const description = match[2].trim();

      if (name.length < 2 || description.length < 20) continue;
      if (seen.has(name.toLowerCase())) continue;

      seen.add(name.toLowerCase());
      documents.push({
        id: slugify(name),
        title: name,
        text: description.slice(0, 1000),
        source: 'list',
      });
    }

    await sleep(200);
  }

  console.log(`Source 1: ${documents.length} genres from list pages`);
  return documents;
}

// ── Source 2: "List of music genres and styles" page links ────────
// Fetch all internal links, filter to only genre/style articles
function isGenreLink(title: string): boolean {
  // Exclude non-genre articles
  const excludePatterns = [
    /^Music of /,
    /^History of/,
    /^List of/,
    /^Styles of/,
    /^Index of/,
    /^Outline of/,
    /^Glossary of/,
    /^Timeline of/,
    /^Category:/,
    /^Wikipedia:/,
    /^\d{4}s in music$/,
    /^Music (school|theory|technology|industry|education|festival|censorship|community|genre|hall|archaeology|psychology)$/i,
    /^Music and (fashion|political|politics|sleep)$/i,
    /^Music technology/,
    /^Musical (instrument|notation|technique|ensemble|theatre|composition|escapism|form|improvisation)$/i,
    /^Musical instrument/,
    /^(Musician|Vocalist|Guitarist|Bassist|Pianist|Drummer|Keyboardist|Disc jockey|Singing|Lyrics|Song|Album|Remix|Single|Play |Cover version|Record |Compilation|Extended play|Backing|Backup|Lead vocalist|One-man|Multi-instrumentalist|Band \(|Concert band|Military band)/,
    /^(Percussion|Oral tradition|Audio engineer|Virtuoso|Women in|Music school|Bachelor|Master of|Doctor of|Composition school)/,
    /^(Found object|Barbershop|A cappella|Collegiate|Nursery rhyme|National anthem|War song|Work song|Hymn|Worship|Sea shanty|March \(music\)|Children's music|Circus music|Incidental|Show tune|Theatre music|Christmas music|Religious music|Church music|Secular music)/,
    /^(Fictional music|Film$|Internet meme|Sound recording|Popular music|Independent music|Art music|Vernacular|Underground music$)/,
    /^(Environmentalism|Exercise and|Drug use|Zoomusicology|Biomusicology|Cognitive|Computational|Ethno?musicology|New musicology|Sociomusicology|Genealogy|Method \(music\))/,
    /^(Historically informed|Evolution of|Prehistoric music|Ancient music|Folk instrument|LGBT music|American patriotic|Bedroom production|Stomp \(jazz\))/,
    /^(Nunatak|Simon Frith|Lubbock|Working on Dying|Slab \(car\)|Vogue \(dance\)|Ball culture|Slow dance|Ballroom dance)/,
    /^(A-side|Aesthetics of|Angular harp|Arched Harp|Griot$|Yarsanism|Nafir|Jenkka|Passacaglia|Zortziko$)/,
    /^(Lists of|Bachelor of|Master of|Doctor of|Pinpeat|Piphat|Pichakaree|Play \()/,
  ];

  for (const pattern of excludePatterns) {
    if (pattern.test(title)) return false;
  }

  return true;
}

async function fetchGenrePageLinks(seen: Set<string>): Promise<string[]> {
  const allLinks: string[] = [];
  let plcontinue: string | null = null;

  do {
    const params: Record<string, string> = {
      action: 'query',
      titles: 'List_of_music_genres_and_styles',
      prop: 'links',
      pllimit: '500',
      plnamespace: '0',
    };
    if (plcontinue) params.plcontinue = plcontinue;

    const data = await wikiFetch(params);
    const page = Object.values(data.query.pages)[0] as any;
    allLinks.push(...(page.links || []).map((l: any) => l.title));
    plcontinue = data.continue?.plcontinue || null;
    await sleep(150);
  } while (plcontinue);

  console.log(`  Raw links from genre page: ${allLinks.length}`);

  // Filter to genre-related articles only
  const genreLinks = allLinks.filter((title) => {
    if (seen.has(title.toLowerCase())) return false;
    return isGenreLink(title);
  });

  console.log(`  After filtering: ${genreLinks.length} genre links`);
  return genreLinks;
}

async function fetchGenreArticles(seen: Set<string>): Promise<Document[]> {
  console.log('Fetching genre links from "List of music genres and styles"...');
  const genreTitles = await fetchGenrePageLinks(seen);

  // Batch-fetch article intros in chunks of 50
  const documents: Document[] = [];
  for (let i = 0; i < genreTitles.length; i += 50) {
    const batch = genreTitles.slice(i, i + 50);
    const titles = batch.join('|');

    const data = await wikiFetch({
      action: 'query',
      prop: 'extracts',
      exintro: 'true',
      explaintext: 'true',
      titles,
    });

    for (const page of Object.values(data.query.pages) as any[]) {
      const text = page.extract || '';
      if (text.length < 50) continue; // skip stubs

      seen.add(page.title.toLowerCase());
      documents.push({
        id: slugify(page.title),
        title: page.title,
        text: text.slice(0, 1000),
        source: 'genre-page',
      });
    }

    console.log(`  Fetched ${Math.min(i + 50, genreTitles.length)}/${genreTitles.length} articles`);
    await sleep(200);
  }

  console.log(`Source 2: ${documents.length} articles from genre page`);
  return documents;
}

// ── Source 3: High-value standalone articles ──────────────────────
async function fetchHighValueArticles(seen: Set<string>): Promise<Document[]> {
  const titles = [
    'Music and emotion',
    'Musical mood',
    'Film score',
    'Psychoacoustics',
    'Soundscape',
    'Music therapy',
    'Rhythm',
    'Harmony',
    'Melody',
    'Timbre',
    'Musical texture',
    'Dynamics (music)',
    'Tempo',
  ].filter((t) => !seen.has(t.toLowerCase()));

  if (titles.length === 0) return [];

  const data = await wikiFetch({
    action: 'query',
    prop: 'extracts',
    exintro: 'true',
    explaintext: 'true',
    titles: titles.join('|'),
  });

  const documents: Document[] = [];
  for (const page of Object.values(data.query.pages) as any[]) {
    const text = page.extract || '';
    if (text.length < 50) continue;

    documents.push({
      id: slugify(page.title),
      title: page.title,
      text: text.slice(0, 1000),
      source: 'high-value',
    });
  }

  console.log(`Source 3: ${documents.length} high-value articles`);
  return documents;
}

async function main() {
  console.log('WikiSounds Corpus Crawler v2');
  console.log('===========================');
  console.log('Sources: List of styles + List of genres and styles + high-value articles');
  console.log('No category recursion — genres only.\n');

  const allDocuments: Document[] = [];
  const seen = new Set<string>();

  // Source 1: List pages (one-liner descriptions)
  const listDocs = await fetchListPages();
  allDocuments.push(...listDocs);
  for (const doc of listDocs) seen.add(doc.title.toLowerCase());

  // Source 2: Genre page links (article intros)
  const genreDocs = await fetchGenreArticles(seen);
  allDocuments.push(...genreDocs);

  // Source 3: High-value articles
  const highValueDocs = await fetchHighValueArticles(seen);
  allDocuments.push(...highValueDocs);

  console.log(`\nTotal: ${allDocuments.length} documents`);
  console.log(`  - List page entries: ${listDocs.length}`);
  console.log(`  - Genre page articles: ${genreDocs.length}`);
  console.log(`  - High-value: ${highValueDocs.length}`);

  // Write to file
  const outPath = new URL('./corpus.json', import.meta.url).pathname;
  writeFileSync(outPath, JSON.stringify(allDocuments, null, 2));
  console.log(`\nWritten to ${outPath}`);
}

main().catch((err) => {
  console.error('Crawler failed:', err);
  process.exit(1);
});
