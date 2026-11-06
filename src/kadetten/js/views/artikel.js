// Vereinsartikel mit Volltext. Der Text läuft durch sanitize.js und wird erst nach dem Laden eingesetzt.
import {html, raw} from '../text.js';
import {icon} from '../icons.js';
import {href} from '../router.js';
import {sanitizeArticle} from '../sanitize.js';
import {backBar, notice, loading, listRow, storyImage} from './parts.js';

export function renderArtikel({route, state, load, api}) {
  const story = (state.data?.stories || []).find(s => String(s.id) === route.id);
  if (!story) return html`${backBar('News', href.news())}<h1 class="h1 pad">News</h1><section class="sec">${state.data ? notice('Dieser Artikel ist nicht mehr vorhanden.', 'doc') : loading()}</section>`;
  const full = /^[a-f0-9]{64}$/.test(story.articleVersion || '') ? load('article:' + story.id + ':' + story.articleVersion, async () => {
    const d = await api.article(story.id, story.articleVersion);
    if (String(d.id) !== String(story.id) || typeof d.html !== 'string' || (d.version && d.version !== story.articleVersion)) throw Error('Artikel passt nicht');
    return sanitizeArticle(d.html, {base: story.url});
  }, 3600000) : null;
  const image = storyImage(story);
  return html`${backBar('News', href.news())}
    <article class="sec first article">
      ${image ? html`<img class="article-img" src="${image}" alt="" decoding="async">` : ''}
      <p class="fine">${story.date}</p>
      <h1 class="h1 article-title">${story.title}</h1>
      <div class="prose">${full?.status === 'ready' ? raw(full.value) : full?.status === 'loading' ? html`<p>${story.text}</p>${loading('Ganzer Artikel wird geladen …')}` : html`<p>${story.text}</p>`}</div>
    </article>
    ${story.url ? html`<section class="sec"><div class="card list">${listRow({title: 'Artikel auf kadettensh.ch', end: icon('ext'), link: story.url})}</div></section>` : ''}`;
}
