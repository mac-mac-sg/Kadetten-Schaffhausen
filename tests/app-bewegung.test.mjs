import test from 'node:test';
import assert from 'node:assert/strict';
import {parseHTML} from 'linkedom';
import {ARTICLES, article} from '../src/kadetten/js/wissen/inhalt.js';
import {frame, advance, clock, DURATION, MARKS, GOAL, stepAt} from '../src/kadetten/js/wissen/bewegung.js';
import {liveFeld, updateFeld, stepPlayers} from '../src/kadetten/js/wissen/feld.js';
import {createWissenSteuerung} from '../src/kadetten/js/wissen/steuerung.js';
import {renderWissen} from '../src/kadetten/js/views/wissen.js';
import {parseRoute} from '../src/kadetten/js/router.js';

const ZUEGE = ARTICLES.filter(a => a.chapter === 'spielzuege');
const dom = fragment => parseHTML('<html><body>' + String(fragment) + '</body></html>').document;
const live = (zug, t) => dom(liveFeld({label: 'Test', zug, f: frame(zug, t)})).querySelector('svg');

test('Zeitleiste: Marken bei 0, 2 und 4 Sekunden, Schritt folgt der Zeit', () => {
  assert.deepEqual(MARKS, [0, 2, 4]);
  assert.equal(DURATION, 6);
  const z = article('kreuzen');
  assert.deepEqual([0, 1.99, 2, 3.5, 4, 6].map(t => stepAt(z, t)), [0, 0, 1, 1, 2, 2]);
  assert.equal(frame(z, -3).t, 0, 'vor dem Anfang');
  assert.equal(frame(z, 99).t, 6, 'nach dem Ende');
  assert.equal(frame(z, 2).plan, 1, 'an der Marke liegen die geplanten Wege des Schritts an');
  assert.equal(frame(z, 2.5).plan, null, 'dazwischen keine');
});

test('Alle acht Spielzüge: an den Marken stehen die Angreifer wie in den Daten, dazwischen sind die Wege weich', () => {
  assert.equal(ZUEGE.length, 8);
  for (const z of ZUEGE) {
    MARKS.forEach((m, i) => {
      const f = frame(z, m);
      for (const p of stepPlayers(z, i).filter(p => p.team === 'a')) {
        const got = f.players.find(q => q.l === p.l && q.team === 'a');
        assert.ok(Math.abs(got.x - p.x) < 0.01 && Math.abs(got.y - p.y) < 0.01, `${z.id} Marke ${i + 1}: ${p.l} steht an seinem Ort`);
      }
    });
    let prev = null, steps = 0;
    for (let t = 0; t <= DURATION + 1e-9; t += 0.05) {
      const f = frame(z, t);
      for (const p of f.players) {
        assert.ok(p.x >= 0 && p.x <= 220 && p.y >= 0 && p.y <= 150, `${z.id} t=${t.toFixed(2)}: ${p.l} im Feld`);
        const before = prev?.players.find(q => q.l === p.l && q.team === p.team);
        if (before) assert.ok(Math.hypot(p.x - before.x, p.y - before.y) < 6, `${z.id} t=${t.toFixed(2)}: ${p.l} springt nicht`);
      }
      if (prev) assert.ok(Math.hypot(f.ball.x - prev.ball.x, f.ball.y - prev.ball.y) < 14, `${z.id} t=${t.toFixed(2)}: Ball springt nicht`);
      assert.ok(f.ball.lift >= 0 && f.ball.lift <= 1);
      prev = f; steps++;
    }
    assert.ok(steps > 100);
  }
});

