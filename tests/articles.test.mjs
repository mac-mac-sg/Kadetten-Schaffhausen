import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {parseHTML} from 'linkedom';
const {document} = parseHTML('<html><body></body></html>');
// Linkedom verlangt für ein vollständiges Dokument die explizite HTML-Hülle.
class ArticleParser {
  parseFromString(html) { return parseHTML('<html><body>' + html + '</body></html>').document; }
}
const context = vm.createContext({DOMParser: ArticleParser, document, URL});
vm.runInContext(fs.readFileSync('src/client/js/views-news.js','utf8'), context);
function clean(html) {
  context.input = html;
  const result = vm.runInContext("sanitiseArticle(input,'https://kadettensh.ch/news/')", context);
  return parseHTML('<html><body>'+result+'</body></html>').document;
}

test('Artikel behalten Inhalt und Semantik, entfernen fremde Schriftsetzung und aktive Inhalte', () => {
  const d = clean('<div style="font-family:serif"><h1>Abschnitt</h1><p style="font-size:32px">Text <strong>wichtig</strong></p><script>alert(1)</script><svg onload="alert(1)"></svg><a href="javascript:alert(1)">Link</a><img src="https://example.org/photo.jpg" width="1600" height="900" onerror="alert(1)"></div>');
  assert.equal(d.querySelector('h2').textContent,'Abschnitt');
  assert.equal(d.querySelector('strong').textContent,'wichtig');
  assert.equal(d.querySelectorAll('[style],script,svg,[onerror],[onload]').length,0);
  assert.equal(d.querySelector('a').getAttribute('href'),null);
  assert.equal(d.querySelector('img').getAttribute('width'),'1600');
});

test('Logos werden gruppiert; hochauflösende Spielpläne bleiben Bilder', () => {
  const d = clean('<div class="x-row-inner"><div><span><img src="/a.png" width="224" height="224"></span><p>Heim</p></div><div><p>VS</p></div><div><img src="/Logo-Gast.png" width="244" height="333"><p>Gast</p></div></div><figure><img src="/Spielplan.png" width="1792" height="2400"><figcaption>Spielplan</figcaption></figure>');
  assert.equal(d.querySelectorAll('.article-logo-row .article-image-logo').length,2);
  assert.ok(d.querySelector('figure .article-image-photo'));
  assert.equal(d.querySelector('figcaption').textContent,'Spielplan');
  assert.equal(d.querySelector('img').getAttribute('src'),'https://kadettensh.ch/a.png');
});

test('Lazy-Bilder, Bildnachweise, Zitate und Autoren bleiben nutzbar', () => {
  const d = clean('<div class="x-text">Autorin</div><div class="x-quote-text">Ein Zitat.</div><span class="x-quote-cite-text">Trainer</span><figure><img data-src="https://example.org/foto.jpg" alt="Spielszene"><figcaption>Foto: Urheber</figcaption></figure><div><p><br></p></div>');
  assert.equal(d.querySelector('.article-byline').textContent,'Autorin');
  assert.equal(d.querySelector('blockquote').textContent,'Ein Zitat.');
  assert.equal(d.querySelector('cite').textContent,'Trainer');
  assert.equal(d.querySelector('img').getAttribute('alt'),'Spielszene');
  assert.equal(d.querySelector('figcaption').textContent,'Foto: Urheber');
  assert.equal(d.querySelectorAll('p').length,1);
});

test('Unsichere oder fehlende Bildadressen werden nicht als Artikelbilder ausgegeben', () => {
  const d = clean('<img><img src="javascript:alert(1)"><img src="data:image/svg+xml,evil"><img src="https://example.org/safe.jpg">');
  assert.equal(d.querySelectorAll('img').length,1);
  assert.equal(d.querySelector('img').getAttribute('loading'),'lazy');
});
