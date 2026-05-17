import {
  resizeArtboardByPreset,
  resizeArtboard,
  findNodesByRole,
  moveNode,
  resizeNode,
  setTextColor,
  keepProductLarge,
} from './layoutTransforms.js';

let lastFocusedNodeId = null;

export function getLastFocusedNodeId() {
  return lastFocusedNodeId;
}

export function setLastFocusedNodeId(id) {
  lastFocusedNodeId = id;
}

function matchAspectRatio(message) {
  const m = message.toLowerCase();
  if (/9\s*:\s*16|9:16|story|reel|vertical/i.test(m)) return '9:16';
  if (/16\s*:\s*9|16:9|youtube|landscape/i.test(m)) return '16:9';
  if (/4\s*:\s*5|4:5|portrait/i.test(m)) return '4:5';
  if (/1\s*:\s*1|1:1|square|instagram post/i.test(m)) return '1:1';
  return null;
}

function resolveTarget(message, roles) {
  const m = message.toLowerCase();

  if (/headline|main title|luxury comfort/i.test(m)) {
    return roles.headline?.id;
  }
  if (/subhead|tagline|comfort that defines/i.test(m)) {
    return roles.subheadline?.id;
  }
  if (/offer badge|limited time|cta/i.test(m)) {
    return roles.offerBadge?.id;
  }
  if (/discount|badge|20%|off badge/i.test(m)) {
    return roles.discountBadge?.id;
  }
  if (/product/i.test(m)) {
    return roles.product?.id;
  }
  if (/background/i.test(m)) {
    return roles.background?.id;
  }
  if (/it|that|this|same/i.test(m) && lastFocusedNodeId) {
    return lastFocusedNodeId;
  }

  return null;
}

export function tryDeterministicTransform(message, layout) {
  const m = message.toLowerCase().trim();
  const roles = findNodesByRole(layout);
  let updated = layout;
  let explanation = null;
  let handled = false;

  const aspect = matchAspectRatio(m);
  if (aspect && /convert|resize|change|make|to\s+\d|aspect|ratio|format/i.test(m)) {
    updated = resizeArtboardByPreset(layout, aspect);
    explanation = `Converted the artboard to ${aspect} (${updated.nodes[updated.rootNodes[0]].width}×${updated.nodes[updated.rootNodes[0]].height}).`;
    handled = true;
  }

  if (!handled && /keep.*product.*large|product.*large|large product/i.test(m)) {
    updated = keepProductLarge(layout);
    if (roles.product) setLastFocusedNodeId(roles.product.id);
    explanation = 'Kept the product image large and centered toward the lower area.';
    handled = true;
  }

  const targetId = resolveTarget(m, roles);

  if (!handled && targetId) {
    if (/move|position|place|put/i.test(m)) {
      let position = 'center';
      if (/top/i.test(m)) position = 'top';
      else if (/bottom/i.test(m)) position = 'bottom';
      else if (/center|centre|middle/i.test(m)) position = 'center';
      else if (/left/i.test(m)) position = 'left';
      else if (/right/i.test(m)) position = 'right';
      else if (/higher|up|raise/i.test(m)) position = 'higher';
      else if (/lower|down/i.test(m)) position = 'lower';

      updated = moveNode(layout, targetId, position);
      setLastFocusedNodeId(targetId);
      const node = layout.nodes[targetId];
      const label = node?.data?.content?.slice(0, 30) || node?.name || 'element';
      explanation = `Moved "${label.trim()}" toward the ${position}.`;
      handled = true;
    }

    if (!handled && /headline/i.test(m) && /(bigger|larger|increase|grow)/i.test(m)) {
      updated = resizeNode(layout, targetId, 1.25);
      setLastFocusedNodeId(targetId);
      explanation = 'Made the headline bigger.';
      handled = true;
    }

    if (!handled && /(smaller|reduce|decrease|shrink)/i.test(m)) {
      updated = resizeNode(layout, targetId, 0.75);
      setLastFocusedNodeId(targetId);
      explanation = 'Made the selected element smaller.';
      handled = true;
    }

    if (!handled && /(bigger|larger|increase|grow)/i.test(m)) {
      updated = resizeNode(layout, targetId, 1.25);
      setLastFocusedNodeId(targetId);
      explanation = 'Made the selected element bigger.';
      handled = true;
    }

    if (!handled && /(red|blue|green|yellow|white|black|#[0-9a-f]{3,8})/i.test(m)) {
      const colorMatch = m.match(/#[0-9a-f]{3,8}|red|blue|green|yellow|white|black/i);
      const colorMap = {
        red: '#FF0000',
        blue: '#0000FF',
        green: '#00FF00',
        yellow: '#FFFF00',
        white: '#FFFFFF',
        black: '#000000',
      };
      const color = colorMatch[0].startsWith('#') ? colorMatch[0] : colorMap[colorMatch[0].toLowerCase()];
      if (layout.nodes[targetId]?.type === 'text') {
        updated = setTextColor(layout, targetId, color);
        setLastFocusedNodeId(targetId);
        explanation = `Changed the text color to ${color}.`;
        handled = true;
      }
    }
  }

  if (!handled && /(smaller|bigger|larger)/i.test(m) && lastFocusedNodeId) {
    const scale = /smaller|shrink|reduce/i.test(m) ? 0.75 : 1.25;
    updated = resizeNode(layout, lastFocusedNodeId, scale);
    explanation = scale < 1 ? 'Made it smaller.' : 'Made it bigger.';
    handled = true;
  }

  if (!handled && /discount/i.test(m) && /(bigger|larger)/i.test(m) && roles.discountBadge) {
    updated = resizeNode(layout, roles.discountBadge.id, 1.3);
    setLastFocusedNodeId(roles.discountBadge.id);
    explanation = 'Made the discount badge bigger.';
    handled = true;
  }

  if (!handled && /center.*product|product.*center/i.test(m)) {
    if (roles.product) {
      updated = moveNode(layout, roles.product.id, 'center');
      setLastFocusedNodeId(roles.product.id);
      explanation = 'Centered the product on the canvas.';
      handled = true;
    }
  }

  return handled ? { updatedLayout: updated, explanation } : null;
}

export function applyAction(layout, action) {
  switch (action?.type) {
    case 'resize_artboard':
      if (action.preset) return resizeArtboardByPreset(layout, action.preset);
      return resizeArtboard(layout, action.width, action.height);
    case 'move_node':
      return moveNode(layout, action.nodeId, action.position);
    case 'resize_node':
      return resizeNode(layout, action.nodeId, action.scale);
    case 'set_text_color':
      return setTextColor(layout, action.nodeId, action.color);
    case 'keep_product_large':
      return keepProductLarge(layout);
    default:
      return layout;
  }
}
