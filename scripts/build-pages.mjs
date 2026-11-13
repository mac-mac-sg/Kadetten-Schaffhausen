// GitHub Pages: Die Kadetten-App ist die gültige App unter / (docs/kadetten-app.md, Entscheid vom 13.11.2026).
// Matchday (V1) ist archiviert und wird nicht mehr veröffentlicht: archive/matchday/README.md.
import {writeFileSync} from 'node:fs';
import {buildApp} from './build-app.mjs';

// Unter / dieselbe Manifest-ID und derselbe Scope wie bisher Matchday: Installierte Matchday-Apps werden zur Kadetten-App.
await buildApp({outDir: 'dist/client', target: 'pages'});
// Unter /v2/ bleibt eine Kopie, damit dort installierte Apps und ihre Push-Abos ohne Unterbruch weiterlaufen.
await buildApp({outDir: 'dist/client/v2', target: 'pages'});
writeFileSync('dist/client/.nojekyll', '');

await import('./check-preview.mjs');
