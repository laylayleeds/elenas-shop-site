/* build.js
   Runs automatically on every Cloudflare Pages deploy.
   Reads data.json and generates a real, separate static HTML page
   for every product at /product/{collectionId}/{productId}/index.html
   so crawlers (Pinterest, Google, etc.) see real product info instead
   of a blank JS-rendered shell. The main app (index.html) is copied
   through unchanged and still works exactly as before.
*/
const fs = require('fs');
const path = require('path');

// ---- set this to your live domain ----
const SITE_URL = 'https://elenasfinds.com';

const ROOT = __dirname;
const OUT = path.join(ROOT, 'dist');

function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}
function priceNumber(p) {
  const m = String(p || '').match(/[\d.]+/);
  return m ? m[0] : '';
}
function absUrl(u) {
  if (!u) return '';
  if (/^https?:\/\//i.test(u)) return u;
  return SITE_URL + '/' + String(u).replace(/^\/+/, '');
}

// ---- load content ----
const SITE = JSON.parse(fs.readFileSync(path.join(ROOT, 'data.json'), 'utf8'));
const siteName = esc(SITE.profile?.name || SITE.siteName || 'shop');

// ---- fresh output dir ----
fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });

// ---- copy the main app + data + images through unchanged ----
fs.copyFileSync(path.join(ROOT, 'index.html'), path.join(OUT, 'index.html'));
fs.copyFileSync(path.join(ROOT, 'data.json'), path.join(OUT, 'data.json'));
const imagesDir = path.join(ROOT, 'images');
if (fs.existsSync(imagesDir)) {
  fs.cpSync(imagesDir, path.join(OUT, 'images'), { recursive: true });
}

// ---- product page template ----
function productPage(p, c) {
  const url = `${SITE_URL}/product/${encodeURIComponent(c.id)}/${encodeURIComponent(p.id)}/`;
  const image = absUrl(p.image);
  const price = priceNumber(p.price);
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${esc(p.name)} — ${siteName}</title>
<meta name="description" content="${esc(p.description)}">

<meta property="og:type" content="product">
<meta property="og:title" content="${esc(p.name)}">
<meta property="og:description" content="${esc(p.description)}">
<meta property="og:image" content="${image}">
<meta property="og:url" content="${url}">
<meta property="og:site_name" content="${siteName}">
${price ? `<meta property="product:price:amount" content="${esc(price)}">
<meta property="product:price:currency" content="USD">` : ''}

<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(p.name)}">
<meta name="twitter:description" content="${esc(p.description)}">
<meta name="twitter:image" content="${image}">

<style>
  *{box-sizing:border-box}
  body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;
    max-width:600px;margin:0 auto;padding:36px 20px 60px;color:#221D17;background:#ECE4D3}
  img{max-width:100%;border-radius:16px;display:block;background:#ddd;aspect-ratio:1/1;object-fit:cover}
  h1{font-size:1.5em;margin:18px 0 4px;line-height:1.2}
  .price{font-family:monospace;color:#9C3B2A;font-size:1.05em;margin:0 0 14px;display:block}
  .desc{color:#5a5248;line-height:1.6;margin:0 0 20px}
  a.btn{display:inline-block;padding:12px 22px;background:#221D17;color:#fff;border-radius:10px;
    text-decoration:none;font-size:.85em;letter-spacing:.03em;text-transform:uppercase}
  a.btn:hover{background:#9C3B2A}
  a.back{display:block;margin-top:22px;font-size:.85em;color:#5a5248;text-decoration:underline}
</style>
</head>
<body>
  <img src="${esc(p.image)}" alt="${esc(p.name)}">
  <h1>${esc(p.name)}</h1>
  <span class="price">${esc(p.price)}${p.category ? ` · ${esc(p.category)}` : ''}</span>
  <p class="desc">${esc(p.description)}</p>
  <a class="btn" href="${esc(p.link)}" target="_blank" rel="noopener sponsored nofollow">shop this item →</a>
  <a class="back" href="/#/collection/${esc(c.id)}">see the full collection this is from →</a>
</body>
</html>`;
}

// ---- generate one page per product ----
let count = 0;
(SITE.collections || []).forEach(c => {
  (c.products || []).forEach(p => {
    const dir = path.join(OUT, 'product', c.id, p.id);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'index.html'), productPage(p, c));
    count++;
  });
});

console.log(`Build complete — generated ${count} product page(s).`);
