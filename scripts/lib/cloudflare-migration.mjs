// Phase 1 des Cloudflare-Umzugs (docs/cloudflare-umzug.md): Inhalte des bisherigen Datendienstes über dessen öffentliche
// Lese-Routen einsammeln, in den KV-Speicher von Cloudflare schreiben und beide Dienste vergleichen.
// Reine Funktionen mit eingespeister HTTP-Schnittstelle, damit sie ohne Netzwerk getestet werden können.
// Nicht übernommen: FCSG-Daten (die öffentliche Route liefert sie ohne Artikeltexte; sie entstehen in Phase 2 neu aus der
// offiziellen FCSG-API).

const SHV_ID = /^[1-9][0-9]{0,8}$/;
const SAFE_ID = /^[a-zA-Z0-9_-]{1,80}$/;
const sorted = v =>
  Array.isArray(v) ? v.map(sorted) : v && typeof v === 'object' ? Object.fromEntries(Object.keys(v).sort().map(k => [k, sorted(v[k])])) : v;
export const canonical = v => JSON.stringify(sorted(v));

// Erstes abweichendes Feld zweier JSON-Werte als Pfad mit gekürzten Werten, z. B. `games[3].score: "2:1" gegen null`.
const short = v => { const t = JSON.stringify(v); return t === undefined ? 'fehlt' : t.length > 60 ? t.slice(0, 57) + '...' : t; };
export function firstDifference(a, b, path = '') {
  if (canonical(a) === canonical(b)) return '';
  const isObj = v => v && typeof v === 'object';
  if (!isObj(a) || !isObj(b) || Array.isArray(a) !== Array.isArray(b)) return `${path || 'Wurzel'}: ${short(a)} gegen ${short(b)}`;
  const keys = Array.isArray(a) ? [...Array(Math.max(a.length, b.length)).keys()] : [...new Set([...Object.keys(a), ...Object.keys(b)])].sort();
  for (const k of keys) {
    const sub = firstDifference(a[k], b[k], Array.isArray(a) ? `${path}[${k}]` : path ? `${path}.${k}` : k);
    if (sub) return sub;
  }
  return '';
}

// http.json(url) -> {status, data}; http.bytes(url) -> {status, bytes: Uint8Array}
async function getJson(http, base, path) {
  const r = await http.json(base + path);
  return r;
}

// Alle GET-Routen, deren Antwort aus dem Speicher stammt und zwischen den Diensten übereinstimmen muss.
export async function listRoutes(http, source) {
  const first = await getJson(http, source, '/api/data');
  if (first.status !== 200) throw Error('Datenstand nicht lesbar (HTTP ' + first.status + ')');
  const data = first.data;
  if (!Array.isArray(data?.games) || !Array.isArray(data?.stories) || !Array.isArray(data?.tables?.QHL)) throw Error('Datenstand hat ein unerwartetes Format');
  const routes = [{group: 'Datenstand', path: '/api/data'}];
  for (const s of data.stories) {
    if (SAFE_ID.test(String(s.id)) && /^[a-f0-9]{64}$/.test(s.articleVersion || ''))
      routes.push({group: 'Artikel', path: `/api/articles/${encodeURIComponent(s.id)}?v=${s.articleVersion}`});
  }
  for (const g of data.games) {
    if (!SAFE_ID.test(String(g.id))) continue;
    if (SHV_ID.test(String(g.id)) && g.score) routes.push({group: 'Berichte', path: `/api/reports/${g.id}`});
    if (!g.score) routes.push({group: 'Vorschauen', path: `/api/previews/kadetten/${g.id}`});
    routes.push({group: 'Matchprogramme', path: `/api/programmes/${g.id}`});
  }
  const fcsg = await getJson(http, source, '/api/fcsg/data');
  if (fcsg.status === 200 && Array.isArray(fcsg.data?.games))
    for (const g of fcsg.data.games) if (!g.score && SAFE_ID.test(String(g.id))) routes.push({group: 'Vorschauen', path: `/api/previews/fcsg/${g.id}`});
  return {data, routes};
}

const b64 = bytes => Buffer.from(bytes).toString('base64');

