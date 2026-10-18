/* Startseite und News-Artikel. */
function homeNewsCard(n, index, football = false) {
  const image=football?(n.image||'assets/fcsg-logo.svg'):photoUrl(n.image);
  return `<article class="v1-news-card" id="story-${index}"><a class="v1-news-link" href="#news/${liveEscape(n.id)}" aria-labelledby="news-title-${index}"><div class="v1-news-image"><img src="${liveEscape(image)}" alt="" decoding="async" ${index?'loading="lazy"':'fetchpriority="high"'}></div><div class="v1-news-copy"><p>${snapshotText(n.date)}</p><h2 id="news-title-${index}"><span>${snapshotText(n.title)}</span><span class="v1-news-arrow" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M4 12h16m-6-6 6 6-6 6"/></svg></span></h2></div></a></article>`;
}
function homeNewsLayout(news, fixture, football = false) {
  return `<section class="home-news v1-news-layout" aria-labelledby="home-news-title"><div class="story-feed"><div class="home-front-page"><div class="home-title-zone">${fixture}<header class="home-news-heading"><span aria-hidden="true"></span><h1 id="home-news-title">Neues aus dem Verein</h1></header>${sourceNotice('news')}</div>${news[0]?homeNewsCard(news[0],0,football):'<p class="notice">Noch keine News verfügbar.</p>'}</div><div class="v1-news-grid">${news.slice(1).map((n,i)=>homeNewsCard(n,i+1,football)).join('')}</div></div></section>${football?fcsgFooter():footer()}`;
}
function home() {
  return homeNewsLayout(stories, `<section class="home-matchday" aria-label="Aktuelles ${handballTeamName()}-Spiel"><a id="live-match" class="live-match" aria-label="${handballTeamName()}-Spiel" aria-live="polite" hidden></a></section>`);
}
function articleKey(n) {
  return handballClub() + ':' + String(n.id) + ':' + (n.articleVersion || 'pending');
}
function articleLoadingMarkup(){
  if(document.documentElement.dataset.design==='v2')return '<p class="article-loading" role="status">Vollständiger Artikel wird geladen …</p>';
  return '<div class="article-loading" role="status"><span>Vollständiger Artikel wird geladen …</span><div class="article-placeholder" aria-hidden="true"><i></i><i></i><i></i><i></i></div></div>';
}
function articleContentMarkup(n) {
  const saved = articleMemory.get(articleKey(n));
  return saved
    ? sanitiseArticle(saved.html, n.url)
    : `<p class="lead">${n.text}</p>${articleLoadingMarkup()}`;
}
function sanitiseArticle(html, source) {
  const doc = new DOMParser().parseFromString(html, 'text/html'),
    out = document.createElement('div'),
    allowed = new Set([
      'P',
      'DIV',
      'SPAN',
      'H1',
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
      'SUB',
      'CITE'
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
  const imageInfo = node => {
    const width = Number(node.getAttribute('width')), height = Number(node.getAttribute('height'));
    const src = node.getAttribute('src') || node.getAttribute('data-src') || node.getAttribute('data-lazy-src') || '';
    const logo = /(?:logo|wappen|crest|badge)/i.test(src + ' ' + (node.getAttribute('alt') || '')) ||
      (/\.png(?:[?#]|$)/i.test(src) && width > 0 && height > 0 && Math.max(width, height) <= 1400 && width / height >= 0.5 && width / height <= 2);
    return {src, width, height, kind: logo ? 'logo' : width > 0 && height > 0 && width / height > 3 ? 'banner' : 'photo'};
  };
  const firstText = doc.querySelector('.x-text');
  const copy = (node, parent) => {
    if (node.nodeType === 3) {
      parent.append(document.createTextNode(node.textContent));
      return;
    }
    if (node.nodeType !== 1 || blocked.has(node.tagName) || node.getAttribute('aria-hidden') === 'true') return;
    let target = parent;
    if (allowed.has(node.tagName)) {
      let tag = node.tagName === 'H1' ? 'h2' : node.tagName.toLowerCase();
      if (node.classList.contains('x-quote-text')) tag = 'blockquote';
      else if (node.classList.contains('x-quote-cite-text')) tag = 'cite';
      else if (node.tagName === 'DIV' && node.classList.contains('x-text') && !node.querySelector('p,div,h1,h2,h3,h4,h5,ul,ol,figure,table,img')) tag = 'p';
      target = document.createElement(tag);
      if (node === firstText && tag === 'p' && node.textContent.trim().length < 80) target.className = 'article-byline';
      if (node.classList.contains('x-row-inner')) {
        const images = [...node.querySelectorAll('img')];
        if (images.length > 1 && images.length <= 4 && images.every(img => imageInfo(img).kind === 'logo')) target.className = 'article-logo-row';
      }
      if (node.classList.contains('wp-block-gallery')) target.className = 'article-gallery';
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
          const info = imageInfo(node);
          if (!info.src.trim()) return;
          const url = new URL(info.src, source);
          if (url.protocol !== 'https:') return;
          target.className = 'article-image article-image-' + info.kind;
          if (info.width > 0 && info.height > 0 && info.width <= 20000 && info.height <= 20000) {
            target.setAttribute('width', String(info.width));
            target.setAttribute('height', String(info.height));
          }
          target.src = url.href;
          const alt = (node.getAttribute('alt') || '').trim();
          target.alt = alt && !/^(image|img)$/i.test(alt) ? alt : info.kind === 'logo' ? 'Vereinslogo aus dem Originalartikel' : 'Bild aus dem Originalartikel';
          target.setAttribute('loading', 'lazy');
          target.setAttribute('decoding', 'async');
        } catch {
          return;
        }
      }
      parent.append(target);
    }
    for (const child of node.childNodes) copy(child, target);
  };
  for (const node of doc.body.childNodes) copy(node, out);
  // Leere Layout-Hüllen und reine Abstandshalter aus dem Seitenersteller entfernen.
  for (const el of [...out.querySelectorAll('div,p')].reverse())
    if (!el.textContent.trim() && !el.querySelector('img,hr,table')) el.remove();
  // Some match blocks put both logos and all score parts into one builder column.
  // Normalise only unambiguous pairs; keep other article content as supplied.
  for (const row of out.querySelectorAll('.article-logo-row')) {
    const images = [...row.querySelectorAll('img')];
    if (images.length !== 2) continue;
    const text = row.textContent.trim(), score = text.match(/^(\d{1,3})\s*(?:VS\.?|:|[-–])\s*(?:\(\s*(\d{1,3}\s*:\s*\d{1,3})\s*\)\s*)?(\d{1,3})$/i);
    if (!score && !/^VS\.?$/i.test(text)) continue;
    const middle = document.createElement('div');middle.className = 'article-fixture-score';
    const result = document.createElement('strong');result.textContent = score ? score[1] + ' : ' + score[3] : 'VS';middle.append(result);
    if (score?.[2]) {const half = document.createElement('small');half.textContent = 'Halbzeit ' + score[2].replace(/\s/g,'');middle.append(half);}
    const logos = images.map(img => img.closest('a') || img);
    row.replaceChildren(logos[0], middle, logos[1]);row.classList.add('article-fixture-row');
  }
  const lead = [...out.querySelectorAll('p')].find(p =>
    !p.classList.contains('article-byline') && !p.closest('figure,blockquote,.article-logo-row') && p.textContent.trim().length > 100);
  lead?.classList.add('article-lead');
  return out.innerHTML;
}
async function loadFullArticle() {
  const [page, id] = (location.hash.slice(1) || 'home').split('/');
  if (page !== 'news') return;
  const n = stories.find(n => String(n.id) === id),
    target = document.getElementById('article-body');
  if (!n || !target || articleMemory.has(articleKey(n))) return;
  const key = articleKey(n);
  markArticleLoading(target);
  try {
    let pending = articleRequests.get(key);
    if (!pending) {
      pending = apiFetch(
        handballApiPath('/api/articles/') + encodeURIComponent(n.id) + (n.articleVersion ? '?v=' + n.articleVersion : ''),
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
      target.setAttribute('aria-busy','false');
      target.querySelector('a')?.setAttribute('rel', 'noopener noreferrer');
    }
  } catch {
    if (document.getElementById('article-body') === target) {
      target.setAttribute('aria-busy','false');
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
  return `<article class="news-article"><div class="article-bar">${backLink('#home', 'Zurück zu den News', 'back')}</div><img class="article-photo" src="${liveEscape(photoUrl(n.image))}" alt="${n.title}" fetchpriority="high" decoding="async"><div class="content narrow"><p class="muted">${n.date} · Vereinsnews</p><h1>${n.title}</h1>${sourceNotice('news')}<div id="article-body" class="article-fulltext" aria-busy="${!articleMemory.has(articleKey(n))}">${articleContentMarkup(n)}</div>${n.id === 'bukarest' ? '<a class="button" href="#match/bukarest/stats">Spielstatistiken</a>' : ''}<p>${ext(n.url, handballClub()==='otmar'?'Originalartikel bei St. Otmar':'Originalartikel bei den Kadetten', 'news-link')}</p><h2>Mehr News</h2>${stories
    .filter(x => x.id !== id)
    .slice(0, 4)
    .map(
      x =>
        `<a class="related-story" href="#news/${liveEscape(x.id)}"><img src="${liveEscape(photoUrl(x.image))}" alt="" loading="lazy" decoding="async"><span>${x.title}<small>${x.date}</small></span></a>`
    )
    .join('')}</div></article>${footer()}`;
}
