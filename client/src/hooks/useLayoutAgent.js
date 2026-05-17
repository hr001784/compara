import { useState, useCallback } from 'react';
import initialLayout from '../data/initialLayout.json';
import { sendChatMessage } from '../utils/api.js';

const WELCOME =
  'Welcome to Compra Layout Agent. I use an **Agent Node** to interpret your message before editing the layout — you will see “Agent understood” on each reply.\n\nTry: “Convert to 9:16”, “Move the headline to the top”, or use **Saved Recipes** on the left. For vague requests, add ANTHROPIC_API_KEY in server/.env.';

export function useLayoutAgent() {
  const [layout, setLayout] = useState(initialLayout);
  const [messages, setMessages] = useState([
    { role: 'assistant', content: WELCOME },
  ]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const sendMessage = useCallback(
    async (text, meta = {}) => {
      const trimmed = text.trim();
      if (!trimmed || loading) return;

      const userMsg = {
        role: 'user',
        content: trimmed,
        recipeName: meta.recipeName,
      };
      const historyForApi = messages
        .filter((m) => m.role === 'user' || m.role === 'assistant')
        .slice(-6)
        .map(({ role, content }) => ({ role, content }));

      setMessages((prev) => [...prev, userMsg]);
      setLoading(true);
      setError(null);

      try {
        const data = await sendChatMessage({
          message: trimmed,
          layout,
          history: historyForApi,
        });

        setLayout(data.updatedLayout);

        let reply = data.explanation || 'Layout updated successfully.';
        if (data.understood) {
          reply = `**Understood:** ${data.understood}\n\n${reply}`;
        }

        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            content: reply,
            understood: data.understood,
            actions: data.actions,
            source: data.source,
          },
        ]);
      } catch (err) {
        let msg =
          err.response?.data?.explanation ||
          err.response?.data?.error ||
          null;

        if (!msg) {
          if (err.code === 'ERR_NETWORK' || err.message?.includes('Network Error')) {
            const api = import.meta.env.VITE_API_URL || '(not set — using /api)';
            msg = `Cannot reach the API (${api}). On Vercel set VITE_API_URL=https://compara.onrender.com/api and redeploy. On Render set CLIENT_URL to your Vercel URL.`;
          } else if (err.response?.status === 403 || err.response?.status === 0) {
            msg =
              'Request blocked (likely CORS). On Render, set CLIENT_URL to your exact Vercel URL, e.g. https://compara-gzf8.vercel.app';
          } else {
            msg = `Something went wrong: ${err.message || 'unknown error'}. Check the browser console (F12).`;
          }
        }

        setError(msg);
        setMessages((prev) => [...prev, { role: 'assistant', content: msg }]);
      } finally {
        setLoading(false);
      }
    },
    [layout, loading, messages]
  );

  const resetLayout = useCallback(() => {
    setLayout(initialLayout);
    setMessages([{ role: 'assistant', content: WELCOME }]);
    setError(null);
  }, []);

  return { layout, messages, loading, error, sendMessage, resetLayout };
}
