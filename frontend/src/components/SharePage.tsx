import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { GenreTags } from './GenreTags';
import { AudioPlayer } from './AudioPlayer';

interface Genre {
  title: string;
  text: string;
  score: number;
}

interface Generation {
  id: string;
  genres: Genre[];
  prompt: string;
  textSnippet: string;
  createdAt: string;
}

export function SharePage() {
  const { id } = useParams<{ id: string }>();
  const [generation, setGeneration] = useState<Generation | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/generations/${id}`)
      .then((res) => {
        if (!res.ok) throw new Error('Generation not found');
        return res.json();
      })
      .then((data: Generation) => setGeneration(data))
      .catch((err) => setError(err.message));
  }, [id]);

  if (error) {
    return (
      <div className="page">
        <div className="share-error">
          <h2>Track not found</h2>
          <p>This track may have expired or the link might be wrong.</p>
          <Link to="/" className="cta-btn">Create your own</Link>
        </div>
      </div>
    );
  }

  if (!generation) {
    return (
      <div className="page">
        <div className="loading-container">
          <div className="equalizer mini-eq">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="eq-bar" style={{ animationDelay: `${i * 0.1}s` }} />
            ))}
          </div>
          <p className="loading-message">Loading track...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <header className="hero">
        <Link to="/" className="logo-link">
          <h1 className="logo">
            Wiki<span className="logo-accent">Sounds</span>
          </h1>
        </Link>
      </header>

      <div className="share-card">
        <div className="share-origin">
          <span className="share-origin-label">Generated from</span>
          <p className="share-origin-text">"{generation.textSnippet}"</p>
        </div>

        <GenreTags genres={generation.genres} />

        <div className="prompt-display">
          <span className="prompt-label">Music prompt</span>
          <p className="prompt-text">{generation.prompt}</p>
        </div>

        <AudioPlayer generationId={generation.id} />

        <Link to="/" className="cta-btn">
          Create your own song
        </Link>
      </div>

      <footer className="footer">
        <p>
          Built with{' '}
          <a href="https://turbopuffer.com" target="_blank" rel="noopener">turbopuffer</a>
          {' '}&times;{' '}
          <a href="https://elevenlabs.io" target="_blank" rel="noopener">ElevenLabs</a>
          {' '}for ElevenHacks #4
        </p>
      </footer>
    </div>
  );
}
