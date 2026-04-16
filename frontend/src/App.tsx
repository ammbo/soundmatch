import { Routes, Route } from 'react-router-dom';
import { useState } from 'react';
import { TextInput } from './components/TextInput';
import { LoadingState } from './components/LoadingState';
import { GenreTags } from './components/GenreTags';
import { AudioPlayer } from './components/AudioPlayer';
import { SharePage } from './components/SharePage';

interface Genre {
  title: string;
  text: string;
  score: number;
}

interface GenerationResult {
  id: string;
  genres: Genre[];
  prompt: string;
  textSnippet: string;
}

function HomePage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<GenerationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showResult, setShowResult] = useState(false);

  const handleGenerate = async (text: string) => {
    setLoading(true);
    setResult(null);
    setError(null);
    setShowResult(false);

    try {
      const res = await fetch('/api/text-to-music', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Generation failed');
      }

      const data: GenerationResult = await res.json();
      setResult(data);
      // Small delay for the reveal animation
      setTimeout(() => setShowResult(true), 100);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setResult(null);
    setShowResult(false);
    setError(null);
  };

  return (
    <div className="page">
      <header className="hero">
        <div className="logo-glow" />
        <h1 className="logo">
          Wiki<span className="logo-accent">Sounds</span>
        </h1>
        <p className="tagline">Paste any text. Get its song.</p>
      </header>

      {!loading && !result && (
        <TextInput onGenerate={handleGenerate} error={error} />
      )}

      {loading && <LoadingState />}

      {result && (
        <div className={`result ${showResult ? 'result-visible' : ''}`}>
          <div className="result-header">
            <div className="result-success">
              <div className="success-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" fill="currentColor"/>
                </svg>
              </div>
              <span>Your track is ready</span>
            </div>
          </div>

          <GenreTags genres={result.genres} />

          <div className="prompt-display">
            <span className="prompt-label">Music prompt</span>
            <p className="prompt-text">{result.prompt}</p>
          </div>

          <AudioPlayer generationId={result.id} />

          <div className="share-section">
            <button
              className="share-btn"
              onClick={() => {
                const url = `${window.location.origin}/share/${result.id}`;
                navigator.clipboard.writeText(url);
                const btn = document.querySelector('.share-btn');
                if (btn) {
                  btn.textContent = 'Link copied!';
                  setTimeout(() => { btn.textContent = 'Share this track'; }, 2000);
                }
              }}
            >
              Share this track
            </button>
            <button className="reset-btn" onClick={handleReset}>
              Make another
            </button>
          </div>
        </div>
      )}

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

export function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/share/:id" element={<SharePage />} />
    </Routes>
  );
}
