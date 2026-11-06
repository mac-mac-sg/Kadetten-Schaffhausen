// Baut die Kadetten Companion App (src/kadetten) nach dist/app.
// Eigener Matchday-Quellstand unter src/kadetten/matchday; V1 bleibt unverändert.
// KADETTEN_TARGET=pages setzt die Adresse des Datendienstes; ohne Angabe liest die App vom eigenen Host (npm run dev:app).
import {build, transform} from 'esbuild';
import {createHash} from 'node:crypto';
import {cpSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync} from 'node:fs';
import {join, relative} from 'node:path';

export const API_ORIGIN_PAGES = 'https://kadetten-api.mac-mac-sg.workers.dev';
const FONTS = [['inter', [400, 500, 600]], ['barlow-condensed', [600]]];

export async function buildApp({outDir = 'dist/app', target = process.env.KADETTEN_TARGET} = {}) {
  const src = 'src/kadetten';
  const apiOrigin = target === 'pages' ? API_ORIGIN_PAGES : '';
  rmSync(outDir, {recursive: true, force: true});
  mkdirSync(join(outDir, 'fonts'), {recursive: true});

  const matchday = join(src, 'matchday');
  const layout = JSON.parse(readFileSync(join(matchday, 'shell.json'), 'utf8'));
  const extension = await build({entryPoints: [join(src, 'js/matchday-companion.js')], bundle: true, write: false, format: 'iife', target: 'es2022', minify: true, legalComments: 'none', define: {__KADETTEN_API_ORIGIN__: JSON.stringify(apiOrigin)}, logLevel: 'warning'});
  const scripts = layout.scripts.filter(file => !['js/main.js', 'pwa.js'].includes(file));
  const prelude = `window.KADETTEN_PLATFORM=${JSON.stringify({apiOrigin})};
const localStorage={getItem:k=>window.localStorage.getItem('v2:'+k),setItem:(k,v)=>window.localStorage.setItem('v2:'+k,v),removeItem:k=>window.localStorage.removeItem('v2:'+k)};
`;
  const bridge = `window.KADETTEN_MATCHDAY={context(){const [page,id,tab='overview']=(location.hash.slice(1)||'home').split('/');let game=page==='match'?games.find(g=>String(g.id)===id):null;const live=game&&liveForFixture(game);if(live?.status==='finished')game={...game,score:live.score,half:live.half||game.half};return {club:activeClub,game,tab,data:updateState||{games,tables,stories},live:live&&live.status!=='finished'}},render(){render()}};`;
  const classic = prelude + scripts.map(file => readFileSync(join(matchday, file), 'utf8')).join('\n;\n') + '\n;' + bridge + '\n;' + extension.outputFiles[0].text + '\n;' + ['js/main.js','pwa.js'].map(file => readFileSync(join(matchday, file), 'utf8')).join('\n;\n');
  await build({stdin:{contents:classic,sourcefile:'matchday-companion-source.js'},outfile:join(outDir,'app.js'),format:'iife',target:'es2022',minify:true,legalComments:'none',logLevel:'warning'});
  const css = await transform(layout.styles.map(file => readFileSync(join(matchday,file),'utf8')).join('\n') + '\n' + readFileSync(join(src,'css/matchday-companion.css'),'utf8'),{loader:'css',target:'es2022',minify:true,legalComments:'none'});
  writeFileSync(join(outDir,'app.css'),css.code);
  mkdirSync(join(outDir,'vendor'),{recursive:true});
  for(const name of ['pdf.mjs','pdf.worker.mjs','LICENSE']) cpSync('node_modules/pdfjs-dist/'+(name==='LICENSE'?'LICENSE':'build/'+name),join(outDir,'vendor',name==='LICENSE'?'PDFJS-LICENSE':name));

  cpSync(join(src, 'assets'), join(outDir, 'assets'), {recursive: true});
  mkdirSync(join(outDir, 'data'), {recursive: true});
  cpSync(join(src, 'data/game-reports.json'), join(outDir, 'data/game-reports.json'));
  for (const file of ['theme-init.js', 'manifest.webmanifest']) cpSync(join(src, file), join(outDir, file));
  for (const [family, weights] of FONTS) {
    for (const weight of weights) for (const subset of ['latin', 'latin-ext']) {
      const name = `${family}-${subset}-${weight}-normal.woff2`;
      cpSync(`node_modules/@fontsource/${family}/files/${name}`, join(outDir, 'fonts', name));
    }
    cpSync(`node_modules/@fontsource/${family}/LICENSE`, join(outDir, 'fonts', `LICENSE-${family}`));
  }

  // Inhaltsversion über die ganze Hülle: jede Änderung ergibt einen neuen Cache.
  const files = listFiles(outDir);
  const hash = createHash('sha256');
  for (const file of files) hash.update(file).update(readFileSync(join(outDir, file)));
  const version = hash.digest('hex').slice(0, 16);

  const html = readFileSync(join(src, 'index.html'), 'utf8')
    .replace("connect-src 'self' __CONNECT_SRC__;", apiOrigin ? `connect-src 'self' ${apiOrigin};` : "connect-src 'self';")
    .replace('href="app.css"', `href="app.css?v=${version}"`).replace('src="app.js"', `src="app.js?v=${version}"`).replace('src="theme-init.js"', `src="theme-init.js?v=${version}"`);
  writeFileSync(join(outDir, 'index.html'), html);

  // Die 512-px-Symbole braucht nur das Betriebssystem beim Installieren; sie werden nicht vorgeladen.
  const shell = ['./', 'index.html', ...files.filter(f => f !== 'index.html' && !f.startsWith('vendor/') && !f.startsWith('fonts/LICENSE') && !f.includes('-512') && !/assets\/(?:[0-9]+|club-|news-|fcsg-|otmar-|v2-header-)/.test(f) && !f.startsWith('assets/maplibre-') && !f.startsWith('assets/players/') && !f.startsWith('assets/clubs/') && f !== 'assets/squad.webp' && f !== 'assets/team.webp')];
  const sw = readFileSync(join(src, 'sw.js'), 'utf8')
    .replace("'__VERSION__'", JSON.stringify(version)).replace('__SHELL__', JSON.stringify(shell)).replace("'__API_ORIGIN__'", JSON.stringify(apiOrigin));
  if (/__[A-Z_]+__/.test(sw)) throw Error('Platzhalter im Service Worker nicht ersetzt');
  writeFileSync(join(outDir, 'sw.js'), sw);
  return {outDir, version, shell, apiOrigin};
}

function listFiles(dir, base = dir) {
  return readdirSync(dir).flatMap(name => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? listFiles(path, base) : [relative(base, path).split('\\').join('/')];
  }).sort();
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const result = await buildApp();
  console.log(`Kadetten-App gebaut: ${result.outDir} (Version ${result.version}, ${result.shell.length} Dateien in der Hülle${result.apiOrigin ? ', Datendienst ' + result.apiOrigin : ''})`);
}
