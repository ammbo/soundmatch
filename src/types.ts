export type Bindings = {
  TURBOPUFFER_API_KEY: string;
  ELEVENLABS_API_KEY: string;
  OPENAI_API_KEY: string;
  AUDIO_BUCKET: R2Bucket;
  GENERATIONS: KVNamespace;
};

export interface Genre {
  title: string;
  text: string;
  score: number;
}

export interface Generation {
  id: string;
  genres: Genre[];
  prompt: string;
  textSnippet: string;
  createdAt: string;
}
