// Speicher mit der Schnittstelle des Datendienstes (`get(key)` mit `json/text/arrayBuffer/body`, `put(key, value)`), der über die
// REST-Schnittstelle von Cloudflare auf den KV-Namespace zugreift. Damit kann ein GitHub-Actions-Lauf dieselben Funktionen wie der
// Worker verwenden, ohne dessen Grenzen (10 ms CPU, 50 externe Abrufe) zu haben. Zugangsdaten gelangen nie in Meldungen.
const API = 'https://api.cloudflare.com/client/v4/accounts/';

export function kvRestStore({accountId, namespaceId, token, fetchFn = fetch}) {
  const base = `${API}${accountId}/storage/kv/namespaces/${namespaceId}`;
  const auth = {Authorization: 'Bearer ' + token};
  // KV-Lesen kann nach einem Schreiben noch den alten Stand liefern.
  const written = new Map();
  const object = data => ({body:data.slice(0),arrayBuffer:async()=>data.slice(0),text:async()=>new TextDecoder().decode(data),json:async()=>JSON.parse(new TextDecoder().decode(data))});
  return {
    async get(key) {
      if(written.has(key))return object(written.get(key));
      const r = await fetchFn(`${base}/values/${encodeURIComponent(key)}`, {headers: auth});
      if (r.status === 404) return null;
      if (!r.ok) throw Error('KV-Lesen fehlgeschlagen (HTTP ' + r.status + ')');
      const data = await r.arrayBuffer();
      return object(data);
    },
    // Geschrieben wird über die Mehrfach-Schnittstelle (im Import bereits real erprobt); Binärdaten als Base64.
    async put(key, value) {
      const binary = typeof value !== 'string';
      const entry = binary ? {key, value: Buffer.from(value).toString('base64'), base64: true} : {key, value};
      const r = await fetchFn(`${base}/bulk`, {
        method: 'PUT',
        headers: {...auth, 'Content-Type': 'application/json'},
        body: JSON.stringify([entry])
      });
      const body = await r.json().catch(() => ({}));
      if (!r.ok || body.success === false) throw Error('KV-Schreiben fehlgeschlagen (HTTP ' + r.status + ')');
      const bytes=binary?new Uint8Array(value):new TextEncoder().encode(value);
      written.set(key,bytes.slice().buffer);
    }
  };
}
