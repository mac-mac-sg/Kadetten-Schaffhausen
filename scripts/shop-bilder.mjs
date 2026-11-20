// Verkleinerte Produktbilder für den Fanshop der App (assets/shop/<Bild-ID>.webp, 720 px, WebP).
// Die Originale im Online-Shop sind bis 2000 px gross; die App lädt die kleinen Kopien und fällt sonst auf das Original zurück.
// Aufruf nach neuen Produkten: node scripts/shop-bilder.mjs (braucht Netz zu kadettensh.ch und den Playwright-Browser).
import fs from 'node:fs';
import path from 'node:path';
import {chromium} from 'playwright';
import {fetchShop} from '../server/shop.mjs';

const OUT = path.resolve('src/kadetten/assets/shop');
const LIST = path.resolve('src/kadetten/data/shop-bilder.js');
const MAX = 720;

const get = async (url, json) => {
  const r = await fetch(url, {headers: {'User-Agent': 'kadetten-app-shop-bilder'}, signal: AbortSignal.timeout(30000)});
  if (!r.ok) throw Error('HTTP ' + r.status + ' ' + url);
  return json ? r.json() : r;
};

const {products} = await fetchShop(get);
const images = new Map();
for (const p of products) for (const i of [...p.images, ...p.variants.map(v => v.image).filter(Boolean)]) images.set(i.id, i.src);
fs.mkdirSync(OUT, {recursive: true});
const browser = await chromium.launch();
const page = await browser.newPage();
let made = 0;
for (const [id, src] of images) {
  const file = path.join(OUT, id + '.webp');
  if (fs.existsSync(file)) continue;
  const bytes = Buffer.from(await (await get(src)).arrayBuffer());
  const type = /\.png$/i.test(src) ? 'image/png' : /\.webp$/i.test(src) ? 'image/webp' : 'image/jpeg';
  const data = await page.evaluate(
    async ({b64, type, max}) => {
      const img = new Image();
      img.src = `data:${type};base64,${b64}`;
      await img.decode();
      const scale = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
      const c = document.createElement('canvas');
      c.width = Math.round(img.naturalWidth * scale);
      c.height = Math.round(img.naturalHeight * scale);
      const ctx = c.getContext('2d');
      ctx.fillStyle = '#fff';
      ctx.fillRect(0, 0, c.width, c.height);
      ctx.drawImage(img, 0, 0, c.width, c.height);
      return c.toDataURL('image/webp', 0.78).split(',')[1];
    },
    {b64: bytes.toString('base64'), type, max: MAX}
  );
  fs.writeFileSync(file, Buffer.from(data, 'base64'));
  made++;
}
await browser.close();
const ids = [...images.keys()].filter(id => fs.existsSync(path.join(OUT, id + '.webp'))).sort();
fs.writeFileSync(
  LIST,
  `// Erzeugt von scripts/shop-bilder.mjs: Produktbilder mit verkleinerter Kopie unter assets/shop/<ID>.webp.\nexport const SHOP_IMAGES = new Set(${JSON.stringify(ids)});\n`
);
console.log(`${made} neue Bilder, ${ids.length} insgesamt.`);
