import Anthropic from '@anthropic-ai/sdk';
import { buildIntentSystemPrompt } from '../prompts/intentPrompt.js';
import {
  findNodesByRole,
  resizeArtboardByPreset,
  moveNode,
  resizeNode,
  setTextColor,
  keepProductLarge,
} from './layoutTransforms.js';
import { validateLayout } from '../utils/jsonValidator.js';
import { getLastFocusedNodeId, setLastFocusedNodeId } from './intentHandler.js';

const llmClient = process.env.ANTHROPIC_API_KEY
  ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  : null;

const ROLE_ALIASES = {
  headline: ['headline', 'main title', 'main text', 'luxury comfort', 'title'],
  subheadline: ['subheadline', 'subhead', 'tagline', 'comfort that defines'],
  offerBadge: ['offer', 'offer badge', 'limited time', 'cta'],
  discountBadge: ['discount', 'discount badge', '20%', 'off badge', 'badge'],
  product: ['product', 'sofa', 'couch', 'furniture'],
  background: ['background', 'bg'],
};

function normalizeMessage(msg) {
  return msg.toLowerCase().trim().replace(/\s+/g, ' ');
}

function matchRole(message) {
  const m = normalizeMessage(message);
  for (const [role, aliases] of Object.entries(ROLE_ALIASES)) {
    if (aliases.some((a) => m.includes(a))) return role;
  }
  if (/\b(it|that|this)\b/.test(m) && getLastFocusedNodeId()) {
    return resolveRoleFromNodeId(getLastFocusedNodeId());
  }
  return null;
}

function resolveRoleFromNodeId(nodeId, layout) {
  if (!nodeId || !layout) return null;
  const roles = findNodesByRole(layout);
  for (const [role, node] of Object.entries(roles)) {
    if (node?.id === nodeId) return role;
  }
  return null;
}

function resolveNodeId(layout, target) {
  if (!target) return getLastFocusedNodeId();
  const roles = findNodesByRole(layout);
  if (roles[target]?.id) return roles[target].id;
  if (layout.nodes[target]) return target;
  return getLastFocusedNodeId();
}

function matchAspect(message) {
  const m = normalizeMessage(message);
  if (/9\s*:\s*16|9:16|\bstory\b|\breel\b|\bvertical\b/.test(m)) return '9:16';
  if (/16\s*:\s*9|16:9|\byoutube\b|\blandscape\b/.test(m)) return '16:9';
  if (/4\s*:\s*5|4:5/.test(m)) return '4:5';
  if (/1\s*:\s*1|1:1|\bsquare\b/.test(m)) return '1:1';
  return null;
}

/** Rule-based intent interpreter — works without API key */
export function interpretIntentRules(message, layout) {
  const m = normalizeMessage(message);
  const actions = [];
  let understood = '';

  const aspect = matchAspect(m);
  const wantsResize =
    aspect &&
    (/convert|resize|change|make|format|aspect|ratio|to\b|canvas/i.test(m) ||
      m.length < 40);

  if (wantsResize) {
    actions.push({ type: 'resize_artboard', preset: aspect });
    understood = `Convert canvas to ${aspect} format`;
  }

  if (/keep.*product.*large|product.*large|large product/i.test(m)) {
    actions.push({ type: 'keep_product_large' });
    understood = understood ? `${understood}; keep product large` : 'Keep the product image large';
  }

  const role = matchRole(m) || resolveRoleFromNodeId(getLastFocusedNodeId(), layout);

  if (role && /move|position|place|put|shift|drag/i.test(m)) {
    let position = 'center';
    if (/top/i.test(m)) position = 'top';
    else if (/bottom/i.test(m)) position = 'bottom';
    else if (/center|centre|middle/i.test(m)) position = 'center';
    else if (/left/i.test(m)) position = 'left';
    else if (/right/i.test(m)) position = 'right';
    else if (/higher|up|raise/i.test(m)) position = 'higher';
    else if (/lower|down/i.test(m)) position = 'lower';

    actions.push({ type: 'move_node', target: role, position });
    understood = understood || `Move ${role} toward ${position}`;
  } else if (role && /headline.*top|top.*headline/i.test(m)) {
    actions.push({ type: 'move_node', target: 'headline', position: 'top' });
    understood = understood || 'Move headline to the top';
  } else if (role && /offer.*higher|higher.*offer/i.test(m)) {
    actions.push({ type: 'move_node', target: 'offerBadge', position: 'higher' });
    understood = understood || 'Move offer badge higher';
  }

  if (role && /(smaller|shrink|reduce|decrease)/i.test(m)) {
    actions.push({ type: 'resize_node', target: role, scale: 0.75 });
    understood = understood || `Make ${role} smaller`;
  } else if (role && /(bigger|larger|increase|grow)/i.test(m)) {
    const scale = /discount|badge/.test(m) ? 1.3 : 1.25;
    actions.push({ type: 'resize_node', target: role, scale });
    understood = understood || `Make ${role} bigger`;
  }

  const colorMatch = m.match(/#[0-9a-f]{3,8}\b|\b(red|blue|green|yellow|white|black)\b/i);
  if (role && colorMatch && (/(color|colour)/i.test(m) || /(headline|text|title).*(red|blue)/i.test(m))) {
    const colorMap = {
      red: '#FF0000',
      blue: '#0000FF',
      green: '#00FF00',
      yellow: '#FFFF00',
      white: '#FFFFFF',
      black: '#000000',
    };
    const raw = colorMatch[0];
    const color = raw.startsWith('#') ? raw : colorMap[raw.toLowerCase()];
    actions.push({ type: 'set_text_color', target: role, color });
    understood = understood || `Change ${role} color to ${color}`;
  }

  if (/center.*product|product.*center/i.test(m)) {
    actions.push({ type: 'move_node', target: 'product', position: 'center' });
    understood = understood || 'Center the product';
  }

  if (actions.length === 0) return null;

  return {
    understood: understood || message,
    confidence: 'high',
    actions,
    clarification: null,
    source: 'agent-rules',
  };
}

function extractJson(text) {
  const trimmed = text.trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    const fence = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (fence) return JSON.parse(fence[1].trim());
    const start = trimmed.indexOf('{');
    const end = trimmed.lastIndexOf('}');
    if (start >= 0 && end > start) return JSON.parse(trimmed.slice(start, end + 1));
    throw new Error('Could not parse agent intent JSON');
  }
}

