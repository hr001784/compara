function renderContent(text) {
  if (!text) return null;
  const parts = text.split(/\*\*Understood:\*\*\s*/);
  if (parts.length < 2) {
    return <p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{text}</p>;
  }
  const rest = parts[1];
  const breakIdx = rest.indexOf('\n\n');
  const understood = breakIdx >= 0 ? rest.slice(0, breakIdx) : rest;
  const body = breakIdx >= 0 ? rest.slice(breakIdx + 2) : '';
  return (
    <>
      <div className="agent-understood-box">
        <span className="agent-understood-label">Agent understood</span>
        <p className="agent-understood-text">{understood.trim()}</p>
      </div>
      {body ? <p style={{ margin: '10px 0 0', whiteSpace: 'pre-wrap' }}>{body}</p> : null}
    </>
  );
}

export default function MessageBubble({ role, content, recipeName, source }) {
  const isUser = role === 'user';

  return (
    <div className={`chat-bubble-row ${isUser ? 'user' : ''}`}>
      <div className={`chat-avatar ${isUser ? 'user' : 'ai'}`}>{isUser ? 'You' : 'AI'}</div>
      <div className={`chat-bubble ${isUser ? 'user' : 'ai'}`}>
        {recipeName && isUser && (
          <span className="chat-recipe-label">Recipe · {recipeName}</span>
        )}
        {!isUser && source && (
          <span className="agent-source-tag">{String(source).replace('agent-', '')}</span>
        )}
        {renderContent(content)}
      </div>
    </div>
  );
}
