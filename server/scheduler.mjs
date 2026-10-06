// Zeitplan der Datenaktualisierung auf Cloudflare (Cron-Trigger des Workers, docs/betrieb.md). Der Worker rechnet nicht selbst:
// Zu den Terminen löst er den GitHub-Workflow «Cloudflare-Datenaktualisierung» im Modus «schreiben» aus, weil das Abrufen der
// Quellen, die KI-Vorschauen und das Matchprogramm in GitHub Actions laufen (zu viel CPU für einen Worker).
// Cloudflare rechnet in UTC. Der Cron-Ausdruck in cloudflare/api/wrangler.toml deckt Sommer- und Winterzeit ab; hier gilt nur die
// Schweizer Uhrzeit.

export const REPOSITORY = 'mac-mac-sg/Kadetten-Schaffhausen';
export const WORKFLOW = 'cloudflare-update.yml';
// Schweizer Stunden, in denen die Aktualisierung läuft (jeweils um :20).
export const SWISS_HOURS = [6, 9, 12, 15, 18, 21, 22];

export const zurichHour = date =>
  Number(new Intl.DateTimeFormat('en-GB', {hour: '2-digit', hourCycle: 'h23', timeZone: 'Europe/Zurich'}).format(date));

export const isUpdateTime = date => SWISS_HOURS.includes(zurichHour(date));

// Löst den Workflow aus. Rückgabe ohne Zugangsdaten: {ok, status?, reason?}.
export async function dispatchUpdate(env, scheduledTime = Date.now(), fetchFn = fetch) {
  const when = new Date(scheduledTime);
  if (!isUpdateTime(when)) return {ok: true, skipped: true, reason: 'nicht zur Schweizer Uhrzeit'};
  const token = env.DISPATCH_TOKEN;
  if (!token) return {ok: false, reason: 'DISPATCH_TOKEN fehlt'};
  try {
    const r = await fetchFn(`https://api.github.com/repos/${REPOSITORY}/actions/workflows/${WORKFLOW}/dispatches`, {
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + token,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        'User-Agent': 'kadetten-api-scheduler',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ref: 'main', inputs: {modus: 'schreiben'}}),
      signal: AbortSignal.timeout(15000)
    });
    return r.status === 204 ? {ok: true, status: 204} : {ok: false, status: r.status, reason: 'GitHub hat den Aufruf nicht angenommen'};
  } catch (e) {
    return {ok: false, reason: 'Netzwerk: ' + String(e?.message || e).slice(0, 100)};
  }
}
