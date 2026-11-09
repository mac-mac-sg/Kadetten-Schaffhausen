// Kurze Regel- und Begriffserklärungen. Ein «?» neben einem Wert öffnet die Kurzfassung, «Mehr dazu» führt in den Wissensbereich.
// Die Texte stehen in wissen/inhalt.js, damit Blatt und Artikel immer übereinstimmen.
import {ARTICLES} from './wissen/inhalt.js';

export const RULES = Object.fromEntries(ARTICLES.filter(a => a.chapter === 'regeln').map(a => [a.id, [a.title, a.short]]));
