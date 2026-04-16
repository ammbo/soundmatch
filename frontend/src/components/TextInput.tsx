import { useState } from 'react';

interface TextInputProps {
  onGenerate: (text: string) => void;
  error: string | null;
}

export function TextInput({ onGenerate, error }: TextInputProps) {
  const [text, setText] = useState('');

  return (
    <div className="input-section">
      <div className="textarea-wrapper">
        <textarea
          className="text-input"
          placeholder="Paste anything — a Slack thread, a poem, a job rejection, a recipe, a Wikipedia article, your inner monologue..."
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={6}
          maxLength={2000}
        />
        <div className="char-count">
          <span className={text.length > 1800 ? 'char-warn' : ''}>
            {text.length}
          </span>
          /2000
        </div>
      </div>

      {error && (
        <div className="error-msg">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" fill="currentColor"/>
          </svg>
          {error}
        </div>
      )}

      <button
        className="generate-btn"
        disabled={text.trim().length === 0}
        onClick={() => onGenerate(text)}
      >
        <span className="btn-text">Generate My Song</span>
        <span className="btn-icon">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55C7.79 13 6 14.79 6 17s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" fill="currentColor"/>
          </svg>
        </span>
      </button>
    </div>
  );
}
