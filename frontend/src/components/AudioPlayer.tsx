import { useRef, useState, useEffect } from 'react';

export function AudioPlayer({ generationId }: { generationId: string }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
      setProgress(audio.duration ? (audio.currentTime / audio.duration) * 100 : 0);
    };
    const onLoaded = () => setDuration(audio.duration);
    const onEnded = () => setPlaying(false);

    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('loadedmetadata', onLoaded);
    audio.addEventListener('ended', onEnded);

    return () => {
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('loadedmetadata', onLoaded);
      audio.removeEventListener('ended', onEnded);
    };
  }, []);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (playing) {
      audio.pause();
    } else {
      audio.play();
    }
    setPlaying(!playing);
  };

  const seek = (e: React.MouseEvent<HTMLDivElement>) => {
    const audio = audioRef.current;
    if (!audio || !audio.duration) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const pct = (e.clientX - rect.left) / rect.width;
    audio.currentTime = pct * audio.duration;
  };

  const formatTime = (s: number) => {
    const mins = Math.floor(s / 60);
    const secs = Math.floor(s % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="audio-player">
      <audio ref={audioRef} src={`/api/audio/${generationId}`} preload="auto" />

      <button className="play-btn" onClick={togglePlay}>
        {playing ? (
          <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor">
            <rect x="6" y="4" width="4" height="16" rx="1" />
            <rect x="14" y="4" width="4" height="16" rx="1" />
          </svg>
        ) : (
          <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor">
            <path d="M8 5v14l11-7z" />
          </svg>
        )}
      </button>

      <div className="player-track" onClick={seek}>
        <div className="player-progress" style={{ width: `${progress}%` }}>
          <div className="player-thumb" />
        </div>
        {/* Animated bars behind progress */}
        <div className="player-bars">
          {Array.from({ length: 60 }).map((_, i) => (
            <div
              key={i}
              className={`player-bar ${playing ? 'player-bar-active' : ''}`}
              style={{
                height: `${15 + Math.sin(i * 0.5) * 35 + Math.random() * 25}%`,
                animationDelay: `${i * 0.05}s`,
                opacity: (i / 60) <= progress / 100 ? 1 : 0.2,
              }}
            />
          ))}
        </div>
      </div>

      <div className="player-time">
        {formatTime(currentTime)} / {formatTime(duration || 30)}
      </div>
    </div>
  );
}
