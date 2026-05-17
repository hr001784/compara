import { useState, useCallback, useMemo } from 'react';
import { BUILT_IN_RECIPES } from '../data/recipes.js';

const STORAGE_KEY = 'layout-agent-saved-recipes';
const RECENT_KEY = 'layout-agent-recent-recipes';

function loadJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function saveJson(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

export function useRecipes() {
  const [customRecipes, setCustomRecipes] = useState(() =>
    loadJson(STORAGE_KEY, [])
  );
  const [recentIds, setRecentIds] = useState(() => loadJson(RECENT_KEY, []));
  const [starredIds, setStarredIds] = useState(() =>
    loadJson('layout-agent-starred', ['story-916', 'headline-top', 'keep-product-large'])
  );

  const allRecipes = useMemo(
    () => [...BUILT_IN_RECIPES, ...customRecipes],
    [customRecipes]
  );

  const markRecent = useCallback((id) => {
    setRecentIds((prev) => {
      const next = [id, ...prev.filter((x) => x !== id)].slice(0, 6);
      saveJson(RECENT_KEY, next);
      return next;
    });
  }, []);

  const toggleStar = useCallback((id) => {
    setStarredIds((prev) => {
      const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
      saveJson('layout-agent-starred', next);
      return next;
    });
  }, []);

  const saveRecipe = useCallback(({ name, description, prompt, category = 'campaign' }) => {
    const recipe = {
      id: `custom-${Date.now()}`,
      name: name.trim(),
      description: description.trim() || prompt.trim(),
      prompt: prompt.trim(),
      category,
      icon: '⭐',
      custom: true,
    };
    setCustomRecipes((prev) => {
      const next = [recipe, ...prev];
      saveJson(STORAGE_KEY, next);
      return next;
    });
    return recipe;
  }, []);

  const deleteRecipe = useCallback((id) => {
    setCustomRecipes((prev) => {
      const next = prev.filter((r) => r.id !== id);
      saveJson(STORAGE_KEY, next);
      return next;
    });
    setStarredIds((prev) => {
      const next = prev.filter((x) => x !== id);
      saveJson('layout-agent-starred', next);
      return next;
    });
  }, []);

  const starredRecipes = useMemo(
    () => allRecipes.filter((r) => starredIds.includes(r.id)),
    [allRecipes, starredIds]
  );

  const recentRecipes = useMemo(
    () =>
      recentIds
        .map((id) => allRecipes.find((r) => r.id === id))
        .filter(Boolean),
    [allRecipes, recentIds]
  );

  return {
    allRecipes,
    starredRecipes,
    recentRecipes,
    starredIds,
    markRecent,
    toggleStar,
    saveRecipe,
    deleteRecipe,
  };
}