// Sammelt die KV-Einträge. Rückgabe: {entries: [{key, value, base64?}], summary: {Gruppe: {read, skipped}}}
export async function collect(http, source) {
  const {data, routes} = await listRoutes(http, source);
  const entries = [];
  const summary = {};
  const count = (group, field) => ((summary[group] ??= {read: 0, skipped: 0})[field]++);
  const add = e => entries.push(e);
  for (const route of routes) {
    const g = route.group;
    if (g === 'Datenstand') {
      add({key: 'kadetten/current.json', value: JSON.stringify(data)});
      count(g, 'read');
      continue;
    }
    const r = await getJson(http, source, route.path);
    if (r.status !== 200) { count(g, 'skipped'); continue; }
    if (g === 'Artikel') {
      const id = decodeURIComponent(route.path.split('/')[3].split('?')[0]);
      const version = route.path.split('?v=')[1];
      if (String(r.data?.id) !== id || r.data?.version !== version || typeof r.data?.html !== 'string') { count(g, 'skipped'); continue; }
      add({key: `kadetten/articles/${id}/${version}.json`, value: JSON.stringify(r.data)});
    } else if (g === 'Berichte') {
      if (r.data?.stored !== true || !r.data.report) { count(g, 'skipped'); continue; }
      add({key: `kadetten/reports/${route.path.split('/').at(-1)}.json`, value: JSON.stringify(r.data.report)});
    } else if (g === 'Vorschauen') {
      const [, , , club, id] = route.path.split('/');
      add({key: `previews/${club}/${id}.json`, value: JSON.stringify(r.data)});
    } else if (g === 'Matchprogramme') {
      const id = route.path.split('/').at(-1);
      const {pdfPath, ...meta} = r.data || {};
      if (!meta.version || typeof pdfPath !== 'string' || !pdfPath.startsWith(`/api/programmes/${id}/pdf`)) { count(g, 'skipped'); continue; }
      const pdf = await http.bytes(source + pdfPath);
      if (pdf.status !== 200 || new TextDecoder().decode(pdf.bytes.slice(0, 5)) !== '%PDF-') { count(g, 'skipped'); continue; }
      add({key: `kadetten/programmes/${id}.json`, value: JSON.stringify(meta)});
      add({key: `kadetten/programmes/${id}/${meta.version}.pdf`, value: b64(pdf.bytes), base64: true});
    }
    count(g, 'read');
  }
  return {entries, summary};
}

// Teilt die Einträge in Pakete (höchstens 10'000 Einträge und etwa 20 MB je Anfrage an die KV-Schnittstelle).
export function chunk(entries, maxBytes = 20 * 1024 * 1024, maxCount = 10000) {
  const out = [];
  let current = [], size = 0;
  for (const e of entries) {
    const n = e.key.length + e.value.length;
    if (current.length && (size + n > maxBytes || current.length >= maxCount)) { out.push(current); current = []; size = 0; }
    current.push(e);
    size += n;
  }
  if (current.length) out.push(current);
  return out;
}

export async function bulkWrite(fetchFn, {accountId, namespaceId, token}, entries) {
  let written = 0;
  for (const part of chunk(entries)) {
    const r = await fetchFn(`https://api.cloudflare.com/client/v4/accounts/${accountId}/storage/kv/namespaces/${namespaceId}/bulk`, {
      method: 'PUT',
      headers: {Authorization: 'Bearer ' + token, 'Content-Type': 'application/json'},
      body: JSON.stringify(part)
    });
    const body = await r.json().catch(() => ({}));
    if (!r.ok || body.success === false) throw Error('KV-Schreiben fehlgeschlagen (HTTP ' + r.status + '): ' + JSON.stringify(body.errors || []).slice(0, 300));
    written += part.length;
  }
  return written;
}

// Vergleicht die Antworten beider Dienste route für route. Rückgabe: {rows: [{group, compared, equal, different, first}]}
export async function compareServices(http, source, target) {
  const {routes} = await listRoutes(http, source);
  const rows = new Map();
  for (const route of routes) {
    const row = rows.get(route.group) ?? {group: route.group, compared: 0, equal: 0, different: 0, first: ''};
    rows.set(route.group, row);
    const a = await getJson(http, source, route.path);
    if (route.group === 'Berichte' && a.data?.stored !== true) continue;
    const b = await getJson(http, target, route.path);
    row.compared++;
    let same = a.status === b.status && canonical(a.data) === canonical(b.data);
    if (same && route.group === 'Matchprogramme' && a.status === 200) {
      const [pa, pb] = await Promise.all([http.bytes(source + a.data.pdfPath), http.bytes(target + b.data.pdfPath)]);
      same = pa.status === pb.status && b64(pa.bytes) === b64(pb.bytes);
    }
    if (same) row.equal++;
    else {
      row.different++;
      const field = a.status === b.status ? firstDifference(a.data, b.data) : '';
      row.first ||= `${route.path} (Quelle HTTP ${a.status}, Ziel HTTP ${b.status})` + (field ? ' – ' + field : '');
    }
  }
  return {rows: [...rows.values()]};
}
