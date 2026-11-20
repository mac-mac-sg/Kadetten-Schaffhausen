// Browser-Test der Bedienung (nach `npm run build:pages`): Navigation, Filter, Lieblingsspieler, Tipp, Quiz, Sammelkarten
// (abholen, Fächer, Umdrehen), Geschichten mit Zeitsteuerung, Pause und «Bewegung reduzieren», Tickets-Marke.
// Die App läuft aus dist/client in echtem Chromium. Der Datendienst wird mit server/seed.json nachgebildet, das Datum ist fest.
// Aufruf: npm run test:browser (Playwright-Browser einmalig mit `npx playwright install chromium`).
import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import {chromium} from 'playwright';

const root = path.resolve('dist/client');
const NOW = new Date('2026-11-19T07:00:00+01:00');
const CHAMBERY = 'extra-ehl-20261124-kadetten-chambery';
const TICKET = 'https://www.ticketmaster.ch/event/kadetten-vs-chambery-tickets/761426654';
const TYPES = {'.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.png': 'image/png', '.woff2': 'font/woff2', '.json': 'application/json', '.webmanifest': 'application/manifest+json'};

const data = JSON.parse(fs.readFileSync('server/seed.json', 'utf8'));
data.games = data.games.map(g => (g.id === CHAMBERY ? {...g, tickets: TICKET} : g));
// Spielerwerte für das Profil von Nr. 10 (das Regel-Blatt hängt an den Strafen-Werten).
data.playerSeason = {players: {10: {shvPlayerId: 1, games: 8, goals: 31, fieldGoals: 22, sevenMeterGoals: 9, goalsPerGame: 3.9, yellowCards: 1, twoMinutes: 2, disqualifications: 0}}};
// Fanshop-Katalog (Auszug aus der Store-API der Kadetten-Seite).
data.shop = JSON.parse(fs.readFileSync('tests/fixtures/shop.json', 'utf8'));
data.checkedAt = NOW.toISOString();
data.status = Object.fromEntries(['games', 'table', 'news', 'players'].map(k => [k, {ok: true, updatedAt: NOW.toISOString()}]));