export async function interpretIntentLLM(message, layout, history) {
  if (!llmClient) return null;

  const historySummary = history
    .slice(-4)
    .map((h) => `${h.role}: ${h.content}`)
    .join('\n');

  const system = buildIntentSystemPrompt(layout, getLastFocusedNodeId(), historySummary);

  const response = await llmClient.messages.create({
    model: process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-20250514',
    max_tokens: 1024,
    system,
    messages: [{ role: 'user', content: message }],
  });

  const text = response.content
    .filter((b) => b.type === 'text')
    .map((b) => b.text)
    .join('');

  const parsed = extractJson(text);
  return {
    understood: parsed.understood || message,
    confidence: parsed.confidence || 'medium',
    actions: Array.isArray(parsed.actions) ? parsed.actions : [],
    clarification: parsed.clarification || null,
    source: 'agent-llm-intent',
  };
}

export function executeAgentPlan(layout, plan) {
  let updated = structuredClone(layout);
  const applied = [];

  for (const action of plan.actions || []) {
    switch (action.type) {
      case 'resize_artboard': {
        updated = resizeArtboardByPreset(updated, action.preset);
        applied.push(`Resized artboard to ${action.preset}`);
        break;
      }
      case 'move_node': {
        const nodeId = resolveNodeId(updated, action.target);
        if (!nodeId) break;
        updated = moveNode(updated, nodeId, action.position);
        setLastFocusedNodeId(nodeId);
        applied.push(`Moved ${action.target} ${action.position}`);
        break;
      }
      case 'resize_node': {
        const nodeId = resolveNodeId(updated, action.target);
        if (!nodeId) break;
        updated = resizeNode(updated, nodeId, action.scale ?? 1.25);
        setLastFocusedNodeId(nodeId);
        applied.push(`Resized ${action.target}`);
        break;
      }
      case 'set_text_color': {
        const nodeId = resolveNodeId(updated, action.target);
        if (!nodeId) break;
        updated = setTextColor(updated, nodeId, action.color);
        setLastFocusedNodeId(nodeId);
        applied.push(`Updated ${action.target} color`);
        break;
      }
      case 'keep_product_large': {
        updated = keepProductLarge(updated);
        const roles = findNodesByRole(updated);
        if (roles.product) setLastFocusedNodeId(roles.product.id);
        applied.push('Kept product large');
        break;
      }
      case 'focus_target': {
        const nodeId = resolveNodeId(updated, action.target);
        if (nodeId) setLastFocusedNodeId(nodeId);
        applied.push(`Noted focus on ${action.target}`);
        break;
      }
      default:
        break;
    }
  }

  return { updatedLayout: updated, applied };
}

/**
 * Agent Node pipeline: interpret → (clarify?) → execute → respond
 */
export async function runAgentNode(message, layout, history = []) {
  let plan = interpretIntentRules(message, layout);

  if (!plan || plan.confidence === 'low') {
    const llmPlan = await interpretIntentLLM(message, layout, history);
    if (llmPlan) plan = llmPlan;
  }

  if (!plan) {
    return {
      ok: false,
      explanation:
        'I could not understand that request. Try being specific, e.g. "Move the headline to the top" or "Convert to 9:16".',
      understood: null,
      updatedLayout: layout,
      source: 'agent-none',
      actions: [],
    };
  }

  if (plan.clarification && (!plan.actions || plan.actions.length === 0)) {
    return {
      ok: false,
      explanation: plan.clarification,
      understood: plan.understood,
      updatedLayout: layout,
      source: plan.source,
      actions: [],
    };
  }

  if (!plan.actions?.length) {
    return {
      ok: false,
      explanation: plan.clarification || 'I understood but have no actions to apply. Can you rephrase?',
      understood: plan.understood,
      updatedLayout: layout,
      source: plan.source,
      actions: [],
    };
  }

  const { updatedLayout, applied } = executeAgentPlan(layout, plan);
  validateLayout(updatedLayout);

  const explanation =
    applied.length > 0
      ? `${applied.join('. ')}.`
      : 'Done.';

  return {
    ok: true,
    explanation,
    understood: plan.understood,
    updatedLayout,
    source: plan.source,
    actions: plan.actions,
    confidence: plan.confidence,
  };
}
