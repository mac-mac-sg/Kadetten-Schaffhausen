import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {parseHTML} from 'linkedom';

// Die V2 ist die Kadetten-App (docs/kadetten-app.md); FCSG und St. Otmar bleiben in Matchday (V1).
function load(saved = {}) {
  const {document} = parseHTML('<html data-preview="v2"><body><p id="app-feedback" hidden></p><main id="app"></main></body></html>'), noop = () => {};
  const store = new Map(Object.entries(saved)), listeners = {}, calls = {feedback: [], push: 0};
  const context = vm.createContext({document, location: {hash: '#home'}, setInterval: noop,
    window: {addEventListener: (type, fn) => { listeners[type] = fn; }},
    localStorage: {getItem: key => store.has(key) ? store.get(key) : null, setItem: (key, value) => store.set(key, String(value))},
    openClubSettings: noop, loadFcsgData: noop, updateFcsgLiveView: noop, render: noop, showLiveMatch: noop,
    CLUB_SELECTION_KEY: 'fan-app-selected-clubs-v1', CLUB_CHOICE_KEY: 'fan-app-active-club-v1', activeClub: 'kadetten',
    selectedClubs: ['kadetten', 'fcsg', 'otmar'],
    fanClubs: {kadetten: {name: 'Kadetten Schaffhausen', short: 'Kadetten'}, fcsg: {name: 'FC St. Gallen', short: 'FCSG'}, otmar: {name: 'TSV St. Otmar St. Gallen', short: 'St. Otmar'}},
    appFeedback: message => calls.feedback.push(message),
    readPushDevice: () => saved.push ? {subscription: {}, token: 't'} : null,
    updatePushPreferences: async () => { calls.push += 1; }});
  vm.runInContext(fs.readFileSync('archive/matchday/client/js/home-title.js', 'utf8'), context);
  vm.runInContext(fs.readFileSync('archive/matchday/client/v2/matchday.js', 'utf8'), context);
  return {context, document, store, calls, load: () => listeners.load?.()};
}

test('Only Kadetten remain selectable and the stored club choice is reset', () => {
  const {context, store} = load({'fan-app-selected-clubs-v1': '["fcsg","otmar"]', 'fan-app-active-club-v1': 'fcsg'});
  assert.deepEqual(Object.keys(context.fanClubs), ['kadetten']);
  assert.deepEqual([...context.selectedClubs], ['kadetten']);
  assert.equal(store.get('fan-app-selected-clubs-v1'), '["kadetten"]');
  assert.equal(store.get('fan-app-active-club-v1'), 'kadetten');
});

test('Returning users are told once where FCSG and St. Otmar went, and push follows the Kadetten', () => {
  const returning = load({'fan-app-selected-clubs-v1': '["kadetten","fcsg"]', push: true});
  returning.load();
  assert.equal(returning.calls.feedback.length, 1);
  assert.match(returning.calls.feedback[0], /nur noch die Kadetten.*Matchday/);
  assert.equal(returning.calls.push, 1);
  returning.load();
  assert.equal(returning.calls.feedback.length, 1, 'The notice appears only once');
  const fresh = load();
  fresh.load();
  assert.equal(fresh.calls.feedback.length, 0, 'First visits start without a migration notice');
});

test('Settings drop the club choice and link to Matchday instead', () => {
  const {context, document} = load();
  const dialog = document.createElement('dialog'); dialog.className = 'club-settings-dialog';
  dialog.innerHTML = '<section class="settings-group" aria-labelledby="settings-clubs-title"><h3 id="settings-clubs-title">Meine Vereine</h3></section><div class="club-settings-help"></div><section class="settings-app-info"></section>';
  document.body.append(dialog);
  context.v2InstallSettings(); context.v2InstallSettings();
  assert.equal(dialog.querySelector('#settings-clubs-title'), null);
  const links = dialog.querySelectorAll('[data-v2-matchday]');
  assert.equal(links.length, 1);
  assert.equal(links[0].getAttribute('href'), '../');
  assert.match(links[0].textContent, /FC St\. Gallen und St\. Otmar in Matchday/);
});

test('V2 introduction and QHL profiles speak only for the Kadetten', () => {
  const {document} = parseHTML('<html data-preview="v2"><body><button id="install-app"></button></body></html>');
  const create = document.createElement.bind(document);
  document.createElement = tag => { const e = create(tag); if (tag === 'dialog') { e.showModal = () => e.setAttribute('open', ''); e.close = () => e.removeAttribute('open'); } return e; };
  const intro = vm.createContext({document, window: {matchMedia: () => ({matches: false, addEventListener() {}}), addEventListener() {}}, navigator: {}, localStorage: {getItem: () => null, setItem() {}}, appFeedback() {}});
  vm.runInContext(fs.readFileSync('archive/matchday/client/pwa.js', 'utf8'), intro);
  intro.window.showAppIntroduction();
  assert.match(document.querySelector('.guide-progress').textContent, /Kadetten/);
  assert.match(document.querySelector('.guide-text').textContent, /Matchday/);
  assert.equal(document.querySelectorAll('.guide-visual img[src*="fcsg"],.guide-visual img[src*="140684"]').length, 0);
  const map = fs.readFileSync('archive/matchday/client/v2/qhl-map.js', 'utf8');
  assert.match(map, /club=typeof fanClubs!=='undefined'&&Object\.hasOwn\(fanClubs,team\.id\)\?team\.id:null/);
  assert.doesNotMatch(map, /team\.id==='otmar'\?/);
});

test('The Kadetten build names the app and leaves FCSG and St. Otmar photos out of the offline shell', () => {
  const build = fs.readFileSync('archive/matchday/build.mjs', 'utf8');
  assert.match(build, /name:'Kadetten Fan-App',short_name:'Kadetten'/);
  for (const file of ['fcsg-stadium.webp', 'otmar-kreuzbleiche.webp', 'v2-header-fcsg-evening.webp', 'v2-header-otmar-heart.webp'])
    assert.match(build, new RegExp("for\\(const file of \\[[^\\]]*'assets/" + file.replace('.', '\\.') + "'[^\\]]*\\]\\)shellFiles\\.splice"));
  assert.doesNotMatch(build, /'assets\/kadetten-squad-2026\.webp','assets\/otmar-squad-2026\.webp'/);
});
