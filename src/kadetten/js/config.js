// Beim Build gesetzt (scripts/build-app.mjs): leer für die lokale Vorschau, sonst die Adresse von kadetten-api.
/* global __KADETTEN_API_ORIGIN__ */
export const API_ORIGIN = typeof __KADETTEN_API_ORIGIN__ === 'string' ? __KADETTEN_API_ORIGIN__ : '';
