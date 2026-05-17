import { Router } from 'express';
import { validateLayout } from '../utils/jsonValidator.js';
import { runAgentNode } from '../services/agentNode.js';
import { tryDeterministicTransform } from '../services/intentHandler.js';

const router = Router();

router.post('/', async (req, res) => {
  try {
    const { message, layout, history = [] } = req.body;

    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'message is required' });
    }
    if (!layout) {
      return res.status(400).json({ error: 'layout is required' });
    }

    validateLayout(layout);

    // Agent Node: interpret user intent → action plan → execute
    const result = await runAgentNode(message, layout, history);

    if (result.ok) {
      return res.json({
        explanation: result.explanation,
        understood: result.understood,
        updatedLayout: result.updatedLayout,
        source: result.source,
        actions: result.actions,
        confidence: result.confidence,
      });
    }

    // Fallback: legacy deterministic (slightly broader patterns)
    const deterministic = tryDeterministicTransform(message, layout);
    if (deterministic) {
      validateLayout(deterministic.updatedLayout);
      return res.json({
        explanation: deterministic.explanation,
        understood: deterministic.explanation,
        updatedLayout: deterministic.updatedLayout,
        source: 'deterministic-fallback',
        actions: [],
      });
    }

    const status = result.source === 'agent-none' && !process.env.ANTHROPIC_API_KEY ? 400 : 200;
    return res.status(status).json({
      error: result.explanation,
      explanation: result.explanation,
      understood: result.understood,
      updatedLayout: layout,
      source: result.source,
      actions: [],
    });
  } catch (err) {
    console.error('Chat error:', err.message);
    return res.status(500).json({
      error: err.message || 'Failed to process request',
      explanation: `Sorry, I could not update the layout: ${err.message}`,
    });
  }
});

export default router;
