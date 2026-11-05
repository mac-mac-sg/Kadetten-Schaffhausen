// Fan-Wahl «Spieler des Matchs» über /api/app/votes (server/app-fan.mjs). Eine Stimme pro Gerät und Spiel.
// Der Geräteschlüssel ist zufällig, bleibt auf dem Gerät und wird im Datendienst nur gehasht gespeichert.
export const DEVICE_KEY = 'v2:app-device';
export const MY_VOTES_KEY = 'v2:app-votes';
const storage = () => { try { return globalThis.localStorage || null; } catch { return null; } };

export function deviceToken(s = storage()) {
  let token = null;
  try { token = s?.getItem(DEVICE_KEY); } catch {}
  if (typeof token === 'string' && /^[-\w]{43}$/.test(token)) return token;
  token = btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(32)))).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '');
  try { s?.setItem(DEVICE_KEY, token); } catch {}
  return token;
}
export function myVotes(s = storage()) {
  try { const v = JSON.parse(s?.getItem(MY_VOTES_KEY) || '{}'); return v && typeof v === 'object' && !Array.isArray(v) ? v : {}; } catch { return {}; }
}
function remember(id, player, s = storage()) {
  const all = myVotes(s); all[id] = String(player);
  try { s?.setItem(MY_VOTES_KEY, JSON.stringify(Object.fromEntries(Object.entries(all).slice(-200)))); } catch {}
}

export function createVotes({origin = '', fetchImpl = globalThis.fetch} = {}) {
  const url = id => origin + '/api/app/votes/' + encodeURIComponent(id);
  return {
    async status(id) {
      const r = await fetchImpl(url(id), {credentials: 'omit', mode: origin ? 'cors' : 'same-origin', cache: 'no-store'});
      if (!r.ok) throw Object.assign(Error('Fan-Wahl nicht verfügbar'), {status: r.status});
      return r.json();
    },
    async vote(id, player) {
      const r = await fetchImpl(url(id), {method: 'POST', credentials: 'omit', mode: origin ? 'cors' : 'same-origin', cache: 'no-store', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({player: String(player), device: deviceToken()})});
      let data = {};
      try { data = await r.json(); } catch {}
      if (r.ok || (r.status === 409 && /schon abgestimmt/.test(data.error || ''))) remember(id, data.voted || player);
      if (!r.ok) throw Object.assign(Error(data.error || 'Die Stimme konnte nicht gespeichert werden.'), {data});
      return data;
    }
  };
}
