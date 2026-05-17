import Anthropic from '@anthropic-ai/sdk';
import { buildSystemPrompt } from '../prompts/systemPrompt.js';
import { validateLayout } from '../utils/jsonValidator.js';
import { getLastFocusedNodeId } from './intentHandler.js';

const client = process.env.ANTHROPIC_API_KEY
  ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  : null;

function extractJson(text) {
  const trimmed = text.trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    const fence = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (fence) return JSON.parse(fence[1].trim());
    const start = trimmed.indexOf('{');
    const end = trimmed.lastIndexOf('}');
    if (start >= 0 && end > start) {
      return JSON.parse(trimmed.slice(start, end + 1));
    }
    throw new Error('Could not parse JSON from LLM response');
  }
}

export async function callLLM(layout, history, userMessage) {
  if (!client) {
    throw new Error('ANTHROPIC_API_KEY is not configured');
  }

  const system = buildSystemPrompt(layout, getLastFocusedNodeId());
  const messages = [
    ...history
      .filter((m) => m.role === 'user' || m.role === 'assistant')
      .map((m) => ({
        role: m.role,
        content: m.content,
      })),
    { role: 'user', content: userMessage },
  ];

  const response = await client.messages.create({
    model: process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-20250514',
    max_tokens: 8192,
    system,
    messages,
  });

  const text = response.content
    .filter((block) => block.type === 'text')
    .map((block) => block.text)
    .join('');

  const parsed = extractJson(text);

  if (!parsed.updatedLayout) {
    throw new Error('LLM response missing updatedLayout');
  }

  validateLayout(parsed.updatedLayout);

  return {
    explanation: parsed.explanation || 'Layout updated.',
    updatedLayout: parsed.updatedLayout,
  };
}
