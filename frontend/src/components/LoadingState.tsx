import { useState, useEffect } from 'react';

const STAGES = [
  { message: 'Reading your words...', duration: 2000 },
  { message: 'Finding sonic DNA...', duration: 3000 },
  { message: 'Matching genres from 4,000+ entries...', duration: 3000 },
  { message: 'Composing your prompt...', duration: 3000 },
  { message: 'Generating your track...', duration: 8000 },
  { message: 'Almost there...', duration: 30000 },
];

export function LoadingState() {
  const [stageIndex, setStageIndex] = useState(0);

  useEffect(() => {
    const stage = STAGES[stageIndex];
    if (stageIndex >= STAGES.length - 1) return;

    const timer = setTimeout(() => {
      setStageIndex((i) => i + 1);
    }, stage.duration);

    return () => clearTimeout(timer);
  }, [stageIndex]);

  return (
    <div className="loading-container">
      <div className="equalizer">
        {Array.from({ length: 24 }).map((_, i) => (
          <div
            key={i}
            className="eq-bar"
            style={{
              animationDelay: `${i * 0.07}s`,
              height: `${20 + Math.random() * 60}%`,
            }}
          />
        ))}
      </div>

      <p className="loading-message" key={stageIndex}>
        {STAGES[stageIndex].message}
      </p>

      <div className="loading-progress">
        <div
          className="loading-progress-bar"
          style={{
            width: `${Math.min(((stageIndex + 1) / STAGES.length) * 100, 95)}%`,
          }}
        />
      </div>
    </div>
  );
}
