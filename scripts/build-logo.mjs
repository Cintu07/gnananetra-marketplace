// node scripts/build-logo.mjs
//
// Makes a sharp logo from data/brand/logo-source.jpeg (1600 x 448):
//   public/brand/wordmark.svg        the GNANANETRA letters traced to vector paths (saffron)
//   public/brand/wordmark-white.svg  the same in white, for dark backgrounds
//   public/brand/emblem.png          the yantra emblem cut out at full resolution (transparent)
//   public/brand/logo.png            emblem + wordmark rendered at 2x, for emails / invoices
// Vector letters stay crisp at every size; the old raster cut-out blurred.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import potrace from "potrace";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const p = (...a) => path.join(ROOT, ...a);
const SRC = p("data/brand/logo-source.jpeg");
const BRAND = "#F95E06";

const { data, info } = await sharp(SRC).removeAlpha().raw().toBuffer({ resolveWithObject: true });
const W = info.width;
const H = info.height;
const at = (x, y) => {
  const i = (y * W + x) * 3;
  return [data[i], data[i + 1], data[i + 2]];
};
// saffron letters: strong red, low-ish green (gold has green ~150-170), low blue
const isOrange = ([r, g, b]) => r > 190 && g < 135 && b < 110 && r - g > 80;
// anything clearly not paper white
const isInk = ([r, g, b]) => Math.min(r, g, b) < 225;

function bbox(test, x0 = 0, x1 = W) {
  let minX = W, minY = H, maxX = -1, maxY = -1;
  for (let y = 0; y < H; y++) for (let x = x0; x < x1; x++) if (test(at(x, y))) {
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  }
  return { minX, minY, maxX, maxY };
}

const word = bbox(isOrange);
const emblem = bbox(isInk, 0, word.minX - 6);
console.log("wordmark box", word, "emblem box", emblem);

// ---- wordmark: binary mask at 3x, traced
const pad = 6;
const wx = Math.max(0, word.minX - pad);
const wy = Math.max(0, word.minY - pad);
const ww = Math.min(W, word.maxX + pad) - wx;
const wh = Math.min(H, word.maxY + pad) - wy;
const mask = Buffer.alloc(ww * wh);
for (let y = 0; y < wh; y++) for (let x = 0; x < ww; x++) {
  const [r, g, b] = at(wx + x, wy + y);
  // soft edge: how "saffron" the pixel is, 0 = paper, 255 = ink
  const amount = Math.max(0, Math.min(255, (r - Math.max(g, b) - 40) * 2.2));
  mask[y * ww + x] = 255 - amount;
}
const scale = 3;
const big = await sharp(mask, { raw: { width: ww, height: wh, channels: 1 } })
  .resize(ww * scale, wh * scale, { kernel: "lanczos3" })
  .blur(0.6)
  .png()
  .toBuffer();
const traced = await new Promise((resolve, reject) =>
  potrace.trace(big, { threshold: 150, turdSize: 40, optTolerance: 0.25, color: BRAND, background: "transparent" }, (e, svg) => (e ? reject(e) : resolve(svg))),
);
const vbW = ww * scale;
const vbH = wh * scale;
const clean = (svg, fill) =>
  svg
    .replace(/<svg[^>]*>/, `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${vbW} ${vbH}" role="img" aria-label="Gnananetra">`)
    .replace(/fill="[^"]*"/g, `fill="${fill}"`)
    .replace(/<rect[^>]*\/>/g, "");
fs.mkdirSync(p("public/brand"), { recursive: true });
fs.writeFileSync(p("public/brand/wordmark.svg"), clean(traced, BRAND));
fs.writeFileSync(p("public/brand/wordmark-white.svg"), clean(traced, "#FFFFFF"));
console.log(`wordmark.svg  viewBox ${vbW}x${vbH}  ratio ${(vbW / vbH).toFixed(3)}  ${fs.statSync(p("public/brand/wordmark.svg")).size} bytes`);

// ---- emblem: full-resolution cut-out, white paper made transparent
const ex = Math.max(0, emblem.minX - 4);
const ey = Math.max(0, emblem.minY - 4);
const ew = emblem.maxX - ex + 5;
const eh = emblem.maxY - ey + 5;
const side = Math.max(ew, eh);
const emblemPng = await sharp(SRC)
  .extract({ left: ex, top: ey, width: ew, height: eh })
  .unflatten()
  .resize(side, side, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
  .png({ compressionLevel: 9 })
  .toBuffer();
await sharp(emblemPng).resize(384, 384).png({ compressionLevel: 9 }).toFile(p("public/brand/emblem.png"));
console.log(`emblem.png 384x384 from a ${side}px cut-out`);

// ---- full logo raster for email / PDF / invoice (2x of a 64px-tall logo)
const LH = 128;
const wordH = Math.round(LH * 0.62);
const wordW = Math.round((vbW / vbH) * wordH);
const wordPng = await sharp(Buffer.from(clean(traced, BRAND))).resize({ height: wordH }).png().toBuffer();
const gap = Math.round(LH * 0.18);
await sharp({ create: { width: LH + gap + wordW, height: LH, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
  .composite([
    { input: await sharp(emblemPng).resize(LH, LH).png().toBuffer(), left: 0, top: 0 },
    { input: wordPng, left: LH + gap, top: Math.round((LH - wordH) / 2) },
  ])
  .png({ compressionLevel: 9 })
  .toFile(p("public/brand/logo.png"));
await sharp(p("public/brand/logo.png")).flatten({ background: "#ffffff" }).resize({ height: 120 }).jpeg({ quality: 90 }).toFile(p("public/brand/logo-pdf.jpg"));
const lm = await sharp(p("public/brand/logo.png")).metadata();
console.log(`logo.png ${lm.width}x${lm.height}`);
