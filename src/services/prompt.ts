import type { Genre } from '../types';

export async function buildMusicPrompt(
  userText: string,
  genres: Genre[],
  apiKey: string,
): Promise<string> {
  const genreList = genres
    .map((g, i) => `${i + 1}. ${g.title}: ${g.text.slice(0, 150)}`)
    .join('\n');

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      max_tokens: 200,
      messages: [
        {
          role: 'system',
          content: `You are a music director creating prompts for AI music generation. Given a user's text and matched music genres from Wikipedia, create a vivid, concise music generation prompt (max 280 characters).

The prompt should:
1. Specify the musical style based on the matched genres
2. Reference specific topics, people, or themes from the user's text so the music feels personal
3. Describe the mood, energy, and instrumentation
4. Be written as a direct description of the track

Output ONLY the music prompt, nothing else.`,
        },
        {
          role: 'user',
          content: `USER TEXT:\n${userText.slice(0, 500)}\n\nMATCHED GENRES:\n${genreList}\n\nCreate a music generation prompt.`,
        },
      ],
    }),
  });

  if (!res.ok) {
    // Fallback to simple template if OpenAI fails
    const topGenres = genres.slice(0, 3).map((g) => g.title).join(', ');
    return `Instrumental music blending ${topGenres}. Mood reflects: "${userText.slice(0, 150)}"`;
  }

  const data = await res.json() as {
    choices: { message: { content: string } }[];
  };

  return data.choices[0].message.content.trim();
}
