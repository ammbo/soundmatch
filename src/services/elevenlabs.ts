export async function generateMusic(prompt: string, apiKey: string): Promise<ArrayBuffer> {
  const res = await fetch('https://api.elevenlabs.io/v1/sound-generation', {
    method: 'POST',
    headers: {
      'xi-api-key': apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      text: prompt,
      duration_seconds: 30,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`ElevenLabs error: ${res.status} ${err}`);
  }

  return res.arrayBuffer();
}