test('Ball: am Anfang in der Hand des Ballführenden, am Ende im Tor, im Flug mit Bogen', () => {
  for (const z of ZUEGE) {
    const f0 = frame(z, 0), holder = f0.players.find(p => p.l === z.steps[0].ball && p.team === 'a');
    assert.ok(Math.hypot(f0.ball.x - holder.x, f0.ball.y - holder.y) < 12, `${z.id}: Ball beim Ballführenden`);
    assert.deepEqual([frame(z, 6).ball.x, frame(z, 6).ball.y], GOAL, `${z.id}: Ball am Ende im Tor`);
    const lifts = []; for (let t = 0; t <= 6; t += 0.05) lifts.push(frame(z, t).ball.lift);
    assert.ok(Math.max(...lifts) > 0.5, `${z.id}: Ball fliegt im Bogen`);
  }
  const lifts = []; for (let t = 2; t <= 4; t += 0.02) lifts.push(frame(article('ueberzahl'), t).ball.lift);
  const peaks = lifts.filter((l, i) => i && i < lifts.length - 1 && l > 0.9 && l >= lifts[i - 1] && l >= lifts[i + 1]).length;
  assert.ok(peaks >= 2, 'zwei Pässe nacheinander: zwei Bögen');
});

test('Bild ist reine Rechnung: gleiche Zeit, gleiches Bild; Nachbilder nur in Bewegung; Blick zum Tor oder in Laufrichtung', () => {
  const z = article('kreuzen');
  assert.deepEqual(frame(z, 1.1), frame(z, 1.1));
  const still = frame(z, 0.05), moving = frame(z, 0.9);
  assert.ok(still.players.every(p => p.echoes.length === 0), 'am Anfang kein Nachbild');
  const rm = moving.players.find(p => p.l === 'RM' && p.team === 'a');
  assert.ok(rm.moving && rm.echoes.length > 0, 'Läufer hinterlässt Nachbilder');
  assert.ok(rm.angle < -30, 'läuft nach links: Blick nach links');
  const rr = frame(z, 0.9).players.find(p => p.l === 'RR' && p.team === 'a');
  assert.ok(!rr.moving && Math.abs(rr.angle) > 5, 'wer steht, schaut zum Tor');
  const d = frame(z, 4.5).players.find(p => p.l === '3' && p.team === 'd'), d0 = frame(z, 0).players.find(p => p.l === '3' && p.team === 'd');
  assert.ok(Math.hypot(d.x - d0.x, d.y - d0.y) > 8, 'Verteidiger 3 reagiert und öffnet die Lücke');
});

test('Hinweise: gültige Zeiten und Orte, kurze Texte, keine Überschneidung, Anzeige nur im Zeitfenster', () => {
  for (const z of ZUEGE) {
    assert.ok(z.hints?.length >= 1, z.id + ': mindestens ein Hinweis');
    const sorted = [...z.hints].sort((a, b) => a.t0 - b.t0);
    sorted.forEach((h, i) => {
      assert.ok(h.t0 >= 0 && h.t1 <= DURATION && h.t1 > h.t0, `${z.id}: Zeitfenster`);
      assert.ok(h.text.length <= 32, `${z.id}: Text kurz`);
      assert.ok(h.at[0] >= 0 && h.at[0] <= 220 && h.at[1] >= 0 && h.at[1] <= 150, `${z.id}: Ort im Feld`);
      if (i) assert.ok(h.t0 >= sorted[i - 1].t1, `${z.id}: Hinweise überschneiden sich nicht`);
    });
  }
  const z = article('kreuzen');
  assert.equal(frame(z, 3).hint.text, 'Verteidiger übergeben');
  assert.equal(frame(z, 4.5).hint.text, 'Lücke');
  assert.equal(frame(z, 0.5).hint, null);
});

test('advance und clock: Zeit läuft nur beim Abspielen, hält am Ende, halbes Tempo', () => {
  const run = {t: 1, playing: true, speed: 1};
  assert.equal(advance(run, 0.5).t, 1.5);
  assert.equal(advance({...run, speed: 0.5}, 0.5).t, 1.25);
  assert.deepEqual(advance({...run, t: 5.9}, 0.5), {t: 6, playing: false, speed: 1});
  const paused = {t: 1, playing: false, speed: 1};
  assert.equal(advance(paused, 1), paused, 'Pause: nichts ändert sich');
  assert.equal(clock(0), '0:00');
  assert.equal(clock(5.99), '0:05');
  assert.equal(clock(6), '0:06');
});

