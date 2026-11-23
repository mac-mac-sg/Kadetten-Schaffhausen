// Baut die Kadetten Companion App (src/kadetten) nach dist/app.
// Eigene Codebasis: liest nichts aus dem Archiv von Matchday (archive/matchday).
// KADETTEN_TARGET=pages setzt die Adresse des Datendienstes; ohne Angabe liest die App vom eigenen Host (npm run dev:app).
import {build} from 'esbuild';
import {createHash} from 'node:crypto';
import {cpSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync} from 'node:fs';
import {join, relative} from 'node:path';
import {execFileSync} from 'node:child_process';

export const API_ORIGIN_PAGES = 'https://kadetten-api.mac-mac-sg.workers.dev';
// Cloudflare Web Analytics (gratis, ohne Cookies): Site-Token aus dem Cloudflare-Dashboard (Web Analytics → Add a site →
// Hostname der App). Das Token ist öffentlich und steht im HTML. Leer = keine Zählung. Nur im Pages-Build, nicht lokal.
export const ANALYTICS_TOKEN = '';
export const ANALYTICS_SCRIPT = 'https://static.cloudflareinsights.com/beacon.min.js';
export const ANALYTICS_ENDPOINT = 'https://cloudflareinsights.com';
// Inter für Text, Barlow Condensed (auch kursiv) für Ziffern und Titel des Designs «Schnitt».
const FONTS = [
  ['inter', [400, 500, 600], ['normal']],
  ['barlow-condensed', [600], ['normal', 'italic']]
];

