// Wissensbereich: Inhalte, Feldbilder und Bewegung werden erst beim Öffnen nachgeladen (eigene Datei im Build, offline in
// der Hülle). Dazu das Regel-Blatt («?» bei Begriffen) und die Bedienung der Spielzug-Wiedergabe.
import {html} from '../text.js';
import {href} from '../router.js';
import {subBand, backLink, loading, notice} from '../views/parts.js';

export function createWissen({app, ui, render, announce}) {
  let modul = null,
    laden = null,
    fehler = false,
    steuerung = null;

  function lade() {
    laden ||= import('../wissen/modul.js').then(
      m => {
        modul = m;
        steuerung = m.createWissenSteuerung({ui, render});
        fehler = false;
        return m;
      },
      error => {
        laden = null;
        fehler = true;
        throw error;
      }
    );
    return laden;
  }

  function renderView(context) {
    if (modul) return modul.renderWissen(context);
    if (!fehler) lade().then(render, render);
    return html`${subBand(backLink('Mein Bereich', href.ich()), 'Wissen', 'Handball kurz erklärt')}
    <section class="sec">
      ${fehler ? notice('Der Wissensbereich konnte nicht geladen werden. Bitte mit Verbindung erneut öffnen.', 'offline') : loading('Wissen wird geladen …')}
    </section>`;
  }

  async function openRule(id, trigger) {
    let rule;
    try {
      rule = (await lade()).RULES[id];
    } catch {
      announce('Die Erklärung konnte nicht geladen werden.');
      return;
    }
    if (!rule) return;
    let dialog = document.getElementById('rule-dialog');
    if (!dialog) {
      dialog = Object.assign(document.createElement('dialog'), {id: 'rule-dialog', className: 'sheet'});
      dialog.setAttribute('aria-labelledby', 'rule-title');
      dialog.addEventListener('click', e => {
        if (e.target === dialog || e.target.closest('[data-close]')) dialog.close();
      });
      dialog.addEventListener('close', () => dialog._trigger?.focus());
      document.body.append(dialog);
    }
    dialog._trigger = trigger;
    dialog.innerHTML = String(
      html`<div class="sheet-body">
      <h2 class="h2" id="rule-title">${rule[0]}</h2>
      <p>${rule[1]}</p>
      <div class="acts">
      <a class="btn" href="${href.wissen('regeln', id)}" data-close>Mehr dazu</a><button type="button" class="btn pri" data-close autofocus>Schliessen</button></div>
      </div>`
    );
    dialog.showModal();
  }

  app.addEventListener('input', event => {
    if (event.target.matches?.('.wk-scrub')) steuerung?.seek(Number(event.target.value));
  });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) steuerung?.stop();
  });

  return {
    views: {wissen: renderView},
    actions: [
      ['data-rule', el => openRule(el.dataset.rule, el)],
      ['data-wk', el => steuerung?.click(el.dataset.wk)]
    ],
    focusAttrs: ['data-wk'],
    beforeRender: route => steuerung?.sync(route),
    afterRender: () => steuerung?.paint(),
    beforeNavigate: () => steuerung?.stop()
  };
}
