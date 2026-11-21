// Datenstand der App. Der letzte gültige Stand bleibt bei Ausfällen erhalten und liegt lokal,
// damit die App sofort etwas zeigen kann. Live-Stände werden nie gespeichert.

import {zurichParts} from './logic.js';
import {cleanTeam} from './match.js';
import {storage as safeStorage} from './storage.js';

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
      Promise.resolve()
        .then(fn)
        .then(value => Object.assign(entry, {value, status: 'ready', error: null}))
        .catch(error => Object.assign(entry, {status: entry.value !== undefined ? 'ready' : 'error', error}))
        .finally(() => {
          entry.pending = false;
          entry.at = now();
          emit();
        });
      return entry;
    },
    /** Zwischengespeicherten Zusatzwert verwerfen (z. B. nach einer eigenen Stimme). */
    invalidate(key) {
      extras.delete(key);
    },
    subscribe(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    async refresh() {
      try {
        const data = await api.data();
        if (!validSnapshot(data)) throw Error('Unvollständiger Datenstand');
        Object.assign(state, {data, savedAt: now(), dataError: null});
        try {
          storage?.setItem(SNAPSHOT_KEY, JSON.stringify({savedAt: state.savedAt, data}));
        } catch {}
      } catch (error) {
        state.dataError = error;
      }
      emit();
      return state;
    },
    async refreshLiveDetails(source) {
      try {
        const response = await api.live({source, includeDetails: true});
        for (const field of ['match', 'finished']) {
          const current = state.live?.[field];
          const incoming = [response?.match, response?.finished].find(m => m && current && String(m.id) === String(current.id));
          // Späte Statistikantworten dürfen weder Tore, Phase noch Quellenzeit zurücksetzen.
          if (incoming?.details?.ok) current.details = incoming.details;
        }
        emit();
      } catch {} // Statistikfehler beeinflussen den aktuellen Spielstand nicht.
    },
    async refreshLive(options) {
      try {
        const live = await api.live(options);
        if (!live || live.ok === false) throw Error('Live-Quelle nicht verfügbar');
        const at = now();
        const previous = state.live?.finished;
        const finished = live.finished || (previous?.date === zurichParts(at).date ? previous : null);
        // Schnelle Resultatantworten enthalten keine Statistik. Bekannte Werte derselben Partie behalten.
        const retainDetails = match => {
          if (!match || match.details) return match;
          const previous = [state.live?.match, state.live?.finished].find(p => p && String(p.id) === String(match.id));
          return previous?.details ? {...match, details: previous.details} : match;
        };
        // Cup-Spiele melden die Teams mit Liga-Zusatz; für alle Vergleiche der App ohne.
        const name = v => (typeof v === 'string' ? cleanTeam(v) : v);
        const clean = m =>
          m ? {...m, ...(m.home !== undefined && {home: name(m.home)}), ...(m.away !== undefined && {away: name(m.away)})} : m;
        Object.assign(state, {
          live: {...live, match: clean(retainDetails(live.match)), finished: clean(retainDetails(finished))},
          liveAt: at,
          liveError: null
        });
      } catch (error) {
        // Letzten gültigen Live-Stand behalten und den Ausfall vermerken.
        state.liveError = error;
      }
      emit();
      return state;
    }
  };
}