// Versionsnummer aus package.json, Commit aus GitHub Actions (GITHUB_SHA) oder dem lokalen Git; ohne Git leer.
export function buildInfo() {
  const version = JSON.parse(readFileSync('package.json', 'utf8')).version;
  let commit = process.env.GITHUB_SHA || '';
  if (!commit)
    try {
      commit = execFileSync('git', ['rev-parse', 'HEAD'], {encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore']}).trim();
    } catch {
      commit = '';
    }
  return {version, commit: /^[0-9a-f]{7,40}$/.test(commit) ? commit.slice(0, 7) : ''};
}

export async function buildApp({
  outDir = 'dist/app',
  target = process.env.KADETTEN_TARGET,
  analyticsToken = process.env.KADETTEN_ANALYTICS_TOKEN ?? ANALYTICS_TOKEN
} = {}) {
  const info = buildInfo();
  const analytics = target === 'pages' && /^[0-9a-f]{32}$/.test(analyticsToken || '') ? analyticsToken : '';
  const src = 'src/kadetten';
  const apiOrigin = target === 'pages' ? API_ORIGIN_PAGES : '';
  rmSync(outDir, {recursive: true, force: true});
  mkdirSync(join(outDir, 'fonts'), {recursive: true});

  // Code-Splitting: der Wissensbereich (dynamischer Import) landet in einer eigenen Datei unter chunks/, app.js bleibt der Einstieg.
  await build({
    entryPoints: {app: join(src, 'js/main.js')},
    outdir: outDir,
    splitting: true,
    chunkNames: 'chunks/[name]-[hash]',
    bundle: true,
    format: 'esm',
    target: 'es2020',
    minify: true,
    legalComments: 'none',
    define: {
      __KADETTEN_API_ORIGIN__: JSON.stringify(apiOrigin),
      __KADETTEN_VERSION__: JSON.stringify(info.version),
      __KADETTEN_COMMIT__: JSON.stringify(info.commit),
      __KADETTEN_ANALYTICS__: JSON.stringify(Boolean(analytics))
    },
    logLevel: 'warning'
  });
  await build({
    entryPoints: [join(src, 'css/app.css')],
    outfile: join(outDir, 'app.css'),
    bundle: true,
    minify: true,
    external: ['fonts/*', 'assets/*'],
    target: ['safari15', 'chrome100', 'firefox100'],
    logLevel: 'warning'
  });

  cpSync(join(src, 'assets'), join(outDir, 'assets'), {recursive: true});
  mkdirSync(join(outDir, 'data'), {recursive: true});
  cpSync(join(src, 'data/game-reports.json'), join(outDir, 'data/game-reports.json'));
  for (const file of ['theme-init.js', 'manifest.webmanifest']) cpSync(join(src, file), join(outDir, file));
  for (const [family, weights, styles] of FONTS) {
    for (const weight of weights)
      for (const style of styles)
        for (const subset of ['latin', 'latin-ext']) {
          const name = `${family}-${subset}-${weight}-${style}.woff2`;
          cpSync(`node_modules/@fontsource/${family}/files/${name}`, join(outDir, 'fonts', name));
        }
    cpSync(`node_modules/@fontsource/${family}/LICENSE`, join(outDir, 'fonts', `LICENSE-${family}`));
  }

  // Inhaltsversion über die ganze Hülle: jede Änderung ergibt einen neuen Cache.
  const files = listFiles(outDir);
  const hash = createHash('sha256');
  for (const file of files) hash.update(file).update(readFileSync(join(outDir, file)));
  const version = hash.digest('hex').slice(0, 16);

  // Dateien, die app.js beim Start statisch importiert, gleich mit vorladen (sonst erst nach app.js angefordert).
  const startChunks = [...readFileSync(join(outDir, 'app.js'), 'utf8').matchAll(/(?:from|import)\s*"\.\/(chunks\/[^"]+\.js)"/g)].map(
    m => m[1]
  );
  const preload = startChunks.map(c => `<link rel="modulepreload" href="${c}">`).join('');
  const html = readFileSync(join(src, 'index.html'), 'utf8')
    .replace(
      "connect-src 'self' __CONNECT_SRC__;",
      `connect-src 'self'${apiOrigin ? ' ' + apiOrigin : ''}${analytics ? ' ' + ANALYTICS_ENDPOINT : ''};`
    )
    .replace("script-src 'self';", analytics ? `script-src 'self' ${ANALYTICS_SCRIPT};` : "script-src 'self';")
    .replace(
      '</body>',
      analytics ? `<script defer src="${ANALYTICS_SCRIPT}" data-cf-beacon='{"token": "${analytics}"}'></script>\n</body>` : '</body>'
    )
    .replace('href="app.css"', `href="app.css?v=${version}"`)
    .replace('src="app.js"', `src="app.js?v=${version}"`)
    .replace('</head>', `${preload}</head>`)
    .replace('src="theme-init.js"', `src="theme-init.js?v=${version}"`);
  writeFileSync(join(outDir, 'index.html'), html);

  // Die 512-px-Symbole braucht nur das Betriebssystem beim Installieren; sie werden nicht vorgeladen.
  const shell = [
    './',
    'index.html',
    ...files.filter(
      f =>
        f !== 'index.html' &&
        !f.startsWith('fonts/LICENSE') &&
        !f.includes('-512') &&
        !f.startsWith('assets/players/') &&
        !f.startsWith('assets/clubs/') &&
        !f.startsWith('assets/shop/') &&
        f !== 'assets/squad.webp' &&
        f !== 'assets/team.webp'
    )
  ];
  const sw = readFileSync(join(src, 'sw.js'), 'utf8')
    .replace("'__VERSION__'", JSON.stringify(version))
    .replace('__SHELL__', JSON.stringify(shell))
    .replace("'__API_ORIGIN__'", JSON.stringify(apiOrigin));
  if (/__[A-Z_]+__/.test(sw)) throw Error('Platzhalter im Service Worker nicht ersetzt');
  writeFileSync(join(outDir, 'sw.js'), sw);
  return {outDir, version, shell, apiOrigin, appVersion: info.version, commit: info.commit, analytics: Boolean(analytics)};
}

function listFiles(dir, base = dir) {
  return readdirSync(dir)
    .flatMap(name => {
      const path = join(dir, name);
      return statSync(path).isDirectory() ? listFiles(path, base) : [relative(base, path).split('\\').join('/')];
    })
    .sort();
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const result = await buildApp();
  console.log(
    `Kadetten-App gebaut: ${result.outDir} (Version ${result.version}, ${result.shell.length} Dateien in der Hülle${result.apiOrigin ? ', Datendienst ' + result.apiOrigin : ''})`
  );
}
