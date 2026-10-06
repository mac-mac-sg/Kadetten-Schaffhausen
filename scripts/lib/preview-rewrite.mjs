// Anbindung der KI an die Vorschau-Erzeugung: umhüllt den Aufruf von Cloudflare Workers AI zu `rewrite(baseline) -> {ok, text|error}`.
import {aiMessages} from '../../server/preview-ai.mjs';
import {runModel} from './workers-ai.mjs';

export const DEFAULT_MODEL = '@cf/mistralai/mistral-small-3.1-24b-instruct';

// env.KI_VORSCHAU = 'aus' schaltet die KI ab (dann entstehen nur die sachlichen Texte). Ohne Zugangsdaten ebenfalls aus.
export function makeRewriter(env = process.env, fetchFn = fetch) {
  const {CLOUDFLARE_API_TOKEN: token, CLOUDFLARE_ACCOUNT_ID: accountId} = env;
  if (String(env.KI_VORSCHAU || '').toLowerCase() === 'aus' || !token || !accountId) return null;
  const model = env.KI_MODELL || DEFAULT_MODEL;
  return baseline => runModel({accountId, token, model, messages: aiMessages(baseline), temperature: 0.2, fetchFn});
}
