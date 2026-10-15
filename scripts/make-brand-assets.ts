/*
 * Brand and error-page images (Sweep B1), made from the sources in design/:
 *   design/logo-source.png         the round book logo (1024px, white around the circle)
 *   design/night-desert-source.png the purple night-desert scene (error pages)
 * Run after changing a source:
 *   node --import ./tests/setup/register.mjs scripts/make-brand-assets.ts
 *
 * Writes:
 *   public/brand/mark-{64,128,256}.webp   the round mark, transparent outside the circle
 *   app/icon.png (32), app/favicon.ico (16+32+48), app/apple-icon.png (180)
 *                                          tab/home icons: the middle of the logo (book and light)
 *   public/brand/icon-{192,512}.png, icon-maskable-512.png   home-screen icons (app/manifest.ts)
 *   app/opengraph-image.png, app/twitter-image.png (1200x630)  link previews: mark + name as text
 *   public/brand/night-desert-{1600,800}.webp                 the error-page scene
 */
import { mkdirSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import sharp from "sharp";

const root = process.cwd();
const LOGO = join(root, "design", "logo-source.png");
const DESERT = join(root, "design", "night-desert-source.png");
const brand = join(root, "public", "brand");
const app = join(root, "app");
/** The site's dark page colour (globals.css --page-bg in dark mode). */
const DARK = "#0b0a10";

function report(path: string) {
  console.log(`${path.replace(root, "").replace(/\\/g, "/")}  ${(statSync(path).size / 1024).toFixed(1)} KB`);
}

/** The round mark: the logo's circle with everything outside it transparent. */
async function roundMark(size: number) {
  const meta = await sharp(LOGO).metadata();
  const side = Math.min(meta.width!, meta.height!);
  // A hair inside the drawn circle so no white edge survives.
  const radius = side / 2 - side * 0.012;
  const mask = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${side}" height="${side}"><circle cx="${side / 2}" cy="${side / 2}" r="${radius}" fill="#fff"/></svg>`);
  // Mask at full size first (sharp resizes before it composites), then scale.
  const masked = await sharp(LOGO)
    .resize(side, side, { fit: "cover" })
    .ensureAlpha()
    .composite([{ input: mask, blend: "dest-in" }])
    .png()
    .toBuffer();
  return sharp(masked).resize(size, size, { kernel: "lanczos3" });
}

/**
 * The middle of the logo (the book and the light above it), square, for tab
 * and home icons, where the lettering would be unreadable. Slightly boosted so
 * it stays clear at 16 and 32 px.
 */
function centreCrop(size: number) {
  return sharp(LOGO)
    // Book and light in the 1024px source: roughly x 200-840, y 190-780; the lettering starts below y 790.
    .extract({ left: 222, top: 196, width: 580, height: 580 })
    .resize(size, size, { kernel: "lanczos3" })
    .modulate({ saturation: 1.15, brightness: 1.04 })
    .sharpen(size <= 48 ? { sigma: 0.6 } : undefined);
}

/** A minimal .ico holding PNG images (supported by every current browser). */
function ico(pngs: { size: number; data: Buffer }[]) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(pngs.length, 4);
  let offset = 6 + 16 * pngs.length;
  const entries = pngs.map(({ size, data }) => {
    const entry = Buffer.alloc(16);
    entry.writeUInt8(size >= 256 ? 0 : size, 0);
    entry.writeUInt8(size >= 256 ? 0 : size, 1);
    entry.writeUInt16LE(1, 4);
    entry.writeUInt16LE(32, 6);
    entry.writeUInt32LE(data.length, 8);
    entry.writeUInt32LE(offset, 12);
    offset += data.length;
    return entry;
  });
  return Buffer.concat([header, ...entries, ...pngs.map((png) => png.data)]);
}

async function main() {
  mkdirSync(brand, { recursive: true });

  for (const size of [64, 128, 256]) {
    const file = join(brand, `mark-${size}.webp`);
    await (await roundMark(size)).webp({ quality: 82, alphaQuality: 90 }).toFile(file);
    report(file);
  }

  await centreCrop(32).png({ compressionLevel: 9 }).toFile(join(app, "icon.png"));
  report(join(app, "icon.png"));
  const icoSizes = await Promise.all([16, 32, 48].map(async (size) => ({ size, data: await centreCrop(size).png({ compressionLevel: 9 }).toBuffer() })));
  writeFileSync(join(app, "favicon.ico"), ico(icoSizes));
  report(join(app, "favicon.ico"));
  await centreCrop(180).png({ compressionLevel: 9, palette: true, quality: 90 }).toFile(join(app, "apple-icon.png"));
  report(join(app, "apple-icon.png"));

  for (const size of [192, 512]) {
    const file = join(brand, `icon-${size}.png`);
    await centreCrop(size).png({ compressionLevel: 9, palette: true, quality: 90 }).toFile(file);
    report(file);
  }
  // Maskable: the round mark inside the 80% safe zone on the dark page colour.
  const maskable = join(brand, "icon-maskable-512.png");
  await sharp({ create: { width: 512, height: 512, channels: 4, background: DARK } })
    .composite([{ input: await (await roundMark(400)).png().toBuffer(), gravity: "centre" }])
    .png({ compressionLevel: 9, palette: true, quality: 90 })
    .toFile(maskable);
  report(maskable);

  // Link preview: the mark and the name as real text, on the dark page colour.
  const preview = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630">
    <defs><radialGradient id="g" cx="0.28" cy="0.5" r="0.75"><stop offset="0" stop-color="#2a1550"/><stop offset="1" stop-color="${DARK}"/></radialGradient></defs>
    <rect width="1200" height="630" fill="url(#g)"/>
    <text x="560" y="300" font-family="Georgia, 'Times New Roman', serif" font-size="76" font-weight="700" fill="#f3f1f8">Dramatized</text>
    <text x="560" y="390" font-family="Georgia, 'Times New Roman', serif" font-size="76" font-weight="700" fill="#f3f1f8">Fiction</text>
    <text x="562" y="450" font-family="Arial, sans-serif" font-size="26" letter-spacing="2" fill="#c4b5fd">Serialized stories, one episode at a time</text>
  </svg>`);
  const og = await sharp(preview)
    .composite([{ input: await (await roundMark(400)).png().toBuffer(), left: 110, top: 115 }])
    .png({ compressionLevel: 9, palette: true, quality: 85 })
    .toBuffer();
  for (const name of ["opengraph-image.png", "twitter-image.png"]) {
    writeFileSync(join(app, name), og);
    report(join(app, name));
  }

  // The error-page scene (cactus at the left, moon at the right: shown whole).
  for (const width of [1600, 800]) {
    const file = join(brand, `night-desert-${width}.webp`);
    await sharp(DESERT).resize({ width, withoutEnlargement: true }).webp({ quality: width > 1000 ? 72 : 70 }).toFile(file);
    report(file);
  }
}

void main();
