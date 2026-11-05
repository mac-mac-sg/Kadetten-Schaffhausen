// Darstellung: System (Standard), Hell oder Dunkel. theme-init.js setzt den Wert vor dem ersten Zeichnen.
export const THEME_KEY = 'v2:app-theme';
export const THEMES = [['system', 'System'], ['light', 'Hell'], ['dark', 'Dunkel']];

export function readTheme(storage = globalThis.localStorage) {
  try { const v = storage?.getItem(THEME_KEY); return v === 'light' || v === 'dark' ? v : 'system'; } catch { return 'system'; }
}

export function applyTheme(theme, root = globalThis.document?.documentElement, storage = globalThis.localStorage) {
  const value = theme === 'light' || theme === 'dark' ? theme : 'system';
  try { value === 'system' ? storage?.removeItem(THEME_KEY) : storage?.setItem(THEME_KEY, value); } catch {}
  if (!root) return value;
  if (value === 'system') delete root.dataset.theme; else root.dataset.theme = value;
  return value;
}
