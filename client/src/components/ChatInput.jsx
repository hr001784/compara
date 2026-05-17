import { useState } from 'react';

export default function ChatInput({ onSend, onSaveAsRecipe, loading, disabled }) {
  const [text, setText] = useState('');

  const submit = (e) => {
    e.preventDefault();
    if (!text.trim() || loading || disabled) return;
    onSend(text);
    setText('');
  };

  return (
    <div className="chat-input-area">
      <form className="chat-form" onSubmit={submit}>
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Describe a layout change…"
          disabled={loading || disabled}
        />
        {text.trim() && !loading && (
          <button
            type="button"
            className="btn-ghost"
            title="Save as recipe"
            onClick={() => {
              onSaveAsRecipe?.(text);
              setText('');
            }}
          >
            ★ Save
          </button>
        )}
        <button type="submit" className="btn-send" disabled={loading || disabled || !text.trim()}>
          Send
        </button>
      </form>
    </div>
  );
}
