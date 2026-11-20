// Gerätespeicher (localStorage) mit Rückfall: In privaten Fenstern, bei gesperrten Website-Daten oder in Vorschauen
// kann schon der Zugriff scheitern. Alle persönlichen Angaben der App bleiben auf dem Gerät (Präfix v2:).

/** localStorage oder null, wenn er nicht verfügbar ist. */
export const storage = () => {
  try {
    return globalThis.localStorage || null;
  } catch {
    return null;
  }
};

/** JSON lesen; bei fehlendem oder ungültigem Eintrag der Rückfallwert. s ist austauschbar (Tests). */
export const readJson = (key, fallback, s = storage()) => {
  try {
    return JSON.parse(s?.getItem(key) ?? 'null') ?? fallback;
  } catch {
    return fallback;
  }
};

/** JSON schreiben; null löscht den Eintrag. Fehler (voll, gesperrt) bleiben still. */
export const writeJson = (key, value, s = storage()) => {
  try {
    value === null ? s?.removeItem(key) : s?.setItem(key, JSON.stringify(value));
  } catch {}
};
