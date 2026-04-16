import 'dotenv/config';
import { readFileSync } from 'fs';
import { Turbopuffer } from '@turbopuffer/turbopuffer';
import OpenAI from 'openai';

interface Document {
  id: string;
  title: string;
  text: string;
  source: string;
}

async function main() {
  const apiKey = process.env.TURBOPUFFER_API_KEY;
  const openaiKey = process.env.OPENAI_API_KEY;

  if (!apiKey || !openaiKey) {
    console.error('Missing TURBOPUFFER_API_KEY or OPENAI_API_KEY in .env');
    process.exit(1);
  }

  // Read corpus
  const corpusPath = new URL('./corpus.json', import.meta.url).pathname;
  const documents: Document[] = JSON.parse(readFileSync(corpusPath, 'utf-8'));
  console.log(`Loaded ${documents.length} documents from corpus.json\n`);

  const tpuf = new Turbopuffer({ apiKey });
  const openai = new OpenAI({ apiKey: openaiKey });
  const ns = tpuf.namespace('wikisounds-genres');

  // Optional: resume from a specific offset
  const startFrom = parseInt(process.env.START_FROM || '0', 10);

  // Process in batches of 100
  let failures = 0;
  for (let i = startFrom; i < documents.length; i += 100) {
    const batch = documents.slice(i, i + 100);
    const texts = batch.map((d) => `${d.title}: ${d.text}`);

    try {
      // Embed batch
      const embeddingRes = await openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: texts,
      });

      // Upsert to turbopuffer (IDs must be < 64 bytes)
      const vectors = batch.map((doc, j) => ({
        id: doc.id.slice(0, 63),
        vector: embeddingRes.data[j].embedding,
        attributes: {
          title: doc.title,
          text: doc.text.slice(0, 500),
          source: doc.source,
        },
      }));

      await ns.upsert({ vectors, distance_metric: 'cosine_distance' });
      console.log(`Indexed ${Math.min(i + 100, documents.length)}/${documents.length}`);
    } catch (err) {
      failures++;
      console.error(`Batch at ${i} failed:`, (err as Error).message);
    }
  }

  if (failures > 0) {
    console.log(`\n${failures} batch(es) failed.`);
  }

  console.log('\nDone! Namespace "wikisounds-genres" is ready.');
}

main().catch((err) => {
  console.error('Indexing failed:', err);
  process.exit(1);
});
