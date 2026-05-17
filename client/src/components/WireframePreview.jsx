import { useEffect, useRef, useState } from 'react';

function getRatioLabel(w, h) {
  if (w === h) return '1:1';
  if (h > w) return '9:16';
  if (w / h >= 1.7) return '16:9';
  return '4:5';
}

function LayerNode({ node }) {
  const fit = node.data?.fit || 'cover';
  const visual = node.style?.visual || {};

  if (node.type === 'image' && node.data?.sourceUrl) {
    return (
      <img
        src={node.data.sourceUrl}
        alt={node.name || 'Layer'}
        draggable={false}
        style={{
          position: 'absolute',
          left: node.x,
          top: node.y,
          width: node.width,
          height: node.height,
          objectFit: fit,
          objectPosition: 'center',
          pointerEvents: 'none',
          userSelect: 'none',
        }}
      />
    );
  }

  if (node.type === 'text') {
    const color = visual.color?.value || '#ffffff';
    const fontSize = visual.fontSize || 24;
    return (
      <div
        style={{
          position: 'absolute',
          left: node.x,
          top: node.y,
          width: node.width,
          height: node.height,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          color,
          fontSize,
          fontFamily: visual.fontFamily || 'Arial, sans-serif',
          fontWeight: visual.fontWeight || 600,
          fontStyle: visual.fontStyle || 'normal',
          lineHeight: 1.15,
          whiteSpace: 'pre-wrap',
          overflow: 'hidden',
          pointerEvents: 'none',
          textShadow: '0 1px 4px rgba(0,0,0,0.5)',
        }}
      >
        {node.data?.content}
      </div>
    );
  }

  if (node.type === 'shape') {
    const fill = visual.fill?.value || '#F4CF1B';
    const isCircle = node.data?.shapeType === 'circle';
    return (
      <div
        style={{
          position: 'absolute',
          left: node.x,
          top: node.y,
          width: node.width,
          height: node.height,
          background: fill,
          borderRadius: isCircle ? '50%' : 4,
          border: visual.stroke?.value ? `2px solid ${visual.stroke.value}` : 'none',
        }}
      />
    );
  }

  return null;
}

export default function WireframePreview({ layout }) {
  const containerRef = useRef(null);
  const [scale, setScale] = useState(0.38);
  const [view, setView] = useState('rendered');

  const rootId = layout?.rootNodes?.[0];
  const artboard = rootId ? layout.nodes[rootId] : null;
  const compositeUrl = layout?.imageUrl;

  useEffect(() => {
    const el = containerRef.current;
    if (!el || !artboard) return;

    const update = () => {
      const w = el.clientWidth || 420;
      const s = Math.min(w / artboard.width, 1);
      setScale(s);
    };

    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [artboard?.width, artboard?.height, layout]);

  if (!artboard) {
    return (
      <div className="preview-card preview-card--empty">
        No layout to preview
      </div>
    );
  }

  const scaledH = artboard.height * scale;
  const childIds = artboard.children || [];

  return (
    <div className="preview-card preview-card--canvas">
      <div className="preview-card-header">
        <div>
          <h2>Canvas Preview</h2>
          <p>See your design update in real time</p>
        </div>
        <div className="preview-badges">
          <span className="preview-badge ratio">{getRatioLabel(artboard.width, artboard.height)}</span>
          <span className="preview-badge size">
            {artboard.width} × {artboard.height}
          </span>
        </div>
      </div>

      <div className="canvas-view-tabs">
        <button
          type="button"
          className={`canvas-view-tab ${view === 'rendered' ? 'active' : ''}`}
          onClick={() => setView('rendered')}
          disabled={!compositeUrl}
        >
          Full design
        </button>
        <button
          type="button"
          className={`canvas-view-tab ${view === 'layers' ? 'active' : ''}`}
          onClick={() => setView('layers')}
        >
          Live layers
        </button>
      </div>

      <div className="canvas-viewport" ref={containerRef}>
        {view === 'rendered' && compositeUrl ? (
          <div className="canvas-rendered-wrap" style={{ height: scaledH }}>
            <img
              src={compositeUrl}
              alt="Full design preview"
              className="canvas-rendered-img"
              style={{
                width: artboard.width * scale,
                height: artboard.height * scale,
              }}
            />
          </div>
        ) : (
          <div className="canvas-scaled-wrap" style={{ height: scaledH }}>
            <div
              className="canvas-artboard"
              style={{
                width: artboard.width,
                height: artboard.height,
                transform: `scale(${scale})`,
              }}
            >
              {childIds.map((id) => {
                const node = layout.nodes[id];
                if (!node) return null;
                return <LayerNode key={id} node={node} />;
              })}
            </div>
          </div>
        )}
      </div>

      <p className="canvas-hint">
        {view === 'rendered'
          ? 'Rendered snapshot of the design. Switch to Live layers after edits.'
          : 'Layers rebuild from JSON — images, text, and shapes at true positions.'}
      </p>

      <div className="canvas-legend">
        <span>🖼 Images</span>
        <span>✏️ Text</span>
        <span>⬤ Shapes</span>
      </div>
    </div>
  );
}
