// R2-ähnliche Schnittstelle über Workers KV (Phase 1 des Cloudflare-Umzugs, docs/cloudflare-umzug.md).
// Der Anwendungscode nutzt nur `get(key)` (mit `json()`, `text()`, `arrayBuffer()` und `body`) und `put(key, value)`.
// R2-Optionen wie `httpMetadata` haben in KV keine Entsprechung und werden ignoriert. Fehlende Schlüssel ergeben `null`.
// Grenzen: Werte bis 25 MiB; Änderungen können kurz verzögert überall sichtbar werden (eventuelle Konsistenz).
export function kvStore(kv) {
  return {
    async get(key) {
      const data = await kv.get(key, 'arrayBuffer');
      if (data === null) return null;
      return {
        body: data,
        arrayBuffer: async () => data,
        text: async () => new TextDecoder().decode(data),
        json: async () => JSON.parse(new TextDecoder().decode(data))
      };
    },
    async put(key, value) {
      await kv.put(key, value);
    }
  };
}
