// Aufruf eines Modells von Cloudflare Workers AI über die REST-Schnittstelle (aus GitHub Actions, nicht aus dem Worker).
// Der API-Token braucht «Workers AI: Edit». Zugangsdaten gelangen nie in Meldungen.
const API = 'https://api.cloudflare.com/client/v4/accounts/';

// Verschiedene Modelle antworten in unterschiedlicher Form: `result.response` (Text) oder OpenAI-Form (`choices[0].message.content`).
export function extractText(body) {
  const r = body?.result ?? body;
  if (typeof r?.response === 'string') return r.response;
  const msg = r?.choices?.[0]?.message;
  if (typeof msg?.content === 'string') return msg.content;
  // Antwortform mancher Denkmodelle: Liste von Einträgen mit Textteilen.
  const parts = (Array.isArray(r?.output) ? r.output : []).filter(o => o?.type === 'message').flatMap(o => o.content || []).filter(c => typeof c?.text === 'string');
  return parts.map(c => c.text).join('\n');
}

export async function runModel({accountId, token, model, messages, maxTokens = 1500, temperature = 0.4, fetchFn = fetch}) {
  const started = Date.now();
  let r;
  try {
    r = await fetchFn(`${API}${accountId}/ai/run/${model}`, {
      method: 'POST',
      headers: {Authorization: 'Bearer ' + token, 'Content-Type': 'application/json'},
      body: JSON.stringify({messages, max_tokens: maxTokens, temperature}),
      signal: AbortSignal.timeout(60000)
    });
  } catch (e) {
    return {ok: false, ms: Date.now() - started, error: 'Netzwerk: ' + String(e?.message || e).slice(0, 120)};
  }
  const body = await r.json().catch(() => null);
  const ms = Date.now() - started;
  if (!r.ok || body?.success === false) {
    const msg = (body?.errors || []).map(e => `${e.code ?? ''} ${e.message ?? ''}`.trim()).join('; ').slice(0, 200);
    const hint = /not allowed to access|5018/i.test(msg) ? ' (Modell für dieses Konto nicht freigeschaltet?)' : r.status === 401 || /authenticat|permission/i.test(msg) ? ' (Token ohne Berechtigung «Workers AI: Edit»?)' : '';
    return {ok: false, ms, error: `HTTP ${r.status}${msg ? ': ' + msg : ''}${hint}`};
  }
  const text = extractText(body);
  if (!text) return {ok: false, ms, error: 'leere Antwort (Modell lieferte keinen Text)'};
  return {ok: true, ms, text, usage: body?.result?.usage || null};
}
