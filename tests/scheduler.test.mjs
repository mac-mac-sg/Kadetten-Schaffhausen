import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import worker from '../server/worker.mjs';
import {dispatchUpdate, isUpdateTime, zurichHour, SWISS_HOURS, REPOSITORY, WORKFLOW} from '../server/scheduler.mjs';

const at = iso => Date.parse(iso);

test('Schweizer Stunde: Sommer- und Winterzeit, nur die sieben Aktualisierungsstunden zählen', () => {
  assert.equal(zurichHour(new Date('2026-10-06T16:20:00Z')), 18);
  assert.equal(zurichHour(new Date('2026-12-01T17:20:00Z')), 18);
  assert.ok(isUpdateTime(new Date('2026-10-06T16:20:00Z')), '18:20 Schweizer Zeit im Sommer');
  assert.ok(isUpdateTime(new Date('2026-12-01T17:20:00Z')), '18:20 Schweizer Zeit im Winter');
  assert.ok(!isUpdateTime(new Date('2026-10-06T17:20:00Z')), '19:20 Schweizer Zeit im Sommer');
  assert.ok(!isUpdateTime(new Date('2026-12-01T16:20:00Z')), '17:20 Schweizer Zeit im Winter');
});

test('Cron-Ausdruck des Workers deckt alle sieben Schweizer Zeiten in Sommer und Winter ab', () => {
  const toml = fs.readFileSync('cloudflare/api/wrangler.toml', 'utf8');
  const cron = toml.match(/crons = \["20 ([0-9,]+) \* \* \*"\]/);
  assert.ok(cron, 'Cron mit Minute 20 vorhanden');
  const utcHours = cron[1].split(',').map(Number);
  for (const day of ['2026-01-15', '2026-07-15', '2026-03-29', '2026-10-25']) {
    const zurich = new Set(utcHours.map(h => zurichHour(new Date(`${day}T${String(h).padStart(2, '0')}:20:00Z`))));
    for (const w of SWISS_HOURS) assert.ok(zurich.has(w), `${day}: ${w}:20 Schweizer Zeit wird ausgelöst`);
  }
  const workflow = fs.readFileSync('.github/workflows/cloudflare-update.yml', 'utf8');
  assert.equal(workflow.match(/- cron: '20 ([0-9,]+) \* \* \*'/)[1], cron[1], 'gleicher Zeitplan wie im GitHub-Workflow');
});

test('Auslösung: ein POST an die GitHub-Schnittstelle mit Modus «schreiben», Token nur im Kopf und nie im Ergebnis', async () => {
  const calls = [];
  const fetchFn = async (url, init) => { calls.push({url, init}); return new Response(null, {status: 204}); };
  const result = await dispatchUpdate({DISPATCH_TOKEN: 'geheim-123'}, at('2026-10-06T16:20:00Z'), fetchFn);
  assert.deepEqual(result, {ok: true, status: 204});
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, `https://api.github.com/repos/${REPOSITORY}/actions/workflows/${WORKFLOW}/dispatches`);
  assert.equal(calls[0].init.method, 'POST');
  assert.equal(calls[0].init.headers.Authorization, 'Bearer geheim-123');
  assert.deepEqual(JSON.parse(calls[0].init.body), {ref: 'main', inputs: {modus: 'schreiben'}});
  assert.doesNotMatch(JSON.stringify(result), /geheim/);
});

test('Auslösung: falsche Stunde, fehlendes Token, abgelehnter Aufruf und Netzwerkfehler lösen nichts aus und verraten kein Token', async () => {
  let called = 0;
  const fetchFn = async () => { called++; return new Response('{"message":"Bad credentials geheim-123"}', {status: 401}); };
  assert.deepEqual(await dispatchUpdate({DISPATCH_TOKEN: 'geheim-123'}, at('2026-10-06T17:20:00Z'), fetchFn), {ok: true, skipped: true, reason: 'nicht zur Schweizer Uhrzeit'});
  assert.equal(called, 0);
  assert.deepEqual(await dispatchUpdate({}, at('2026-10-06T16:20:00Z'), fetchFn), {ok: false, reason: 'DISPATCH_TOKEN fehlt'});
  assert.equal(called, 0);
  const rejected = await dispatchUpdate({DISPATCH_TOKEN: 'geheim-123'}, at('2026-10-06T16:20:00Z'), fetchFn);
  assert.equal(rejected.ok, false);assert.equal(rejected.status, 401);assert.doesNotMatch(JSON.stringify(rejected), /geheim|Bad credentials/);
  const down = await dispatchUpdate({DISPATCH_TOKEN: 'geheim-123'}, at('2026-10-06T16:20:00Z'), async () => { throw Error('Verbindung abgebrochen'); });
  assert.equal(down.ok, false);assert.match(down.reason, /Netzwerk/);assert.doesNotMatch(JSON.stringify(down), /geheim/);
});

test('Worker: scheduled-Handler löst über waitUntil aus und meldet Fehler ohne Token im Protokoll', async () => {
  assert.equal(typeof worker.scheduled, 'function');
  const waits = [], logged = [];
  const original = console.error, realFetch = globalThis.fetch;
  console.error = (...args) => logged.push(args.join(' '));
  globalThis.fetch = async () => new Response('', {status: 403});
  try {
    worker.scheduled({scheduledTime: at('2026-10-06T16:20:00Z')}, {DISPATCH_TOKEN: 'geheim-123'}, {waitUntil: p => waits.push(p)});
    await Promise.all(waits);
  } finally { console.error = original; globalThis.fetch = realFetch; }
  assert.equal(waits.length, 1);
  assert.ok(logged.some(l => /nicht ausgelöst/.test(l) && /403/.test(l)));
  assert.ok(!logged.join(' ').includes('geheim'));
});

test('Bereitstellung: das Zeitplan-Token wird als Worker-Geheimnis gesetzt, nie ausgegeben', () => {
  const wf = fs.readFileSync('.github/workflows/cloudflare-deploy.yml', 'utf8');
  assert.match(wf, /DISPATCH_TOKEN: \$\{\{ secrets\.WORKFLOW_DISPATCH_TOKEN \}\}/);
  assert.match(wf, /printf '%s' "\$DISPATCH_TOKEN" \| npx --yes "wrangler@\$\{WRANGLER_VERSION\}" secret put DISPATCH_TOKEN/);
  assert.doesNotMatch(wf, /echo[^\n]*\$DISPATCH_TOKEN/);
});
