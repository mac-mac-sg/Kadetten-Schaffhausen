import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readJson, writeJson, storage} from '../src/kadetten/js/storage.js';
import {shortDate} from '../src/kadetten/js/logic.js';

const memory = () => {
  const m = new Map();
  return {getItem: k => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: k => m.delete(k)};
};

test('Gerätespeicher: lesen mit Rückfall, schreiben, löschen, nie ein Fehler', () => {
  const s = memory();
  assert.equal(readJson('k', 7, s), 7, 'fehlend → Rückfall');
  writeJson('k', {a: 1}, s);
  assert.deepEqual(readJson('k', null, s), {a: 1});
  s.setItem('kaputt', '{nicht json');
  assert.equal(readJson('kaputt', 'ok', s), 'ok', 'ungültig → Rückfall');
  writeJson('k', null, s);
  assert.equal(readJson('k', 'weg', s), 'weg', 'null löscht');
  const voll = {
    getItem: () => null,
    setItem: () => {
      throw new Error('voll');
    },
    removeItem: () => {
      throw new Error('gesperrt');
    }
  };
  assert.doesNotThrow(() => writeJson('k', 1, voll));
  assert.doesNotThrow(() => writeJson('k', null, voll));
  assert.equal(readJson('k', 3, null), 3, 'ohne Speicher → Rückfall');
  const gesperrt = Object.defineProperty({}, 'localStorage', {
    get() {
      throw new Error('gesperrt');
    }
  });
  const old = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    get() {
      throw new Error('gesperrt');
    }
  });
  try {
    assert.equal(storage(), null, 'gesperrter Zugriff → null');
  } finally {
    old ? Object.defineProperty(globalThis, 'localStorage', old) : delete globalThis.localStorage;
  }
  void gesperrt;
});

test('Datum kurz: mit und ohne Jahr, ungültig bleibt leer', () => {
  assert.equal(shortDate('2027-03-14'), '14.03.2027');
  assert.equal(shortDate('2027-03-14', false), '14.03.');
  assert.equal(shortDate('2027-03-14T18:00'), '14.03.2027');
  assert.equal(shortDate(''), '');
  assert.equal(shortDate(null), '');
  assert.equal(shortDate('14.03.2027'), '');
});
