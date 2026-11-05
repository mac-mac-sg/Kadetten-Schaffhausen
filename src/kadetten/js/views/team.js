// «Team»: Kader nach Position und Spielerprofile mit Saisonwerten.
import {html} from '../text.js';
import {icon} from '../icons.js';
import {href} from '../router.js';
import {SQUAD} from '../../data/squad.js';
import {favourite} from '../personal.js';
import {topBar, backBar, sectionHead, notice, stats, listRow, playerPhoto} from './parts.js';

const GROUPS = [['Tor', p => p.position === 'Tor'], ['Rückraum', p => /^Rückraum/.test(p.position)], ['Flügel', p => /^Flügel/.test(p.position)], ['Kreis', p => p.position === 'Kreis']];
const POSITION = pos => pos.replace(/^Rückraum mitte$/i, 'Rückraum Mitte').replace(/^Rückraum links$/i, 'Rückraum links');

function card(p, fav) {
  return html`<a class="pc" href="${href.spieler(p.number)}">
    <span class="ph"><img src="${playerPhoto(p.number)}" alt="" loading="lazy" decoding="async" width="160" height="200">${fav === p.number ? html`<span class="fav" aria-label="Lieblingsspieler">${icon('star', 16)}</span>` : ''}</span>
    <span class="nm">${p.name.split(' ').slice(-1)[0]}<small>${p.name.split(' ').slice(0, -1).join(' ')} · <span class="num">#${p.number}</span></small></span></a>`;
}

export function renderTeam() {
  const fav = favourite();
  return html`${topBar('Team')}
    ${GROUPS.map(([label, test], i) => {
      const list = SQUAD.filter(test).sort((a, b) => a.number - b.number);
      return list.length ? html`<section class="sec" aria-labelledby="${'team-' + i}">${sectionHead(label, '', '', 'team-' + i)}<div class="pgrid">${list.map(p => card(p, fav))}</div></section>` : '';
    })}
    <section class="sec"><p class="note">Kader 2026/27. Spielerfotos: kadettensh.ch.</p></section>`;
}

export function renderSpieler({route, state}) {
  const p = SQUAD.find(x => String(x.number) === route.id);
  if (!p) return html`${backBar('Team', href.team())}<h1 class="h1 pad">Spieler</h1><section class="sec">${notice('Diesen Spieler gibt es im aktuellen Kader nicht.', 'team')}</section>`;
  const season = state.data?.playerSeason?.players?.[p.number];
  const isFav = favourite() === p.number;
  const star = html`<button class="icb${isFav ? ' on' : ''}" type="button" data-favourite="${p.number}" aria-pressed="${String(isFav)}" aria-label="${isFav ? 'Nicht mehr Lieblingsspieler' : 'Als Lieblingsspieler merken'}">${icon('star', 20)}</button>`;
  return html`${backBar('Team', href.team(), star)}
    <section class="sec first"><div class="big-hero player"><img src="${playerPhoto(p.number)}" alt="" width="400" height="500" decoding="async"><span class="pill num">#${p.number}</span><div class="bh-text"><h1 class="h1">${p.name}</h1><p>${POSITION(p.position)}</p></div></div></section>
    <section class="sec" aria-labelledby="sp-saison">${sectionHead('Saison 2026/27 · QHL', '', '', 'sp-saison')}
      ${season ? stats([[season.games, 'Spiele'], [season.goals, 'Tore'], [season.sevenMeterGoals, '7-m-Tore']]) : notice('Noch keine Saisonwerte vorhanden.', 'saison')}
      ${season ? html`<p class="fine pad-top">${season.goalsPerGame != null ? `${String(season.goalsPerGame).replace('.', ',')} Tore pro Spiel · ` : ''}${season.twoMinutes ?? '–'} Zeitstrafen · Quelle: SHV</p>` : ''}
    </section>
    ${p.facts.length ? html`<section class="sec" aria-labelledby="sp-steck">${sectionHead('Steckbrief', '', '', 'sp-steck')}<dl class="card list facts">${p.facts.map(([k, v]) => html`<div class="rl"><dt>${k}</dt><dd>${v}</dd></div>`)}</dl></section>` : ''}
    ${p.url ? html`<section class="sec"><div class="card list">${listRow({title: 'Profil auf kadettensh.ch', end: icon('ext', 18), link: p.url})}</div></section>` : ''}`;
}
