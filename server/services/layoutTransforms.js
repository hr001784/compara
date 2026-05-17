const ASPECT_PRESETS = {
  '1:1': { width: 1080, height: 1080 },
  '9:16': { width: 1080, height: 1920 },
  '16:9': { width: 1920, height: 1080 },
  '4:5': { width: 1080, height: 1350 },
};

export function getArtboard(layout) {
  const rootId = layout.rootNodes[0];
  return { id: rootId, node: layout.nodes[rootId] };
}

export function syncAbsolute(node, artboard) {
  node.x = node.nx * artboard.width;
  node.y = node.ny * artboard.height;
  node.width = node.nw * artboard.width;
  node.height = node.nh * artboard.height;
}

export function syncNormalized(node, artboard) {
  const w = artboard.width || 1;
  const h = artboard.height || 1;
  node.nx = node.x / w;
  node.ny = node.y / h;
  node.nw = node.width / w;
  node.nh = node.height / h;
}

export function resizeArtboard(layout, newWidth, newHeight) {
  const updated = structuredClone(layout);
  const { node: artboard } = getArtboard(updated);

  artboard.width = newWidth;
  artboard.height = newHeight;

  for (const childId of artboard.children || []) {
    const node = updated.nodes[childId];
    if (!node) continue;
    syncAbsolute(node, artboard);

    if (node.type === 'text' && node.style?.visual?.fontSize != null) {
      const ratio = node.fontSizeRatio ?? node.style.visual.fontSize / (layout.nodes[layout.rootNodes[0]].height || 1080);
      node.fontSizeRatio = ratio;
      node.style.visual.fontSize = Math.round(ratio * newHeight);
    }
  }

  return updated;
}

export function resizeArtboardByPreset(layout, preset) {
  const size = ASPECT_PRESETS[preset];
  if (!size) throw new Error(`Unknown aspect preset: ${preset}`);
  return resizeArtboard(layout, size.width, size.height);
}

export function findNodesByRole(layout) {
  const { node: artboard } = getArtboard(layout);
  const children = (artboard.children || []).map((id) => layout.nodes[id]).filter(Boolean);

  const byName = (pattern) =>
    children.find((n) => pattern.test(n.name || '') || pattern.test(n.data?.content || ''));

  const textNodes = children.filter((n) => n.type === 'text');

  const headline =
    textNodes.find((n) => /luxury comfort|surprisingly attainable/i.test(n.data?.content || '')) ||
    textNodes.reduce((a, b) => ((a.style?.visual?.fontSize || 0) > (b.style?.visual?.fontSize || 0) ? a : b), textNodes[0]);

  const subheadline = textNodes.find((n) => /comfort that defines/i.test(n.data?.content || ''));

  const offerBadge = textNodes.find((n) => /limited time offer/i.test(n.data?.content || ''));

  const discountBadge =
    textNodes.find((n) => /%\s*off|off/i.test(n.data?.content || '') && n !== offerBadge) ||
    textNodes.find((n) => /20%/i.test(n.data?.content || ''));

  const product = children.find((n) => n.type === 'image' && /product/i.test(n.name || ''));

  const background = children.find((n) => n.type === 'image' && /background/i.test(n.name || ''));

  const discountCircle = children.find(
    (n) => n.type === 'shape' && n.data?.shapeType === 'circle'
  );

  return {
    headline,
    subheadline,
    offerBadge,
    discountBadge,
    discountCircle,
    product,
    background,
    textNodes,
    all: children,
  };
}

export function moveNode(layout, nodeId, position) {
  const updated = structuredClone(layout);
  const { node: artboard } = getArtboard(updated);
  const node = updated.nodes[nodeId];
  if (!node) throw new Error(`Node not found: ${nodeId}`);

  const pad = 0.02;
  const centerX = (1 - node.nw) / 2;
  const centerY = (1 - node.nh) / 2;

  switch (position) {
    case 'top':
      node.ny = pad;
      node.nx = centerX;
      break;
    case 'bottom':
      node.ny = 1 - node.nh - pad;
      node.nx = centerX;
      break;
    case 'center':
      node.nx = centerX;
      node.ny = centerY;
      break;
    case 'left':
      node.nx = pad;
      break;
    case 'right':
      node.nx = 1 - node.nw - pad;
      break;
    case 'higher':
    case 'up':
      node.ny = Math.max(pad, node.ny - 0.08);
      break;
    case 'lower':
    case 'down':
      node.ny = Math.min(1 - node.nh - pad, node.ny + 0.08);
      break;
    default:
      throw new Error(`Unknown position: ${position}`);
  }

  syncAbsolute(node, artboard);

  if (node.type === 'text' && /off|%/i.test(node.data?.content || '')) {
    const circle = Object.values(updated.nodes).find(
      (n) => n.type === 'shape' && n.data?.shapeType === 'circle'
    );
    if (circle) {
      circle.nx = node.nx - 0.025;
      circle.ny = node.ny - 0.01;
      syncAbsolute(circle, artboard);
    }
  }

  return updated;
}

export function resizeNode(layout, nodeId, scale) {
  const updated = structuredClone(layout);
  const { node: artboard } = getArtboard(updated);
  const node = updated.nodes[nodeId];
  if (!node) throw new Error(`Node not found: ${nodeId}`);

  const cx = node.nx + node.nw / 2;
  const cy = node.ny + node.nh / 2;

  node.nw = Math.min(1, Math.max(0.02, node.nw * scale));
  node.nh = Math.min(1, Math.max(0.02, node.nh * scale));
  node.nx = cx - node.nw / 2;
  node.ny = cy - node.nh / 2;

  syncAbsolute(node, artboard);

  if (node.type === 'text' && node.style?.visual) {
    const currentSize = node.style.visual.fontSize || 48;
    node.style.visual.fontSize = Math.max(12, Math.round(currentSize * scale));
    node.fontSizeRatio = node.style.visual.fontSize / artboard.height;
  }

  return updated;
}

export function setTextColor(layout, nodeId, color) {
  const updated = structuredClone(layout);
  const node = updated.nodes[nodeId];
  if (!node?.style?.visual) throw new Error('Not a stylable text node');
  node.style.visual.color = { type: 'solid', value: color };
  return updated;
}

export function keepProductLarge(layout) {
  const updated = structuredClone(layout);
  const roles = findNodesByRole(updated);
  if (!roles.product) return updated;

  const { node: artboard } = getArtboard(updated);
  const product = updated.nodes[roles.product.id];

  product.nw = Math.min(0.85, Math.max(product.nw, 0.7));
  product.nh = Math.min(0.4, Math.max(product.nh, 0.28));
  product.nx = (1 - product.nw) / 2;
  product.ny = Math.max(0.45, product.ny);

  syncAbsolute(product, artboard);
  return updated;
}
