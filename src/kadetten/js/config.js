// Beim Build gesetzt (scripts/build-app.mjs): leer für die lokale Vorschau, sonst die Adresse von kadetten-api.
/* global __KADETTEN_API_ORIGIN__ */
export const API_ORIGIN = typeof __KADETTEN_API_ORIGIN__ === 'string' ? __KADETTEN_API_ORIGIN__ : '';

// Versionsnummer (package.json) und Kurzform des Git-Commits, beim Build gesetzt; in der lokalen Vorschau ohne Build leer.
/* global __KADETTEN_VERSION__, __KADETTEN_COMMIT__ */
export const APP_VERSION = typeof __KADETTEN_VERSION__ === 'string' ? __KADETTEN_VERSION__ : '';
export const APP_COMMIT = typeof __KADETTEN_COMMIT__ === 'string' ? __KADETTEN_COMMIT__ : '';
/** «Version 1.0.0 (abc1234)»; ohne Build-Angaben leer. */
export const versionLabel = (version = APP_VERSION, commit = APP_COMMIT) =>
  version ? `Version ${version}${commit ? ` (${commit})` : ''}` : '';

// Cloudflare Web Analytics aktiv (Site-Token im Build gesetzt, scripts/build-app.mjs)? Steuert den Hinweis auf der Datenschutzseite.
/* global __KADETTEN_ANALYTICS__ */
export const ANALYTICS = typeof __KADETTEN_ANALYTICS__ === 'boolean' ? __KADETTEN_ANALYTICS__ : false;
