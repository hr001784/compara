# Approach Note

## Agent Node (input understanding)

User messages are not applied directly to the layout. They pass through `runAgentNode()`:

1. **Rule interpreter** — Maps phrases to typed actions (`resize_artboard`, `move_node`, etc.) using role names (headline, product, offerBadge).
2. **LLM intent node** (optional) — If rules fail and `ANTHROPIC_API_KEY` is set, Claude returns only a small JSON action plan—not full layout JSON.
3. **Executor** — `executeAgentPlan()` runs each action via tested helpers in `layoutTransforms.js`.

The UI shows **“Agent understood”** so users can verify interpretation before reading the result summary.

## LLM Prompt Structure (legacy full-layout path)

The system prompt defines four layers:

1. **Role** — layout transformation agent that edits design JSON only.
2. **Schema** — artboard as root; every child has absolute and normalized coordinates; text uses `style.visual.fontSize` and `fontSizeRatio`.
3. **Semantics** — how to infer headline, product, discount badge, offer CTA, and background from `name` and `data.content`.
4. **Output contract** — strict JSON: `{ explanation, updatedLayout }` with no markdown fences.

The current layout is embedded in the prompt on every request. The last focused node ID is included when available to help resolve follow-ups like “make it bigger.”

## Safe JSON Transformation

1. **Never mutate input** — all helpers use `structuredClone` before edits.
2. **Validate on exit** — `validateLayout` checks `rootNodes`, `nodes`, artboard type, and numeric fields on children before any response is sent.
3. **Parse defensively** — LLM responses are parsed with fallback extraction if the model wraps JSON in code fences.
4. **Hybrid execution** — deterministic handlers run first for aspect ratio, move, resize, and color changes. This avoids hallucinated node IDs and keeps math (normalized → absolute) correct. The LLM handles ambiguous or compound instructions.

Normalized coordinates (`nx`, `ny`, `nw`, `nh`) are the source of truth when resizing the artboard; absolute `x`, `y`, `width`, `height` are recomputed from them.

## Conversation Context

- The frontend sends the last **6 messages** with each request.
- The backend tracks **lastFocusedNodeId** after deterministic or successful LLM edits so pronouns (“it”, “that”) map to the recently edited element.
- Role detection (`findNodesByRole`) uses content patterns (e.g. “Luxury Comfort” → headline) rather than hard-coded IDs, so the agent survives JSON ID changes.

## Trade-offs

| Choice | Benefit | Cost |
|--------|---------|------|
| Rules before LLM | Fast, free, reliable for demo prompts | Extra maintenance for new phrase patterns |
| Full layout in prompt | Model sees complete context | Large token usage on big designs |
| Wireframe divs vs canvas | Simple, updates with React state | Not pixel-perfect vs real assets |
| Claude Sonnet default | Good JSON adherence | Requires API key for edge cases |

**With more time:** tool-calling (LLM returns `{ action, params }` only), undo/redo stack, visual diff highlighting, and integration tests for each golden prompt.
