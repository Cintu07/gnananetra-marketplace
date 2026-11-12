// npm run images
//
// 1. Brand: data/brand/logo-source.jpeg -> public/brand/{logo.png, logo-white.png, emblem.png}
//    and app/icon.png + app/apple-icon.png (white background made transparent, trimmed).
// 2. Catalogue: every product photo downloaded by wp_export.py (data/wp-export/images/*,
//    avif/jpg/png/webp) -> public/catalog/<product-slug>-<n>.webp, max 1200px, quality 80.
//    Writes data/catalog/image-map.json { originalUrl: { url, width, height } } for the importer.
//
// Safe to re-run; existing outputs are skipped unless --force.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const FORCE = process.argv.includes("--force");
const p = (...a) => path.join(ROOT, ...a);

async function brand() {
  // logo, emblem and the vector wordmark: scripts/build-logo.mjs (run first by `npm run images`)
  const emblem = p("public/brand/emblem.png");
  if (!fs.existsSync(emblem)) return console.log("brand: run scripts/build-logo.mjs first, skipped icons");
  const bg = { r: 255, g: 255, b: 255, alpha: 1 };
  const icon = (size, pad) =>
    sharp(emblem)
      .resize(size - pad * 2, size - pad * 2, { fit: "contain", background: bg })
      .extend({ top: pad, bottom: pad, left: pad, right: pad, background: bg })
      .flatten({ background: bg })
      .png();
  await icon(512, 36).toFile(p("app/icon.png"));
  await icon(180, 14).toFile(p("app/apple-icon.png"));
  console.log("brand: app/icon.png, app/apple-icon.png");
}

async function catalogue() {
  const productsFile = p("data/catalog/products.json");
  const imagesDir = p("data/wp-export/images");
  if (!fs.existsSync(productsFile) || !fs.existsSync(imagesDir)) {
    return console.log("catalogue: run the wordpress export + transform first, skipped");
  }
  const products = JSON.parse(fs.readFileSync(productsFile, "utf8"));
  const out = p("public/catalog");
  fs.mkdirSync(out, { recursive: true });
  const mapFile = p("data/catalog/image-map.json");
  const map = fs.existsSync(mapFile) && !FORCE ? JSON.parse(fs.readFileSync(mapFile, "utf8")) : {};
  let made = 0;
  let bytes = 0;
  for (const product of products) {
    let n = 0;
    for (const img of product.images) {
      n += 1;
      if (map[img.src] && fs.existsSync(p("public", map[img.src].url))) continue;
      if (!img.file) continue;
      const file = path.join(imagesDir, img.file);
      if (!fs.existsSync(file)) {
        console.log("  missing", img.file);
        continue;
      }
      const name = `${product.slug}-${n}.webp`.slice(-120);
      const dest = path.join(out, name);
      try {
        const info = await sharp(file)
          .rotate()
          .flatten({ background: "#ffffff" })
          .resize({ width: 1200, height: 1200, fit: "inside", withoutEnlargement: true })
          .webp({ quality: 80 })
          .toFile(dest);
        map[img.src] = { url: `/catalog/${name}`, width: info.width, height: info.height };
        made += 1;
        bytes += info.size;
      } catch (e) {
        console.log("  failed", img.file, e.message);
      }
    }
  }
  fs.writeFileSync(mapFile, JSON.stringify(map, null, 1));
  console.log(`catalogue: ${made} images written (${(bytes / 1048576).toFixed(1)} MB), ${Object.keys(map).length} in image-map.json`);
}

await brand();
await catalogue();
