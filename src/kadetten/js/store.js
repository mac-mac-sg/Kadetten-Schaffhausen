// Datenstand der App. Der letzte gültige Stand bleibt bei Ausfällen erhalten und liegt lokal,
// damit die App sofort etwas zeigen kann. Live-Stände werden nie gespeichert.

export const SNAPSHOT_KEY = 'v2:app-snapshot';

export function validSnapshot(data) {
  return Boolean(data && Array.isArray(data.games) && data.games.length > 0 && data.tables && typeof data.tables === 'object');
}

export function createStore({api, storage = safeStorage(), now = () => Date.now()}) {
  const listeners = new Set();
  const state = {data: null, savedAt: null, dataError: null, live: null, liveAt: null, liveError: null};
  try {
    const saved = JSON.parse(storage?.getItem(SNAPSHOT_KEY) || 'null');
    if (validSnapshot(saved?.data)) Object.assign(state, {data: saved.data, savedAt: saved.savedAt || null});
  } catch {}
  const emit = () => listeners.forEach(fn => fn(state));
  const extras = new Map();
  return {
    state,
    /**
     * Zusätzliche Daten (Berichte, Vorschauen, Duelle …) einmal laden und zwischenspeichern.
     * Liefert sofort den bekannten Stand {status:'loading'|'ready'|'error', value}; nach dem Laden wird neu gezeichnet.
     * Ein Fehler behält einen früheren gültigen Wert.
     */
    load(key, fn, maxAge = 300000) {
      const known = extras.get(key);
      if (known && (known.pending || now() - known.at < (known.status === 'error' ? 60000 : maxAge))) return known;
      const entry = {status: known?.value !== undefined ? 'ready' : 'loading', value: known?.value, at: now(), pending: true};
      extras.set(key, entry);
      Promise.resolve().then(fn).then(value => Object.assign(entry, {value, status: 'ready', error: null}))
        .catch(error => Object.assign(entry, {status: entry.value !== undefined ? 'ready' : 'error', error}))
        .finally(() => { entry.pending = false; entry.at = now(); emit(); });
      return entry;
    },
    subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },
    async refresh() {
      try {
        const data = await api.data();
        if (!validSnapshot(data)) throw Error('Unvollständiger Datenstand');
        Object.assign(state, {data, savedAt: now(), dataError: null});
        try { storage?.setItem(SNAPSHOT_KEY, JSON.stringify({savedAt: state.savedAt, data})); } catch {}
      } catch (error) {
        state.dataError = error;
      }
      emit();
      return state;
    },
    async refreshLive() {
      try {
        const live = await api.live();
        if (!live || live.ok === false) throw Error('Live-Quelle nicht verfügbar');
        Object.assign(state, {live, liveAt: now(), liveError: null});
      } catch (error) {
        // Letzten gültigen Live-Stand behalten und den Ausfall vermerken.
        state.liveError = error;
      }
      emit();
      return state;
    }
  };
}

function safeStorage() {
  try { return globalThis.localStorage || null; } catch { return null; }
}
