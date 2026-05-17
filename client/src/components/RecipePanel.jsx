import { useMemo, useState, useEffect } from 'react';
import { RECIPE_CATEGORIES } from '../data/recipes.js';

function RecipeCard({ recipe, starred, onApply, onToggleStar, onDelete, loading, activeId }) {
  const isActive = loading && activeId === recipe.id;

  return (
    <article className={`recipe-card ${isActive ? 'active' : ''}`}>
      <div className="recipe-card-top">
        <span className="recipe-icon" aria-hidden>
          {recipe.icon}
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 4 }}>
            <h3>{recipe.name}</h3>
            <button
              type="button"
              onClick={() => onToggleStar(recipe.id)}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontSize: '1rem',
                color: starred ? '#fbbf24' : 'rgba(255,255,255,0.25)',
                padding: 0,
              }}
              aria-label={starred ? 'Unstar' : 'Star'}
            >
              {starred ? '★' : '☆'}
            </button>
          </div>
          <p className="recipe-card-desc">{recipe.description}</p>
          <span className="recipe-tag">{recipe.category}</span>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
        <button
          type="button"
          className="recipe-apply-btn"
          disabled={loading}
          onClick={() => onApply(recipe)}
        >
          {isActive ? 'Applying…' : 'Apply recipe'}
        </button>
        {recipe.custom && (
          <button
            type="button"
            className="btn-ghost"
            onClick={() => onDelete(recipe.id)}
            style={{ padding: '10px 12px' }}
          >
            ✕
          </button>
        )}
      </div>
    </article>
  );
}

export default function RecipePanel({
  recipes,
  starredIds,
  recentRecipes,
  onApply,
  onToggleStar,
  onSaveRecipe,
  onDeleteRecipe,
  loading,
  activeRecipeId,
  initialPrompt = '',
}) {
  const [category, setCategory] = useState('all');
  const [search, setSearch] = useState('');
  const [showSaveForm, setShowSaveForm] = useState(false);
  const [form, setForm] = useState({
    name: '',
    description: '',
    prompt: initialPrompt,
    category: 'campaign',
  });

  useEffect(() => {
    if (initialPrompt) {
      setForm((f) => ({ ...f, prompt: initialPrompt }));
      setShowSaveForm(true);
    }
  }, [initialPrompt]);

  const filtered = useMemo(() => {
    return recipes.filter((r) => {
      const matchCat = category === 'all' || r.category === category;
      const q = search.toLowerCase();
      const matchSearch =
        !q ||
        r.name.toLowerCase().includes(q) ||
        r.description.toLowerCase().includes(q) ||
        r.prompt.toLowerCase().includes(q);
      return matchCat && matchSearch;
    });
  }, [recipes, category, search]);

  const featured = filtered.filter((r) => r.featured);
  const rest = filtered.filter((r) => !r.featured);

  const handleSave = (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.prompt.trim()) return;
    onSaveRecipe(form);
    setForm({ name: '', description: '', prompt: '', category: 'campaign' });
    setShowSaveForm(false);
  };

  const inputStyle = {
    width: '100%',
    padding: '10px 12px',
    borderRadius: 10,
    border: '1px solid rgba(255,255,255,0.1)',
    background: 'rgba(255,255,255,0.04)',
    color: '#fff',
    fontSize: '0.8rem',
    outline: 'none',
    fontFamily: 'inherit',
  };

  return (
    <aside className="recipes-panel">
      <div className="recipes-panel-header">
        <h2>Saved Recipes</h2>
        <p>One-click layout transforms</p>
        <div className="recipe-search">
          <span className="recipe-search-icon">⌕</span>
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search recipes…"
          />
        </div>
        <div className="recipe-categories">
          {RECIPE_CATEGORIES.map((c) => (
            <button
              key={c.id}
              type="button"
              className={`recipe-cat-btn ${category === c.id ? 'active' : ''}`}
              onClick={() => setCategory(c.id)}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      <div className="recipes-scroll">
        {recentRecipes.length > 0 && category === 'all' && !search && (
          <section style={{ marginBottom: 16 }}>
            <p className="recipe-section-title">Recent</p>
            {recentRecipes.map((recipe) => (
              <RecipeCard
                key={`r-${recipe.id}`}
                recipe={recipe}
                starred={starredIds.includes(recipe.id)}
                onApply={onApply}
                onToggleStar={onToggleStar}
                onDelete={onDeleteRecipe}
                loading={loading}
                activeId={activeRecipeId}
              />
            ))}
          </section>
        )}

        {featured.length > 0 && (
          <section style={{ marginBottom: 16 }}>
            <p className="recipe-section-title">Featured</p>
            {featured.map((recipe) => (
              <RecipeCard
                key={recipe.id}
                recipe={recipe}
                starred={starredIds.includes(recipe.id)}
                onApply={onApply}
                onToggleStar={onToggleStar}
                onDelete={onDeleteRecipe}
                loading={loading}
                activeId={activeRecipeId}
              />
            ))}
          </section>
        )}

        <section>
          <p className="recipe-section-title">
            {category === 'all'
              ? 'All recipes'
              : RECIPE_CATEGORIES.find((c) => c.id === category)?.label}
          </p>
          {rest.length === 0 && featured.length === 0 ? (
            <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontSize: '0.8rem', padding: 24 }}>
              No recipes found
            </p>
          ) : (
            rest.map((recipe) => (
              <RecipeCard
                key={recipe.id}
                recipe={recipe}
                starred={starredIds.includes(recipe.id)}
                onApply={onApply}
                onToggleStar={onToggleStar}
                onDelete={onDeleteRecipe}
                loading={loading}
                activeId={activeRecipeId}
              />
            ))
          )}
        </section>
      </div>

      <div className="recipes-footer">
        {showSaveForm ? (
          <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <input
              required
              style={inputStyle}
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="Recipe name"
            />
            <input
              style={inputStyle}
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="Description (optional)"
            />
            <textarea
              required
              rows={2}
              style={{ ...inputStyle, resize: 'none' }}
              value={form.prompt}
              onChange={(e) => setForm((f) => ({ ...f, prompt: e.target.value }))}
              placeholder="Agent prompt…"
            />
            <select
              style={inputStyle}
              value={form.category}
              onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
            >
              {RECIPE_CATEGORIES.filter((c) => c.id !== 'all').map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="submit" className="recipe-apply-btn">
                Save recipe
              </button>
              <button type="button" className="btn-ghost" onClick={() => setShowSaveForm(false)}>
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <button
            type="button"
            className="btn-ghost"
            style={{ width: '100%', borderStyle: 'dashed' }}
            onClick={() => setShowSaveForm(true)}
          >
            + Save custom recipe
          </button>
        )}
      </div>
    </aside>
  );
}