test('Live-Feld: updateFeld ergibt dasselbe Bild wie neu zeichnen', () => {
  for (const z of ZUEGE) for (const [t1, t2] of [[0, 2.7], [2.7, 4.5], [4.5, 0.4]]) {
    const svg = live(z, t1), fresh = live(z, t2);
    updateFeld(svg, frame(z, t2));
    for (const g of fresh.querySelectorAll('g.fb-p')) {
      const mine = svg.querySelector(`g.fb-p[data-l="${g.getAttribute('data-l')}"][class="${g.getAttribute('class')}"]`);
      assert.equal(mine.getAttribute('transform'), g.getAttribute('transform'), `${z.id} ${t1}→${t2}: Ort`);
      assert.equal(mine.querySelector('.fb-body').getAttribute('transform'), g.querySelector('.fb-body').getAttribute('transform'), `${z.id}: Blick`);
    }
    for (const sel of ['circle.fb-ball', '.fb-ballshadow']) for (const attr of ['cx', 'cy']) assert.equal(svg.querySelector(sel).getAttribute(attr), fresh.querySelector(sel).getAttribute(attr), `${z.id} ${sel} ${attr}`);
    assert.equal(svg.querySelector('g.fb-hint').getAttribute('class'), fresh.querySelector('g.fb-hint').getAttribute('class'), `${z.id}: Hinweis an/aus`);
    assert.equal(svg.querySelector('.fb-pilltext').textContent, fresh.querySelector('.fb-pilltext').textContent || svg.querySelector('.fb-pilltext').textContent);
    assert.deepEqual([...svg.querySelectorAll('g.fb-plan')].map(g => g.getAttribute('class')), [...fresh.querySelectorAll('g.fb-plan')].map(g => g.getAttribute('class')), `${z.id}: geplante Wege`);
    assert.deepEqual([...svg.querySelectorAll('ellipse.fb-echo')].map(e => e.getAttribute('class')), [...fresh.querySelectorAll('ellipse.fb-echo')].map(e => e.getAttribute('class')), `${z.id}: Nachbilder an/aus`);
  }
});

test('Live-Feld: keine style-Attribute, genau ein Bild mit Beschreibung, alle Spieler beschriftet', () => {
  const svg = live(article('sperre'), 2.5);
  assert.ok(!/style=/.test(svg.outerHTML), 'CSP: keine style-Attribute');
  assert.equal(svg.getAttribute('role'), 'img');
  assert.equal(svg.querySelectorAll('g.fb-p').length, 12, '6 Angreifer und 6 Verteidiger');
  assert.ok([...svg.querySelectorAll('g.fb-p text')].every(t => t.textContent.trim()));
});

// ---- Steuerung mit Scheinuhr ----
function setup(hash = '#/wissen/spielzuege/kreuzen', visible = () => true) {
  const ui = {};
  const root = parseHTML('<html><body><div id="app"></div></body></html>').document;
  let renders = 0;
  const render = () => { renders++; root.getElementById('app').innerHTML = String(renderWissen({route: parseRoute(hash), ui})); };
  render(); renders = 0;
  const queue = []; let clockNow = 0;
  const steuerung = createWissenSteuerung({ui, render, root, raf: fn => queue.push(fn) , cancel: () => { queue.length = 0; }, now: () => clockNow, visible});
  const tickFor = (seconds, step = 0.1) => { for (let s = 0; s < seconds - 1e-9; s += step) { clockNow += step * 1000; const fn = queue.shift(); if (!fn) return; fn(clockNow); } };
  return {ui, root, steuerung, tickFor, queue, get renders() { return renders; }};
}

