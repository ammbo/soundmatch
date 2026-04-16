import type { Genre } from '../types';

export async function queryGenres(vector: number[], apiKey: string): Promise<Genre[]> {
  const res = await fetch('https://api.turbopuffer.com/v2/namespaces/wikisounds-genres/query', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      rank_by: ['vector', 'ANN', vector],
      top_k: 5,
      include_attributes: ['title', 'text'],
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`turbopuffer query error: ${res.status} ${err}`);
  }

  const data = await res.json() as {
    rows: { id: string; $dist: number; title: string; text: string }[];
  };

  return data.rows.map((row) => ({
    title: row.title,
    text: row.text,
    score: Math.round((1 - row.$dist) * 100) / 100,
  }));
}
