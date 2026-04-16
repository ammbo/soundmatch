import { useState } from 'react';

interface Genre {
  title: string;
  text: string;
  score: number;
}

const TAG_COLORS = [
  '#8b5cf6',
  '#ec4899',
  '#06b6d4',
  '#f59e0b',
  '#22c55e',
  '#3b82f6',
  '#a855f7',
  '#ef4444',
];

export function GenreTags({ genres }: { genres: Genre[] }) {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  return (
    <div className="genres-section">
      <span className="genres-label">Matched genres</span>
      <div className="genre-tags">
        {genres.map((genre, i) => (
          <div
            key={genre.title}
            className="genre-tag-wrapper"
            style={{ animationDelay: `${i * 0.12}s` }}
          >
            <button
              className={`genre-tag ${expandedIndex === i ? 'genre-tag-active' : ''}`}
              style={{
                '--tag-color': TAG_COLORS[i % TAG_COLORS.length],
                '--tag-color-alpha': `${TAG_COLORS[i % TAG_COLORS.length]}22`,
              } as React.CSSProperties}
              onClick={() => setExpandedIndex(expandedIndex === i ? null : i)}
            >
              <span className="genre-score">{Math.round(genre.score * 100)}%</span>
              {genre.title}
            </button>
            {expandedIndex === i && (
              <div className="genre-description" style={{ borderColor: TAG_COLORS[i % TAG_COLORS.length] }}>
                {genre.text}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
