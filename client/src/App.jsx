import { useEffect, useState, useCallback } from 'react';
import ChatWindow from './components/ChatWindow.jsx';
import ChatInput from './components/ChatInput.jsx';
import JsonViewer from './components/JsonViewer.jsx';
import WireframePreview from './components/WireframePreview.jsx';
import RecipePanel from './components/RecipePanel.jsx';
import { useLayoutAgent } from './hooks/useLayoutAgent.js';
import { useRecipes } from './hooks/useRecipes.js';
import { checkHealth } from './utils/api.js';

export default function App() {
  const { layout, messages, loading, sendMessage, resetLayout } = useLayoutAgent();
  const {
    allRecipes,
    recentRecipes,
    starredIds,
    markRecent,
    toggleStar,
    saveRecipe,
    deleteRecipe,
  } = useRecipes();

  const [serverOk, setServerOk] = useState(null);
  const [llmConfigured, setLlmConfigured] = useState(false);
  const [activeRecipeId, setActiveRecipeId] = useState(null);
  const [recipesOpen, setRecipesOpen] = useState(false);
  const [pendingSavePrompt, setPendingSavePrompt] = useState(null);

  useEffect(() => {
    checkHealth()
      .then((data) => {
        setServerOk(true);
        setLlmConfigured(data.llmConfigured);
      })
      .catch((err) => {
        console.error('Health check failed:', err);
        setServerOk(false);
      });
  }, []);

  const applyRecipe = useCallback(
    async (recipe) => {
      setActiveRecipeId(recipe.id);
      markRecent(recipe.id);
      const steps = recipe.prompt.split(/\s*,\s*then\s*|\s+then\s+/i);
      for (let i = 0; i < steps.length; i++) {
        await sendMessage(steps[i].trim(), {
          recipeName: i === 0 ? recipe.name : undefined,
        });
      }
      setActiveRecipeId(null);
      setRecipesOpen(false);
    },
    [sendMessage, markRecent]
  );

  const handleSaveRecipe = useCallback(
    (form) => {
      saveRecipe({
        ...form,
        prompt: form.prompt || pendingSavePrompt || '',
      });
      setPendingSavePrompt(null);
    },
    [saveRecipe, pendingSavePrompt]
  );

  const openSaveRecipe = useCallback((prompt) => {
    setPendingSavePrompt(prompt);
    setRecipesOpen(true);
  }, []);

  const statusClass =
    serverOk === false ? 'offline' : llmConfigured ? 'online' : 'rules';
  const statusLabel =
    serverOk === false ? 'Server offline' : llmConfigured ? 'Claude connected' : 'Smart rules active';

  return (
    <div className="app-shell">
      <div className="app-bg" aria-hidden>
        <div className="app-bg-orb app-bg-orb--1" />
        <div className="app-bg-orb app-bg-orb--2" />
      </div>

      <header className="app-header">
        <div className="app-header-inner">
          <div className="brand">
            <div className="brand-logo">
              <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 5h16v2H4V5zm0 8h6v6H4v-6zm12-6h4v12h-4V7z" />
              </svg>
            </div>
            <div>
              <h1>Compra Layout Agent</h1>
              <p>AI-powered design layout studio</p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button
              type="button"
              className="btn-ghost mobile-recipes-toggle"
              onClick={() => setRecipesOpen(true)}
            >
              ☰ Recipes
            </button>
            <span className={`status-pill ${statusClass}`}>
              <span className="status-dot" />
              {statusLabel}
            </span>
            <button type="button" className="btn-ghost" onClick={resetLayout}>
              Reset canvas
            </button>
          </div>
        </div>
      </header>

      <main className="app-main">
        <div className={`recipes-drawer ${recipesOpen ? 'open' : ''}`}>
          {recipesOpen && (
            <button
              type="button"
              className="recipes-overlay"
              onClick={() => setRecipesOpen(false)}
              aria-label="Close recipes"
            />
          )}
          <RecipePanel
            recipes={allRecipes}
            starredIds={starredIds}
            recentRecipes={recentRecipes}
            onApply={applyRecipe}
            onToggleStar={toggleStar}
            onSaveRecipe={handleSaveRecipe}
            onDeleteRecipe={deleteRecipe}
            loading={loading}
            activeRecipeId={activeRecipeId}
            initialPrompt={pendingSavePrompt || ''}
          />
        </div>

        <section className="chat-panel">
          <div className="chat-panel-header">
            <h2>Design Assistant</h2>
            <p>Describe changes or apply a saved recipe</p>
          </div>
          <ChatWindow messages={messages} loading={loading} />
          <ChatInput
            onSend={(text) => sendMessage(text)}
            onSaveAsRecipe={openSaveRecipe}
            loading={loading}
            disabled={serverOk === false}
          />
        </section>

        <section className="preview-panel">
          <WireframePreview layout={layout} />
          <JsonViewer layout={layout} />
        </section>
      </main>
    </div>
  );
}
