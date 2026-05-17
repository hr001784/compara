export function validateLayout(layout) {
  if (!layout || typeof layout !== 'object') {
    throw new Error('Layout must be an object');
  }
  if (!Array.isArray(layout.rootNodes) || layout.rootNodes.length === 0) {
    throw new Error('rootNodes must be a non-empty array');
  }
  if (!layout.nodes || typeof layout.nodes !== 'object') {
    throw new Error('nodes must be an object');
  }

  for (const id of layout.rootNodes) {
    const node = layout.nodes[id];
    if (!node) throw new Error(`Missing root node: ${id}`);
    if (node.type !== 'artboard') throw new Error(`Root node ${id} must be artboard`);
  }

  const artboard = layout.nodes[layout.rootNodes[0]];
  if (artboard.children) {
    for (const childId of artboard.children) {
      const child = layout.nodes[childId];
      if (!child) throw new Error(`Missing child node: ${childId}`);
      for (const key of ['x', 'y', 'width', 'height', 'nx', 'ny', 'nw', 'nh']) {
        if (typeof child[key] !== 'number' || Number.isNaN(child[key])) {
          throw new Error(`Node ${childId} missing valid ${key}`);
        }
      }
    }
  }

  return true;
}
