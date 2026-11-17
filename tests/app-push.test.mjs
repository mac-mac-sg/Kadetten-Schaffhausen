import test from 'node:test';
import assert from 'node:assert/strict';
import {createPush, PUSH_DEVICE_KEY, readDevice} from '../src/kadetten/js/push.js';

function setup(t, {device, subscription, permission = 'granted', scope = 'https://mac-mac-sg.github.io/Kadetten-Schaffhausen/v2/'} = {}) {
  const current = subscription === undefined ? {endpoint: 'https://fcm.googleapis.com/current', keys: {}} : subscription;
  const saved = device === undefined
    ? {token: 'a'.repeat(43), active: true, types: ['reminder', 'start', 'final'], subscription: {endpoint: 'https://fcm.googleapis.com/previous', keys: {}}}
    : device;
  const values = new Map(saved ? [[PUSH_DEVICE_KEY, JSON.stringify(saved)]] : []);
  const globals = {
    localStorage: {getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value)},
    Notification: {permission},
    location: {href: 'https://mac-mac-sg.github.io/Kadetten-Schaffhausen/v2/#/ich/einstellungen'},
    navigator: {serviceWorker: {ready: Promise.resolve({scope, pushManager: {getSubscription: async () => current && {toJSON: () => current}}})}}
  };
  for (const [key, value] of Object.entries(globals)) {
    const descriptor = Object.getOwnPropertyDescriptor(globalThis, key);
    Object.defineProperty(globalThis, key, {configurable: true, value});
    t.after(() => descriptor ? Object.defineProperty(globalThis, key, descriptor) : delete globalThis[key]);
  }
  return {current, saved};
}

const reply = (data = {ok: true}, status = 200) => new Response(JSON.stringify(data), {status});

test('Test repariert fehlenden Servereintrag vor dem Versand mit der aktuellen Browser-Verbindung', async t => {
  const {current, saved} = setup(t);
  let registered = false;
  const calls = [];
  const push = createPush({fetchImpl: async (url, init) => {
    calls.push({url, ...init});
    if (init.method === 'PUT') registered = true;
    return registered ? reply() : reply({error: 'Device not registered'}, 404);
  }});
  await push.test();
  assert.deepEqual(calls.map(call => [call.url, call.method]), [['/api/push/device', 'PUT'], ['/api/push/test', 'POST']]);
  for (const call of calls) {
    assert.deepEqual(JSON.parse(call.body).subscription, current);
    assert.equal(call.headers.Authorization, 'Bearer ' + saved.token);
  }
  assert.deepEqual(JSON.parse(calls[0].body).types, saved.types);
  assert.equal(readDevice().active, true);
});

test('Beim Öffnen werden vorhandene Abos verlängert, parallele Wiederherstellungen teilen einen Abruf', async t => {
  setup(t);
  let puts = 0;
  const push = createPush({fetchImpl: async () => { puts++; return reply(); }});
  await Promise.all([push.restore(), push.restore()]);
  assert.equal(puts, 1);
});

test('Ohne aktiviertes Abo wird kein erfolgreicher Test gemeldet und kein Gerät angemeldet', async t => {
  setup(t, {device: null});
  let calls = 0;
  const push = createPush({fetchImpl: async () => { calls++; return reply(); }});
  assert.equal(await push.restore(), false);
  await assert.rejects(push.test(), /zuerst einschalten/);
  assert.equal(calls, 0);
});

test('Abgelaufene Browser-Verbindung und entzogene Berechtigung führen zur erneuten Aktivierung', async t => {
  for (const state of [{subscription: null}, {permission: 'denied'}]) {
    await t.test(JSON.stringify(state), async t => {
      setup(t, state);
      let calls = 0;
      const push = createPush({fetchImpl: async () => { calls++; return reply(); }});
      await assert.rejects(push.test(), /erneut einschalten/);
      assert.equal(readDevice().active, false);
      assert.equal(calls, 0);
    });
  }
});

test('Netzfehler bei der Registrierung senden keinen Test und erhalten die bisherige Auswahl', async t => {
  const {saved} = setup(t);
  const calls = [];
  const push = createPush({fetchImpl: async (url, init) => { calls.push(init.method); return reply({error: 'Dienst nicht erreichbar'}, 503); }});
  await assert.rejects(push.test(), /Dienst nicht erreichbar/);
  assert.deepEqual(calls, ['PUT']);
  assert.deepEqual(readDevice(), saved);
});

test('Lieblingsspieler wird beim Wiederherstellen übermittelt und für weitere Aufrufe gespeichert', async t => {
  setup(t, {device: {token: 'b'.repeat(43), active: true, types: ['final', 'favourite'], subscription: {endpoint: 'previous'}}});
  const bodies = [];
  const push = createPush({fetchImpl: async (_, init) => { bodies.push(JSON.parse(init.body)); return reply(); }});
  await push.restore(123);
  await push.test();
  assert.deepEqual(bodies[0].favourite, {shv: 123});
  assert.deepEqual(bodies[1].favourite, {shv: 123});
  assert.deepEqual(bodies[1].types, ['final', 'favourite']);
});

test('Ein Gerät mit leerer Auswahl bekommt durch die Reparatur keine Spielhinweise hinzugefügt', async t => {
  setup(t, {device: {token: 'b'.repeat(43), active: true, types: [], subscription: {endpoint: 'previous'}}});
  const push = createPush({fetchImpl: async (_, init) => {
    if (init.method === 'PUT') assert.deepEqual(JSON.parse(init.body).types, []);
    return reply();
  }});
  await push.test();
});

test('Ein Service Worker aus dem anderen App-Pfad wird nicht zur Geräte-Reparatur verwendet', async t => {
  setup(t, {scope: 'https://mac-mac-sg.github.io/Kadetten-Schaffhausen/'});
  let calls = 0;
  const push = createPush({fetchImpl: async () => { calls++; return reply(); }});
  await assert.rejects(push.test(), /neu laden/);
  assert.equal(calls, 0);
});
