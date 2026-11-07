import { auditPage, type Finding } from "./checks";
import { loadBrowser } from "./run";

/*
 * Check one page quickly, signed out, with the phone checker's browser
 * settings (Sweep 4). Makes no accounts and touches no data.
 *
 *   node --import ./tests/setup/register.mjs tests/phone/probe.ts /explore 320 568 wide,hscroll
 *
 * Arguments: path, width, height, finding kinds to print (default: all).
 */

const [path = "/", width = "390", height = "844", kinds] = process.argv.slice(2);
const base = process.env.DF_TEST_BASE_URL ?? "http://localhost:3000";
const browser = await loadBrowser();
if (!browser) {
  console.error("Needs playwright-core and Edge or Chrome: npm install --no-save playwright-core@1.48.2");
  process.exit(1);
}
const context = await browser.newContext({
  viewport: { width: Number(width), height: Number(height) },
  isMobile: Number(width) < 1000,
  hasTouch: true,
  deviceScaleFactor: 1,
  reducedMotion: "reduce",
});
// Optional: DF_PROBE_COOKIE="name=value" to look at a page signed in (a development session).
const cookie = process.env.DF_PROBE_COOKIE;
if (cookie) {
  const [name, value] = cookie.split("=");
  await context.addCookies([
    { name, value, domain: new URL(base).hostname, path: "/", httpOnly: true, secure: name.startsWith("__Secure-"), sameSite: "Lax" },
  ]);
}
// Optional: DF_PROBE_TEXT=200 for the largest system text size (root font size in percent).
const textScale = Number(process.env.DF_PROBE_TEXT || 0);
if (textScale) {
  await context.addInitScript((percent: number) => {
    document.addEventListener("DOMContentLoaded", () => {
      const style = document.createElement("style");
      style.textContent = `html { font-size: ${percent}% !important; }`;
      document.head.appendChild(style);
    });
  }, textScale);
}
const page = await context.newPage();
await page.goto(base + path, { waitUntil: "load" });
await page.waitForTimeout(400);
const findings: Finding[] = await page.evaluate(auditPage);
const wanted = kinds ? kinds.split(",") : null;
for (const finding of findings.filter((item) => !wanted || wanted.includes(item.kind))) {
  console.log(`${finding.kind}: ${finding.target} ${finding.detail}`);
}
const [coarse, rootSize] = await page.evaluate(() => [
  window.matchMedia("(pointer: coarse)").matches,
  getComputedStyle(document.documentElement).fontSize,
]);
console.log(`${findings.length} findings at ${width}×${height} on ${new URL(page.url()).pathname} (touch pointer: ${coarse}, root text ${rootSize})`);
await browser.close();
