// Datenschutz und Angaben zur App (unter Einstellungen). Beschreibt, was auf dem Gerät bleibt und was der Datendienst speichert.
// Die Fristen entsprechen server/push-subscriptions.mjs (Push-Abo 180 Tage) und server/app-fan.mjs (Stimmen 60 Tage, Anschluss 6 Stunden).
import {html} from '../text.js';
import {href} from '../router.js';
import {subBand, backLink, sectionHead} from './parts.js';
import {versionLabel, ANALYTICS} from '../config.js';

export const REPO_URL = 'https://github.com/mac-mac-sg/Kadetten-Schaffhausen';

const block = (id, title, items) =>
  html`<section class="sec" aria-labelledby="${id}">${sectionHead(title, '', '', id)}
    <div class="card prose legal">${items.map(text => html`<p>${text}</p>`)}</div></section>`;

export function renderDatenschutz({analytics = ANALYTICS} = {}) {
  return html`${subBand(backLink('Einstellungen', href.einstellungen()), 'Datenschutz', 'Über die App')}
    ${block('ds-app', 'Über die App', [
      'Die Kadetten-App ist eine inoffizielle Fan-App. Sie wird privat betrieben und nicht von den Kadetten Schaffhausen herausgegeben.',
      'Spieldaten stammen vom Schweizerischen Handballverband und der EHF, News, Bilder und Fanshop-Artikel von kadettensh.ch. Die Rechte liegen bei den jeweiligen Urhebern.',
      'Texte, die mit «Von einer KI formuliert» bezeichnet sind, entstehen automatisch aus bestätigten Spieldaten.'
    ])}
    ${block('ds-geraet', 'Was auf deinem Gerät bleibt', [
      'Tipps, Sammelkarten, Quiz, Lieblingsspieler, «Meine Spiele», Darstellung, Warenkorb und die Angaben in der Kasse speichert die App nur im Browser dieses Geräts. Sie werden nicht übertragen.',
      'Du löschst sie, indem du die Website-Daten der App im Browser löschst. Die Angaben der Kasse lassen sich dort auch einzeln löschen.'
    ])}
    ${block('ds-dienst', 'Was der Datendienst speichert', [
      'Mitteilungen: Schaltest du Push ein, speichert der Datendienst die Adresse deines Push-Dienstes (Apple, Google oder Mozilla), die gewählten Mitteilungen und deinen Lieblingsspieler. Beim Ausschalten wird das gelöscht, sonst nach spätestens 180 Tagen.',
      'Fan-Wahl: Deine Stimme wird mit einer zufälligen, verschlüsselten Gerätekennung 60 Tage gespeichert. Gegen Mehrfachstimmen wird die IP-Adresse unumkehrbar verschlüsselt 6 Stunden gezählt.',
      analytics
        ? 'Es gibt keine Konten, keine Werbung und keine Cookies. Seitenaufrufe zählt Cloudflare Web Analytics anonym: ohne Cookies, ohne Wiedererkennung und ohne Profil einzelner Personen.'
        : 'Es gibt keine Konten, keine Werbung, keine Cookies und kein Tracking.'
    ])}
    ${block('ds-anbieter', 'Anbieter', [
      'Die App liegt bei GitHub Pages, der Datendienst bei Cloudflare. Beide verarbeiten beim Abruf technisch nötige Daten wie die IP-Adresse, auch ausserhalb der Schweiz.',
      'Bilder von kadettensh.ch werden direkt von dort geladen.'
    ])}
    <section class="sec" aria-labelledby="ds-kontakt">${sectionHead('Kontakt', '', '', 'ds-kontakt')}
      <div class="card prose legal"><p>Fragen, Fehler und Wünsche zur App: <a href="${REPO_URL + '/issues'}" target="_blank" rel="noopener noreferrer">über GitHub melden</a>.${versionLabel() ? html` Bitte die Version angeben: ${versionLabel()}.` : ''}</p></div></section>`;
}