test('Steuerung: Abspielen läuft mit der Zeit, Pause hält, Tempo halbiert, Regler hält an, am Ende stoppt es', () => {
  const s = setup();
  assert.equal(s.ui.anim.playing, false);
  s.steuerung.click('play');
  assert.equal(s.ui.anim.playing, true);
  assert.equal(s.root.querySelector('[data-wk="play"]').textContent, 'Pause', 'Knopf zeigt den Zustand');
  s.tickFor(1);
  assert.ok(Math.abs(s.ui.anim.t - 1) < 0.01, 'eine Sekunde Echtzeit, eine Sekunde im Bild');
  assert.equal(s.root.querySelector('[data-wk-time]').textContent, '0:01 / 0:06');
  s.steuerung.click('speed');
  assert.equal(s.ui.anim.speed, 0.5);
  const before = s.ui.anim.t; s.tickFor(1);
  assert.ok(Math.abs(s.ui.anim.t - before - 0.5) < 0.01, 'halbes Tempo');
  s.steuerung.click('play');
  assert.equal(s.ui.anim.playing, false, 'Pause');
  const held = s.ui.anim.t; s.tickFor(1);
  assert.equal(s.ui.anim.t, held, 'in der Pause bewegt sich nichts');
  s.steuerung.click('play'); s.steuerung.seek(4100);
  assert.equal(s.ui.anim.playing, false, 'Regler ziehen hält an');
  assert.equal(s.ui.anim.t, 4.1);
  assert.match(s.root.querySelector('[data-wk-caption]').textContent, /Schritt 3 von 3/, 'Text folgt der Zeit');
  assert.equal(s.root.querySelector('.wk-mk.on b').textContent, '3');
  s.steuerung.click('speed'); s.steuerung.click('play'); s.tickFor(10);
  assert.equal(s.ui.anim.t, 6, 'läuft bis zum Ende');
  assert.equal(s.ui.anim.playing, false, 'und hält dort an');
  assert.equal(s.root.querySelector('[data-wk="play"]').textContent, 'Abspielen');
  s.steuerung.click('play');
  assert.equal(s.ui.anim.t, 0, 'am Ende beginnt Abspielen von vorn');
  s.steuerung.stop();
  assert.equal(s.ui.anim.playing, false);
  s.steuerung.click('restart');
  assert.equal(s.ui.anim.playing, true);
  assert.equal(s.ui.anim.t, 0);
});

test('Steuerung: ohne Bild auf der Seite hält die Wiedergabe von selbst an', () => {
  const s = setup();
  s.steuerung.click('play');
  s.root.getElementById('app').innerHTML = '<p>andere Seite</p>';
  s.tickFor(0.2);
  assert.equal(s.ui.anim.playing, false);
  assert.equal(s.queue.length, 0, 'kein weiterer Zeitgeber');
});

test('Bewegung reduzieren: keine Wiedergabe-Knöpfe, der Regler springt zwischen den Schritten', () => {
  const saved = globalThis.matchMedia;
  globalThis.matchMedia = query => ({matches: /reduce/.test(query)});
  try {
    const d = dom(renderWissen({route: parseRoute('#/wissen/spielzuege/kreuzen'), ui: {}}));
    assert.equal(d.querySelector('[data-wk]'), null, 'kein Abspielen, kein Tempo');
    assert.equal(d.querySelector('.wk-scrub').getAttribute('step'), '2000');
    assert.equal(d.querySelectorAll('.wk-marks a').length, 3);
  } finally { globalThis.matchMedia = saved; }
});

test('Steuerung: ausserhalb des Bildschirms hält die Wiedergabe an und spart Akku', () => {
  let shown = true;
  const s = setup('#/wissen/spielzuege/kreuzen', () => shown);
  s.steuerung.click('play');
  s.tickFor(0.3);
  assert.ok(s.ui.anim.playing && s.ui.anim.t > 0.2);
  shown = false;
  s.tickFor(0.1);
  assert.equal(s.ui.anim.playing, false, 'Bild nicht mehr sichtbar: Pause');
  assert.equal(s.queue.length, 0);
});
