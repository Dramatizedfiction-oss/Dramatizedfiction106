/*
 * Makes the test catalogue's placeholder covers (Sweep 17): original
 * gradient-and-title art, 600x900 WebP, written to public/test-covers/. The
 * files are committed and served as static files, so no image storage is
 * needed. Re-run after changing a title or color:
 *
 *   node --import ./tests/setup/register.mjs scripts/seed-test/make-covers.ts
 */
import { mkdirSync, statSync } from "node:fs";
import { join } from "node:path";
import sharp from "sharp";
import { SERIES, type SeriesDef } from "./catalogue";

const W = 600;
const H = 900;

/** Simple per-series motifs (all abstract shapes, drawn in white at low opacity). */
const MOTIFS: Partial<Record<SeriesDef["key"], string>> = {
  "salt-crown": `<path d="M150 330 L210 230 L255 300 L300 200 L345 300 L390 230 L450 330 Z" fill="none" stroke="#fff" stroke-opacity=".55" stroke-width="10" stroke-linejoin="round"/>
    <path d="M0 520 Q150 480 300 520 T600 520 V900 H0Z" fill="#fff" fill-opacity=".08"/>`,
  tidecaller: `<path d="M0 470 Q75 430 150 470 T300 470 T450 470 T600 470" fill="none" stroke="#fff" stroke-opacity=".45" stroke-width="8"/>
    <path d="M0 520 Q75 480 150 520 T300 520 T450 520 T600 520" fill="none" stroke="#fff" stroke-opacity=".3" stroke-width="8"/>`,
  "orbit-nine": `<circle cx="300" cy="300" r="90" fill="#fff" fill-opacity=".12"/>
    <ellipse cx="300" cy="300" rx="210" ry="60" fill="none" stroke="#fff" stroke-opacity=".5" stroke-width="5" transform="rotate(-18 300 300)"/>
    <circle cx="470" cy="245" r="10" fill="#fff" fill-opacity=".8"/>`,
  "lighthouse-letters": `<path d="M280 160 H320 L340 470 H260 Z" fill="#fff" fill-opacity=".22"/>
    <path d="M300 180 L560 120 L560 240 Z" fill="#fff" fill-opacity=".14"/>`,
  "ninth-floor-alibi": `${Array.from({ length: 9 }, (_, i) => `<rect x="190" y="${150 + i * 38}" width="220" height="26" rx="3" fill="#fff" fill-opacity="${i === 0 ? 0.6 : 0.12}"/>`).join("")}`,
  "what-the-fog-keeps": `<path d="M270 200 L300 150 L330 200 V330 H270Z" fill="#fff" fill-opacity=".25"/>
    <rect x="0" y="330" width="600" height="80" fill="#fff" fill-opacity=".14"/>
    <rect x="0" y="380" width="600" height="90" fill="#fff" fill-opacity=".1"/>`,
  "zero-hour-courier": `<circle cx="300" cy="310" r="140" fill="none" stroke="#fff" stroke-opacity=".5" stroke-width="10"/>
    <path d="M300 310 V200 M300 310 L370 350" stroke="#fff" stroke-opacity=".8" stroke-width="10" stroke-linecap="round"/>`,
  "cartographers-daughter": `<path d="M120 420 L200 250 L320 300 L420 180 L480 380" fill="none" stroke="#fff" stroke-opacity=".5" stroke-width="5" stroke-dasharray="14 10"/>
    <circle cx="420" cy="180" r="14" fill="none" stroke="#fff" stroke-opacity=".8" stroke-width="5"/>`,
  "night-shift-mabels": `<rect x="170" y="190" width="260" height="200" rx="16" fill="#fff" fill-opacity=".14"/>
    <circle cx="300" cy="290" r="62" fill="none" stroke="#fff" stroke-opacity=".6" stroke-width="8"/>
    <path d="M300 255 V290 L325 305" stroke="#fff" stroke-opacity=".8" stroke-width="7" stroke-linecap="round"/>`,
  "quiet-ration": `${Array.from({ length: 7 }, (_, i) => `<rect x="${130 + i * 50}" y="210" width="30" height="${60 + ((i * 37) % 120)}" fill="#fff" fill-opacity=".2"/>`).join("")}`,
  "ghost-tax": `<path d="M240 400 V260 A60 60 0 0 1 360 260 V400 L340 380 L320 400 L300 380 L280 400 L260 380 Z" fill="#fff" fill-opacity=".25"/>
    <circle cx="280" cy="270" r="8" fill="#fff" fill-opacity=".8"/><circle cx="320" cy="270" r="8" fill="#fff" fill-opacity=".8"/>`,
};

const escape = (text: string) => text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/'/g, "&apos;");

/** Greedy word wrap to about `max` characters per line. */
function wrap(text: string, max: number) {
  const lines: string[] = [];
  for (const word of text.split(" ")) {
    const last = lines[lines.length - 1];
    if (last && `${last} ${word}`.length <= max) lines[lines.length - 1] = `${last} ${word}`;
    else lines.push(word);
  }
  return lines;
}

function darken(hex: string, amount: number) {
  const n = Number.parseInt(hex.slice(1), 16);
  const channel = (shift: number) => Math.round(((n >> shift) & 255) * (1 - amount));
  return `rgb(${channel(16)},${channel(8)},${channel(0)})`;
}

function coverSvg(series: SeriesDef) {
  const color = series.themeColor ?? "#6d28d9";
  const lines = wrap(series.title.toUpperCase(), 13);
  // Bold serif capitals are roughly 0.75em wide: keep the longest line within 500px.
  const longest = Math.max(...lines.map((line) => line.length));
  const size = Math.min(60, Math.floor(500 / (longest * 0.75)));
  const startY = 640 - (lines.length - 1) * (size + 8);
  const title = lines
    .map((line, i) => `<text x="300" y="${startY + i * (size + 8)}" text-anchor="middle" font-family="Georgia, 'Times New Roman', serif" font-weight="700" font-size="${size}" letter-spacing="2" fill="#fff">${escape(line)}</text>`)
    .join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="0.4" y2="1">
      <stop offset="0" stop-color="${color}"/>
      <stop offset="1" stop-color="${darken(color, 0.78)}"/>
    </linearGradient>
    <linearGradient id="s" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0.45" stop-color="#000" stop-opacity="0"/>
      <stop offset="1" stop-color="#000" stop-opacity=".55"/>
    </linearGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#g)"/>
  ${MOTIFS[series.key] ?? ""}
  <rect width="${W}" height="${H}" fill="url(#s)"/>
  ${title}
  <text x="300" y="${startY + lines.length * (size + 8) + 30}" text-anchor="middle" font-family="Georgia, serif" font-style="italic" font-size="26" fill="#fff" fill-opacity=".85">${escape(series.tags[0] ?? series.genre)}</text>
  <text x="300" y="860" text-anchor="middle" font-family="Arial, sans-serif" font-size="16" letter-spacing="6" fill="#fff" fill-opacity=".6">TEST SERIES</text>
</svg>`;
}

async function main() {
  const dir = join(process.cwd(), "public", "test-covers");
  mkdirSync(dir, { recursive: true });
  for (const series of SERIES) {
    if (!series.cover) continue;
    const file = join(process.cwd(), "public", series.cover);
    await sharp(Buffer.from(coverSvg(series))).webp({ quality: 78 }).toFile(file);
    console.log(`${series.cover}  ${Math.round(statSync(file).size / 1024)} KB`);
  }
}

void main();