const server = http.createServer((req, res) => {
  try {
    const pathname = new URL(req.url, 'http://local').pathname;
    const file = path.resolve(root, '.' + pathname + (pathname.endsWith('/') ? 'index.html' : ''));
    assert.ok(file.startsWith(root + path.sep));
    res.writeHead(200, {'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream'});
    res.end(fs.readFileSync(file));
  } catch {
    res.writeHead(404);
    res.end();
  }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const origin = 'http://127.0.0.1:' + server.address().port;
const browser = await chromium.launch({headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage']});

/** Neue Seite mit festem Datum, nachgebildetem Datendienst und gesperrtem Netz; storage füllt den Gerätespeicher. */
async function open(hash, {storage = {}, reduced = false} = {}) {
  const context = await browser.newContext({viewport: {width: 390, height: 844}, serviceWorkers: 'block', reducedMotion: reduced ? 'reduce' : 'no-preference'});
  await context.clock.setFixedTime(NOW);
  await context.route(/^https?:\/\/(?!127\.0\.0\.1)/, route => route.abort());
  await context.route('**/api/**', route => {
    const json = route.request().url().includes('/api/data') ? data : {};
    return route.fulfill({json, headers: {'access-control-allow-origin': '*'}});
  });
  await context.addInitScript(values => {
    localStorage.setItem('v2:app-welcome', '1');
    for (const [k, v] of Object.entries(values)) localStorage.setItem(k, JSON.stringify(v));
  }, storage);
  const page = await context.newPage();
  page.errors = [];
  page.on('pageerror', e => page.errors.push(e.message));
  await page.goto(origin + '/#' + hash);
  await page.waitForSelector('#app main');
  page.close = () => context.close();
  return page;
}
const stored = (page, key) => page.evaluate(k => JSON.parse(localStorage.getItem(k) ?? 'null'), key);
const step = page => page.getAttribute('.rb', 'data-rb-step').then(Number);
const hash = page => page.evaluate(() => location.hash);

const tests = [];
// BROWSER_TEST=<Teil des Namens> führt nur passende Tests aus (zum Eingrenzen eines Fehlers).
const only = process.env.BROWSER_TEST;
const test = (name, fn) => (!only || name.includes(only)) && tests.push({name, fn});

test('Titelseite: fünf Tabs, Spieltagskarte mit Tickets-Marke als eigener Link', async () => {
  const page = await open('/');
  assert.deepEqual(await page.locator('nav.nav a').allTextContents(), ['Start', 'Spiele', 'Tabelle', 'Kader', 'Ich']);
  const marke = page.locator('.hero a.pill.tk');
  assert.equal(await marke.getAttribute('href'), TICKET);
  assert.equal(await marke.getAttribute('target'), '_blank');
  assert.equal(await page.locator('.hero a a').count(), 0, 'kein Link im Link');
  await page.locator('.hero-link.cover').click({position: {x: 20, y: 20}});
  assert.equal(await hash(page), '#/spiel/' + CHAMBERY, 'die Karte führt zur Vorschau');
  assert.deepEqual(page.errors, []);
  await page.close();
});

test('Navigation: Tab «Ich» und Wissen in Mein Bereich', async () => {
  const page = await open('/');
  await page.click('nav.nav a[href="#/ich"]');
  await page.waitForSelector('h1:has-text("Mein Bereich")');
  assert.equal(await page.locator('nav.nav a.on').getAttribute('href'), '#/ich');
  await page.click('[aria-labelledby="m-wissen"] a[href="#/wissen/aufstellungen"]');
  assert.equal(await hash(page), '#/wissen/aufstellungen');
  await page.waitForSelector('nav.seg'); // Kapitel-Reiter: der Wissensbereich ist geladen
  assert.equal(await page.locator('.band-sub a.back').getAttribute('href'), '#/ich');
  assert.deepEqual(page.errors, []);
  await page.close();
});

test('Darstellung und Filter-Chips', async () => {
  const page = await open('/ich/einstellungen');
  await page.click('[data-theme-choice="dark"]');
  assert.equal(await page.evaluate(() => document.documentElement.dataset.theme), 'dark');
  assert.equal(await page.evaluate(() => localStorage.getItem('v2:app-theme')), 'dark');
  await page.goto(origin + '/#/saison');
  await page.waitForSelector('[data-ui="comp:EHL"]');
  await page.click('[data-ui="comp:EHL"]');
  assert.equal(await page.getAttribute('[data-ui="comp:EHL"]', 'aria-pressed'), 'true');
  assert.deepEqual(page.errors, []);
  await page.close();
});

test('Lieblingsspieler, Tipp und «Ich war in der Halle»', async () => {
  const page = await open('/team/10');
  await page.click('[data-favourite="10"]');
  assert.equal(await stored(page, 'v2:app-favourite'), 10);
  await page.goto(origin + '/#/spiel/' + CHAMBERY);
  await page.waitForSelector('[data-tip]');
  await page.locator('[data-tip]').first().click();
  assert.ok(Object.keys(await stored(page, 'v2:app-tips')).includes(CHAMBERY), 'Tipp gespeichert');
  await page.goto(origin + '/#/spiel/508363/bericht');
  await page.click('[data-my-game]');
  assert.deepEqual(await stored(page, 'v2:app-my-games'), ['508363']);
  assert.equal(await page.getAttribute('[data-my-game]', 'aria-pressed'), 'true');
  assert.deepEqual(page.errors, []);
  await page.close();
});

test('Quiz der Woche: drei Fragen, Ergebnis, gespeichert', async () => {
  const page = await open('/quiz');
  for (let i = 0; i < 3; i++) {
    await page.waitForSelector('[data-quiz]');
    await page.locator('[data-quiz]').first().click();
  }
  await page.waitForSelector('.quiz-card.result');
  const saved = Object.values(await stored(page, 'v2:app-quiz'));
  assert.equal(saved.length, 1);
  assert.equal(saved[0].length, 3);
  assert.deepEqual(page.errors, []);
  await page.close();
});

test('Sammelkarten: abholen, Fächer aufdecken und wischen, Kartenansicht', async () => {
  const page = await open('/ich');
  await page.click('[data-claim]');
  await page.waitForSelector('.fan-c');
  assert.equal(await hash(page), '#/sammlung/neu');
  const count = await page.locator('.fan-c').count();
  assert.ok(count >= 2);
  await page.click('[data-reveal-all]');
  await page.waitForFunction(n => document.querySelectorAll('.fan-c.is-open').length === n, count);
  const before = await page.locator('.fan-c.is-top').getAttribute('data-reveal');
  const box = await page.locator('.fan').boundingBox();
  await page.mouse.move(box.x + box.width * 0.8, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.2, box.y + box.height / 2, {steps: 6});
  await page.mouse.up();
  await page.waitForFunction(b => document.querySelector('.fan-c.is-top')?.dataset.reveal !== b, before);
  const top = page.locator('.fan-c.is-top');
  const id = await top.getAttribute('data-reveal');
  await page.waitForTimeout(500); // ein Klick direkt nach dem Wischen wird absichtlich ignoriert
  await top.click();
  assert.equal(await hash(page), '#/sammlung/' + id, 'die vorderste Karte öffnet ihre Ansicht');
  assert.equal(await page.locator('.rb-big').count(), 0);
  assert.deepEqual(page.errors, []);
  await page.close();
});

test('Karte umdrehen: Querkarte, Antippen, Enter-Taste', async () => {
  const page = await open('/sammlung/m-2005', {storage: {'v2:app-cards': {cards: {'m-2005': 1}, claimed: ['willkommen']}}});
  const karte = page.locator('[data-flipcard]');
  assert.ok((await karte.getAttribute('class')).includes('quer'), 'Titelkarten stehen quer');
  await karte.click();
  assert.ok((await karte.getAttribute('class')).includes('is-back'));
  assert.equal(await karte.getAttribute('aria-pressed'), 'true');
  await karte.focus();
  await page.keyboard.press('Enter');
  assert.ok(!(await karte.getAttribute('class')).includes('is-back'));
  assert.deepEqual(page.errors, []);
  await page.close();
});

test('Wissen: wird beim Öffnen nachgeladen, Spielzug abspielen, Regel-Blatt', async () => {
  const page = await open('/wissen/spielzuege/kreuzen');
  await page.waitForSelector('[data-wk="play"]', {timeout: 8000});
  await page.click('[data-wk="play"]');
  assert.equal(await page.getAttribute('[data-wk="play"]', 'aria-pressed'), 'true', 'Wiedergabe läuft');
  await page.click('[data-wk="speed"]');
  assert.equal(await page.getAttribute('[data-wk="speed"]', 'aria-pressed'), 'true', 'halbes Tempo');
  await page.goto(origin + '/#/wissen/regeln/7m');
  await page.waitForSelector('h1:has-text("Siebenmeter")');
  // Regel-Blatt: «?» bei den Spielerwerten im Kader-Profil (laden das Wissen bei Bedarf nach)
  await page.goto(origin + '/#/team/10');
  const frage = page.locator('[data-rule]').first();
  await frage.waitFor();
  await frage.click();
  await page.waitForSelector('dialog#rule-dialog[open]');
  assert.ok(await page.locator('#rule-dialog h2').textContent());
  await page.click('#rule-dialog button[data-close]');
  assert.equal(await page.locator('dialog#rule-dialog[open]').count(), 0);
  assert.deepEqual(page.errors, []);
  await page.close();
});

const GESCHICHTE = {'v2:app-my-games': ['508363'], 'v2:app-tips': {508363: [33, 29]}};

test('Spiel-Story: 5 Sekunden je Karte, Pause per Knopf und Halten, von Hand weiter', async () => {
  const page = await open('/spiel/508363/kurz', {storage: GESCHICHTE});
  await page.waitForSelector('.rb');
  assert.equal(await step(page), 0);
  assert.equal(await page.getAttribute('.rb-slide', 'aria-live'), 'off', 'automatische Wechsel werden nicht vorgelesen');
  await page.waitForFunction(() => document.querySelector('.rb')?.dataset.rbStep === '1', null, {timeout: 8000});
  await page.click('[data-rb-pause]');
  assert.equal(await page.getAttribute('[data-rb-pause]', 'aria-label'), 'Weiter');
  await page.waitForTimeout(5600);
  assert.equal(await step(page), 1, 'Pause hält an');
  await page.click('[data-rb-pause]');
  await page.mouse.move(200, 420);
  await page.mouse.down();
  await page.waitForTimeout(5600);
  assert.equal(await step(page), 1, 'Halten pausiert');
  await page.mouse.up();
  await page.keyboard.press('ArrowRight');
  assert.equal(await step(page), 2);
  assert.equal(await page.getAttribute('.rb-slide', 'aria-live'), 'polite', 'Wechsel von Hand werden vorgelesen');
  await page.click('.rb-close');
  assert.equal(await hash(page), '#/spiel/508363/bericht');
  assert.deepEqual(page.errors, []);
  await page.close();
});

test('Saisonrückblick bei «Bewegung reduzieren»: keine Automatik, kein Pause-Knopf, Wechsel von Hand', async () => {
  const page = await open('/rueckblick', {storage: GESCHICHTE, reduced: true});
  await page.waitForSelector('.rb');
  assert.equal(await page.locator('[data-rb-pause]').count(), 0);
  await page.waitForTimeout(5800);
  assert.equal(await step(page), 0, 'bleibt stehen');
  await page.click('[data-rb="next"]', {position: {x: 100, y: 300}});
  assert.equal(await step(page), 1);
  const n = await page.locator('.rb-bars i').count();
  for (let i = 1; i < n; i++) await page.keyboard.press('ArrowRight');
  assert.equal(await page.getAttribute('.rb-slide', 'data-rb-id'), 'fan', 'letzte Karte: Fan-Typ');
  assert.ok(await page.locator('[data-rb-share]').count());
  assert.deepEqual(page.errors, []);
  await page.close();
});

test('Fanshop: Grösse wählen, in den Warenkorb, Menge ändern, Kasse bis vor die Zahlung', async () => {
  const page = await open('/ich');
  await page.click('a[href="#/shop"] >> nth=0');
  await page.waitForSelector('.pt');
  await page.click('.chip[data-ui="shopKind:trikot"]');
  await page.click('.pt:has-text("Trikot Auswärts")');
  const add = page.locator('[data-shop-add]');
  assert.equal(await add.isDisabled(), true, 'ohne Grösse gesperrt');
  assert.equal(await page.locator('[data-shop-opt="Grösse|L"]').getAttribute('aria-label'), 'L, ausverkauft');
  await page.click('[data-shop-opt="Grösse|M"]');
  assert.match(await add.textContent(), /In den Warenkorb · CHF 74\.–/);
  await add.click();
  await page.waitForSelector('.buy-ok');
  assert.equal(await page.locator('.shop-cart i').textContent(), '1');
  await page.click('.buy-ok a[href="#/warenkorb"]');
  await page.waitForSelector('.cl');
  await page.click('[data-shop-qty="0:1"]');
  assert.match(await page.locator('.sum .tot').textContent(), /CHF 148\.–/);
  assert.match(await page.locator('.free-t').textContent(), /Gratisversand erreicht/);
  await page.click('a[href="#/kasse"]');
  await page.click('[data-shop-delivery="abholung"]');
  assert.equal(await page.getAttribute('[data-shop-delivery="abholung"]', 'aria-pressed'), 'true');
  await page.click('a[href="#/kasse/adresse"]');
  await page.click('[data-shop-address-next]');
  assert.equal(await page.locator('[aria-invalid="true"]').count(), 3, 'Abholung: Name und E-Mail');
  await page.fill('[data-shop-field="first"]', 'Kim');
  await page.fill('[data-shop-field="last"]', 'Muster');
  await page.fill('[data-shop-field="email"]', 'kim@example.ch');
  await page.keyboard.press('Enter');
  await page.waitForSelector('.shop-stop');
  assert.equal(await hash(page), '#/kasse/uebersicht');
  assert.equal(await page.locator('.buy button').isDisabled(), true, 'Zahlung gesperrt');
  assert.deepEqual(await stored(page, 'v2:shop-checkout'), {delivery: 'abholung', address: {first: 'Kim', last: 'Muster', email: 'kim@example.ch'}});
  await page.click('[data-shop-forget]');
  assert.equal(await stored(page, 'v2:shop-checkout'), null);
  assert.deepEqual(page.errors, []);
  await page.close();
});

const failures = [];
// Die langen Geschichten-Tests laufen parallel zu den kurzen.
await Promise.all(
  tests.map(async ({name, fn}) => {
    const start = Date.now();
    try {
      await fn();
      console.log(`ok   ${name} (${Math.round((Date.now() - start) / 100) / 10} s)`);
    } catch (error) {
      failures.push(name);
      console.log(`FAIL ${name}\n     ${String(error.message).split('\n').slice(0, 6).join('\n     ')}`);
    }
  })
);
await browser.close();
server.close();
console.log(failures.length ? `\n${failures.length} von ${tests.length} Browser-Tests fehlgeschlagen.` : `\nAlle ${tests.length} Browser-Tests bestanden.`);
process.exit(failures.length ? 1 : 0);
