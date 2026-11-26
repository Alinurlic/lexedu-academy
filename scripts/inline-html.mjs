// Собирает dist-single в один самодостаточный файл release/LexEdu.html.
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dist = join(root, 'dist-single');
let html = readFileSync(join(dist, 'index.html'), 'utf8');

const read = (rel) => readFileSync(join(dist, rel.replace(/^\.\//, '')), 'utf8');

// CSS → <style>
html = html.replace(/<link rel="stylesheet"[^>]*href="([^"]+)"[^>]*>/g, (_, href) => `<style>${read(href)}</style>`);
// JS → встроенный модуль (закрывающий тег экранируется)
html = html.replace(/<script type="module"[^>]*src="([^"]+)"[^>]*><\/script>/g, (_, src) => {
  const code = read(src).replace(/<\/script/gi, '<\\/script');
  return `<script type="module">${code}</script>`;
});
// favicon → data URI
const fav = join(dist, 'favicon.png');
if (existsSync(fav)) {
  const b64 = readFileSync(fav).toString('base64');
  html = html.replace(/href="\.\/favicon\.png"/, () => `href="data:image/png;base64,${b64}"`);
}
if (/src="\.\/assets\/|href="\.\/assets\//.test(html)) throw new Error('Остались внешние ссылки на assets — файл не будет самодостаточным');

mkdirSync(join(root, 'release'), { recursive: true });
const out = join(root, 'release', 'LexEdu.html');
writeFileSync(out, html);
console.log(`Готово: release/LexEdu.html (${(html.length / 1024 / 1024).toFixed(2)} МБ)`);
