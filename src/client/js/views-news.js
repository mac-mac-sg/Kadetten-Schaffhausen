/* Startseite und News-Artikel. */
function home() {
  const storyMarkup = (n, i) => `<section class="story-screen" id="story-${i}"><img src="${liveEscape(photoUrl(n.image))}" alt="${n.title}" decoding="async" ${i ? 'loading="lazy"' : 'fetchpriority="high"'}><div class="story-copy"><p>${n.date} · News</p><h1>${n.title}</h1><a class="button subtle" href="#news/${liveEscape(n.id)}">Zum Artikel</a></div></section>`;
  return `<section class="home-news" aria-labelledby="home-news-title"><div class="story-feed"><div class="home-front-page"><div class="home-title-zone"><section class="home-matchday" aria-label="Aktuelles Kadetten-Spiel"><a id="live-match" class="live-match" aria-label="Kadetten-Spiel" aria-live="polite" hidden></a></section><header class="home-news-heading"><span aria-hidden="true"></span><h2 id="home-news-title">Neues aus dem Verein</h2></header></div>${stories[0] ? storyMarkup(stories[0], 0) : ''}</div>${stories.slice(1).map((n, i) => storyMarkup(n, i + 1)).join('')}</div><nav class="story-dots" aria-label="News auswählen" hidden>${stories.map((n, i) => `<button data-story="${i}" ${i > 4 ? 'hidden' : ''} aria-label="${n.title}" aria-pressed="${i === 0}"><span></span></button>`).join('')}</nav></section>${footer()}`;
}
function articleKey(n) {
  return String(n.id) + ':' + (n.articleVersion || 'pending');
}
function articleContentMarkup(n) {
  const saved = articleMemory.get(articleKey(n));
  return saved
    ? sanitiseArticle(saved.html, n.url)
    : `<p class="lead">${n.text}</p><p class="article-loading" role="status">Vollständiger Artikel wird geladen …</p>`;
}
function sanitiseArticle(html, source) {
  const doc = new DOMParser().parseFromString(html, 'text/html'),
    out = document.createElement('div'),
    allowed = new Set([
      'P',
      'DIV',
      'H2',
      'H3',
      'H4',
      'H5',
      'UL',
      'OL',
      'LI',
      'BLOCKQUOTE',
      'STRONG',
      'B',
      'EM',
      'I',
      'A',
      'BR',
      'HR',
      'IMG',
      'FIGURE',
      'FIGCAPTION',
      'TABLE',
      'THEAD',
      'TBODY',
      'TR',
      'TH',
      'TD',
      'SUP',
      'SUB'
    ]),
    blocked = new Set([
      'SCRIPT',
      'STYLE',
      'IFRAME',
      'OBJECT',
      'EMBED',
      'SVG',
      'MATH',
      'FORM',
      'INPUT',
      'BUTTON',
      'LINK',
      'META',
      'NOSCRIPT',
      'TEMPLATE',
      'CANVAS',
      'VIDEO',
      'AUDIO'
    ]);
  const copy = (node, parent) => {
    if (node.nodeType === 3) {
      parent.append(document.createTextNode(node.textContent));
      return;
    }
    if (node.nodeType !== 1 || blocked.has(node.tagName)) return;
    let target = parent;
    if (allowed.has(node.tagName)) {
      target = document.createElement(node.tagName.toLowerCase());
      if (node.tagName === 'A') {
        try {
          const url = new URL(node.getAttribute('href') || '', source);
          if (['https:', 'http:', 'mailto:', 'tel:'].includes(url.protocol)) {
            target.href = url.href;
            target.target = '_blank';
            target.rel = 'noopener noreferrer';
          }
        } catch {}
      }
      if (node.tagName === 'IMG') {
        try {
          const url = new URL(node.getAttribute('src') || '', source);
          if (url.protocol !== 'https:') return;
          target.src = url.href;
          target.alt = node.getAttribute('alt') || '';
          target.loading = 'lazy';
          target.decoding = 'async';
        } catch {
          return;
        }
      }
      parent.append(target);
    }
    for (const child of node.childNodes) copy(child, target);
  };
  for (const node of doc.body.childNodes) copy(node, out);
  return out.innerHTML;
}
async function loadFullArticle() {
  const [page, id] = (location.hash.slice(1) || 'home').split('/');
  if (page !== 'news') return;
  const n = stories.find(n => String(n.id) === id),
    target = document.getElementById('article-body');
  if (!n || !target || articleMemory.has(articleKey(n))) return;
  const key = articleKey(n);
  try {
    let pending = articleRequests.get(key);
    if (!pending) {
      pending = apiFetch(
        '/api/articles/' + encodeURIComponent(n.id) + (n.articleVersion ? '?v=' + n.articleVersion : ''),
        {signal: AbortSignal.timeout(20000)}
      ).then(async r => {
        if (!r.ok) throw Error('Article unavailable');
        const d = await r.json();
        if (
          String(d.id) !== String(n.id) ||
          typeof d.html !== 'string' ||
          (n.articleVersion && d.version !== n.articleVersion)
        )
          throw Error('Invalid article');
        articleMemory.set(key, d);
        if (articleMemory.size > 20) articleMemory.delete(articleMemory.keys().next().value);
        return d;
      });
      articleRequests.set(key, pending);
    }
    const d = await pending;
    if (document.getElementById('article-body') === target) {
      target.innerHTML = sanitiseArticle(d.html, n.url);
      target.querySelector('a')?.setAttribute('rel', 'noopener noreferrer');
    }
  } catch {
    if (document.getElementById('article-body') === target) {
      target.innerHTML = `<p class="lead">${n.text}</p><p class="notice">Der vollständige Artikel konnte gerade nicht geladen werden.</p><button class="button subtle" id="retry-article">Erneut laden</button>`;
      document.getElementById('retry-article').onclick = loadFullArticle;
    }
  } finally {
    articleRequests.delete(key);
  }
}
function article(id) {
  const n = stories.find(n => n.id === id);
  if (!n) return notFound();
  return `<article class="news-article"><div class="article-bar"><a class="back" href="#home" aria-label="Zurück zu den News">‹ News</a><button class="share button subtle">Teilen</button></div><img class="article-photo" src="${liveEscape(photoUrl(n.image))}" alt="${n.title}" fetchpriority="high" decoding="async"><div class="content narrow"><p class="muted">${n.date} · Vereinsnews</p><h1>${n.title}</h1><div id="article-body" class="article-fulltext">${articleContentMarkup(n)}</div>${n.id === 'bukarest' ? '<a class="button" href="#match/bukarest/stats">Spielstatistiken</a>' : ''}<p>${ext(n.url, 'Originalartikel bei den Kadetten', 'news-link')}</p><h2>Mehr News</h2>${stories
    .filter(x => x.id !== id)
    .slice(0, 4)
    .map(
      x =>
        `<a class="related-story" href="#news/${liveEscape(x.id)}"><img src="${liveEscape(photoUrl(x.image))}" alt="" loading="lazy" decoding="async"><span>${x.title}<small>${x.date}</small></span></a>`
    )
    .join('')}</div></article>${footer()}`;
}
