import { useState } from 'react';

export default function JsonViewer({ layout }) {
  const [collapsed, setCollapsed] = useState(false);
  const [copied, setCopied] = useState(false);
  const rootId = layout?.rootNodes?.[0];
  const artboard = rootId ? layout.nodes[rootId] : null;
  const json = JSON.stringify(layout, null, 2);

  const copy = async () => {
    await navigator.clipboard.writeText(json);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="json-panel">
      <button type="button" className="json-panel-header" onClick={() => setCollapsed((c) => !c)}>
        <span style={{ fontWeight: 600, fontSize: '0.88rem' }}>
          <span style={{ color: '#a78bfa', marginRight: 6 }}>{ }</span>
          Layout JSON
        </span>
        <span style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.4)' }}>
          {artboard ? `${artboard.width}×${artboard.height}` : '—'} · {collapsed ? 'Show' : 'Hide'}
        </span>
      </button>
      {!collapsed && (
        <div style={{ position: 'relative' }}>
          <button
            type="button"
            onClick={copy}
            className="btn-ghost"
            style={{ position: 'absolute', right: 12, top: 10, zIndex: 2, padding: '6px 10px', fontSize: '0.65rem' }}
          >
            {copied ? 'Copied!' : 'Copy'}
          </button>
          <pre className="json-pre">{json}</pre>
        </div>
      )}
    </div>
  );
}
