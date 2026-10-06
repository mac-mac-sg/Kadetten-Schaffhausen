import test from 'node:test';
import assert from 'node:assert/strict';
import {findPdfLinks, firstPageText, nextHomeGame, inspectProgrammes, storeProgramme, syncProgrammes, validPdf} from '../scripts/lib/programmes-source.mjs';
import {main} from '../scripts/cloudflare-programmes.mjs';
import {programmes} from '../server/programmes.mjs';

// Kleines gültiges PDF mit einer Seite Text (Titelseite eines Matchprogramms).
function pdf(text, pad = 1200) {
  const stream = `BT /F1 10 Tf 40 700 Td (${text.replace(/[()\\]/g, '\\$&')}) Tj ET`;
  const objs = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>',
    `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>'
  ];
  let out = '%PDF-1.4\n%' + 'x'.repeat(pad) + '\n';
  const offsets = [];
  objs.forEach((o, i) => { offsets.push(out.length); out += `${i + 1} 0 obj\n${o}\nendobj\n`; });
  const xref = out.length;
  out += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n` + offsets.map(o => String(o).padStart(10, '0') + ' 00000 n \n').join('');
  out += `trailer\n<< /Size ${objs.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return new TextEncoder().encode(out);
}

const game = {id: '508400', home: 'Kadetten Schaffhausen', away: 'HC Kriens-Luzern', date: '2099-02-14', time: '17:00'};
const other = {id: '508401', home: 'Pfadi Winterthur', away: 'Kadetten Schaffhausen', date: '2099-02-21', time: '17:00'};
const games = [{id: '1', home: 'Kadetten Schaffhausen', away: 'X', date: '2020-01-01', score: [30, 20]}, other, game];

test('PDF-Verweise: nur https auf kadettensh.ch, aus HTML und maskiertem JSON, ohne Doppelte', () => {
  const html = `<a href="/wp-content/uploads/2099/02/programm.pdf">Matchvorschau</a> <a href='https://kadettensh.ch/x/a.PDF?v=2'>x</a>
    <a href="https://fremd.example/boese.pdf">fremd</a> <a href="http://kadettensh.ch/alt.pdf">http</a> <a href="/wp-content/uploads/2099/02/programm.pdf">doppelt</a>`;
  const json = '{"content":{"rendered":"<a href=\\"https:\\/\\/kadettensh.ch\\/wp-content\\/uploads\\/b.pdf\\">b<\\/a>"}}';
  assert.deepEqual(findPdfLinks(html), ['https://kadettensh.ch/wp-content/uploads/2099/02/programm.pdf', 'https://kadettensh.ch/x/a.PDF?v=2']);
  assert.deepEqual(findPdfLinks(json), ['https://kadettensh.ch/wp-content/uploads/b.pdf']);
});

test('Erste PDF-Seite wird gelesen und das nächste Heimspiel gewählt', async () => {
  assert.match(await firstPageText(pdf('Kadetten Schaffhausen gegen HC Kriens-Luzern, 14.02.2099')), /Kriens-Luzern/);
  assert.equal(nextHomeGame(games, new Date('2099-01-01T10:00:00Z')).id, '508400', 'Auswärtsspiel und vergangene Spiele zählen nicht');
  assert.equal(nextHomeGame(games, new Date('2100-01-01T10:00:00Z')), null);
});

function fakeHttp({files, pages}) {
  return {
    async text(url) { return url in pages ? {status: 200, text: pages[url]} : {status: 404, text: ''}; },
    async bytes(url) { return url in files ? {status: 200, bytes: files[url], type: 'application/pdf'} : {status: 404, bytes: new Uint8Array(), type: 'text/html'}; }
  };
}

test('Trockenlauf: passendes PDF wird erkannt, falsches Datum, Nicht-PDF und fehlende Datei nicht, nichts wird geschrieben', async () => {
  const good = 'https://kadettensh.ch/wp-content/uploads/gut.pdf', wrong = 'https://kadettensh.ch/wp-content/uploads/falsch.pdf',
    html = 'https://kadettensh.ch/wp-content/uploads/seite.pdf', gone = 'https://kadettensh.ch/wp-content/uploads/weg.pdf';
  const http = fakeHttp({
    pages: {'https://kadettensh.ch/': `<a href="${good}">a</a><a href="${wrong}">b</a><a href="${html}">c</a><a href="${gone}">d</a>`},
    files: {
      [good]: pdf('Matchprogramm Kadetten Schaffhausen gegen HC Kriens-Luzern 14.02.2099'),
      [wrong]: pdf('Matchprogramm Kadetten Schaffhausen gegen HC Kriens-Luzern 20.02.2099'),
      [html]: new TextEncoder().encode('<html>Fehlerseite</html>')
    }
  });
  const r = await inspectProgrammes(http, games, new Date('2099-01-01T10:00:00Z'));
  assert.equal(r.game.id, '508400');
  const by = Object.fromEntries(r.pdfs.map(p => [p.url, p]));
  assert.equal(by[good].matches, true);
  assert.equal(by[wrong].isPdf && by[wrong].matches, false, 'anderes Datum passt nicht');
  assert.equal(by[html].isPdf, false);
  assert.equal(by[gone].status, 404);
  assert.deepEqual(r.sources.map(s => [s.status, s.links]), [[200, 4], [404, 0], [404, 0]]);
});

test('main meldet den Befund und ohne Treffer, dass nichts geschrieben wurde', async () => {
  const lines = [];
  const log = console.log;
  console.log = x => lines.push(String(x));
  try {
    await main(fakeHttp({pages: {}, files: {}}), games);
  } finally {
    console.log = log;
  }
  const text = lines.join('\n');
  assert.match(text, /Nächstes Heimspiel/);
  assert.match(text, /Kein PDF passt/);
});

function memBucket(initial = {}, failOn = null) {
  const map = new Map(Object.entries(initial));
  const order = [];
  return {
    map, order,
    async get(k) { return map.has(k) ? {json: async () => JSON.parse(map.get(k)), arrayBuffer: async () => map.get(k)} : null; },
    async put(k, v) { if (failOn && k.endsWith(failOn)) throw Error('KV-Schreiben fehlgeschlagen'); order.push(k); map.set(k, v); }
  };
}
const GOOD = 'https://kadettensh.ch/wp-content/downloads/Matchprogramm_Kadetten_EHL.pdf';
const goodPdf = () => pdf('Official Programme KADETTEN SCHAFFHAUSEN HC KRIENS-LUZERN 14.02.2099');
const programmeHttp = (bytes = goodPdf()) => fakeHttp({pages: {'https://kadettensh.ch/': `<a href="${GOOD}">Matchvorschau</a>`}, files: {[GOOD]: bytes}});
const NOW = new Date('2099-01-01T10:00:00Z');

test('Programm speichern: PDF zuerst, dann Metadaten; der Datendienst liefert es danach aus; unverändert wird nicht neu geschrieben', async () => {
  const bucket = memBucket({'kadetten/current.json': JSON.stringify({games})});
  const first = await syncProgrammes(programmeHttp(), bucket, games, NOW);
  assert.equal(first.result, 'gespeichert');
  assert.equal(bucket.order.length, 2);
  assert.match(bucket.order[0], /^kadetten\/programmes\/508400\/[a-f0-9]{64}\.pdf$/, 'PDF vor den Metadaten');
  assert.equal(bucket.order[1], 'kadetten/programmes/508400.json');
  const meta = JSON.parse(bucket.map.get('kadetten/programmes/508400.json'));
  assert.equal(meta.sourceUrl, GOOD);
  assert.equal(meta.version, bucket.order[0].match(/([a-f0-9]{64})\.pdf$/)[1]);

  // Der Datendienst liest genau dieses Format.
  const env = {BUCKET: {get: async k => (bucket.map.has(k) ? {json: async () => JSON.parse(bucket.map.get(k)), body: bucket.map.get(k)} : null)}};
  const info = await programmes(new Request('https://x.test/api/programmes/508400'), env);
  assert.equal(info.status, 200);
  assert.match((await info.json()).pdfPath, /^\/api\/programmes\/508400\/pdf\?v=[a-f0-9]{64}$/);
  const file = await programmes(new Request('https://x.test' + `/api/programmes/508400/pdf?v=${meta.version}`), env);
  assert.equal(file.status, 200);
  assert.equal(file.headers.get('Content-Type'), 'application/pdf');

  const again = await syncProgrammes(programmeHttp(), bucket, games, NOW);
  assert.equal(again.result, 'unveraendert');
  assert.equal(bucket.order.length, 2, 'keine weiteren Schreibzugriffe');
});

test('Programm speichern: ungültiges oder nicht passendes PDF und Schreibfehler lassen das bisherige Programm stehen', async () => {
  const bucket = memBucket();
  const tiny = pdf('Kadetten Schaffhausen HC Kriens-Luzern 14.02.2099', 0);
  assert.equal(validPdf(tiny), false, 'zu klein');
  assert.equal(validPdf(new TextEncoder().encode('%PDF-' + 'a'.repeat(2000))), false, 'ohne Dateiende');
  assert.equal((await syncProgrammes(programmeHttp(tiny), bucket, games, NOW)).result, 'ungueltig');
  const wrong = pdf('Official Programme KADETTEN SCHAFFHAUSEN HC KRIENS-LUZERN 20.02.2099');
  assert.equal((await syncProgrammes(programmeHttp(wrong), bucket, games, NOW)).result, 'kein passendes PDF');
  assert.equal((await syncProgrammes(fakeHttp({pages: {}, files: {}}), bucket, games, NOW)).result, 'kein passendes PDF');
  assert.equal((await syncProgrammes(programmeHttp(), bucket, [other], NOW)).result, 'kein Heimspiel');
  assert.equal(bucket.order.length, 0, 'nichts geschrieben');

  const broken = memBucket({'kadetten/programmes/508400.json': '{"alt":true}'}, '508400.json');
  await assert.rejects(syncProgrammes(programmeHttp(), broken, games, NOW), /KV-Schreiben/);
  assert.equal(broken.map.get('kadetten/programmes/508400.json'), '{"alt":true}', 'bisherige Metadaten bleiben');
  assert.equal(await storeProgramme(bucket, game, {matches: false}), 'ungueltig');
});
