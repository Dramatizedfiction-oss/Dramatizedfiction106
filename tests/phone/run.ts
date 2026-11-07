import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { prisma } from "@/lib/prisma";
import { auditPage, BLOCKING_KINDS, FINDING_KINDS, type Finding, type FindingKind } from "./checks";
import { createContext, removeFixtures, type Fixtures } from "./fixtures";
import { buildVisits, smokeVisits, type Role, type Visit } from "./routes";

/*
 * Phone layout checker (Sweep 4). Run through `npm run test:phone`
 * (scripts/test-phone.mjs), which refuses unless .env.local names a
 * development database. Needs a running server (npm run dev, or
 * npm run build && npm run start, which is much lighter) and
 * playwright-core, which drives the Edge (or Chrome) already installed:
 *   npm install --no-save playwright-core@1.48.2
 *
 * Options: --sizes=all|smoke|320x568,390x844  --key (only the key screens)
 *          --screens (save WebP screenshots, both themes)  --text=200 (large text)
 *          --only=<text> (screens whose name contains it)  --label=<name>
 */

export const SIZES = [
  { name: "320x568", width: 320, height: 568 },
  { name: "360x640", width: 360, height: 640 },
  { name: "375x812", width: 375, height: 812 },
  { name: "390x844", width: 390, height: 844 },
  { name: "412x915", width: 412, height: 915 },
  { name: "430x932", width: 430, height: 932 },
  { name: "768x1024", width: 768, height: 1024 },
  { name: "812x375", width: 812, height: 375 },
] as const;
export const SMOKE_SIZES = ["320x568", "390x844", "812x375"];

export type Result = { screen: string; path: string; role: Role; size: string; finalPath: string; findings: Finding[]; error?: string };

export async function loadBrowser() {
  // Not a dependency (installed with --no-save so neither lockfile changes),
  // so it's loaded by a name TypeScript doesn't resolve.
  const moduleName = "playwright-core";
  let playwright: any;
  try {
    playwright = await import(moduleName);
  } catch {
    return null;
  }
  for (const channel of ["msedge", "chrome"]) {
    try {
      return await playwright.chromium.launch({ channel, headless: true });
    } catch {
      // try the next installed browser
    }
  }
  return null;
}

// playwright-core's Browser (typed loosely; see loadBrowser).
type Browser = any;

function accountFor(fx: Fixtures, role: Role) {
  return role === "anon" ? null : { reader: fx.reader, empty: fx.emptyReader, writer: fx.writer, board: fx.board, ceo: fx.ceo }[role];
}

export async function runAudit(options: {
  base: string;
  browser: Browser;
  fx: Fixtures;
  visits: Visit[];
  sizes: string[];
  screens?: { dir: string; themes: ("dark" | "light")[] };
  /** Root text size in percent (200 ≈ the largest system text setting). */
  textScale?: number;
  log?: (line: string) => void;
}) {
  const { base, browser, fx, visits, sizes, screens, textScale, log = () => undefined } = options;
  const results: Result[] = [];
  const host = new URL(base).hostname;
  const sharp = screens ? (await import("sharp")).default : null;

  for (const size of SIZES.filter((s) => sizes.includes(s.name))) {
    for (const theme of screens ? screens.themes : (["dark"] as const)) {
      const auditing = theme === "dark"; // layout is the same in both themes; light is screenshots only
      for (const role of Array.from(new Set(visits.map((visit) => visit.role)))) {
        const context = await browser.newContext({
          viewport: { width: size.width, height: size.height },
          isMobile: size.width < 1000,
          hasTouch: true,
          deviceScaleFactor: 1,
          reducedMotion: "reduce",
        });
        await context.addInitScript((value: string) => {
          try {
            window.localStorage.setItem("df-theme", value);
          } catch {
            // ignore
          }
        }, theme);
        if (textScale) {
          await context.addInitScript((percent: number) => {
            document.addEventListener("DOMContentLoaded", () => {
              const style = document.createElement("style");
              style.textContent = `html { font-size: ${percent}% !important; }`;
              document.head.appendChild(style);
            });
          }, textScale);
        }
        const account = accountFor(fx, role);
        if (account) {
          const [name, value] = account.cookie.split("=");
          await context.addCookies([{ name, value, domain: host, path: "/", httpOnly: true, secure: name.startsWith("__Secure-"), sameSite: "Lax" }]);
        }
        const page = await context.newPage();
        for (const visit of visits.filter((item) => item.role === role)) {
          const result: Result = { screen: visit.screen, path: visit.path, role, size: size.name, finalPath: visit.path, findings: [] };
          try {
            // Not "networkidle": some pages keep a request open, which made every visit wait out the timeout.
            await page.goto(base + visit.path, { waitUntil: "load", timeout: 45_000 });
            await page.waitForTimeout(400);
            if (visit.open) {
              const control = page.locator(visit.open.selector).first();
              // Some layers exist only at phone widths (the menu button is gone from md up).
              if (!(await control.isVisible().catch(() => false))) continue;
              await control.click({ timeout: 5_000 });
              await page.waitForTimeout(450);
            }
            result.finalPath = new URL(page.url()).pathname + new URL(page.url()).search;
            if (auditing) result.findings = await page.evaluate(auditPage);
            if (screens && sharp) {
              const dir = join(screens.dir, theme, size.name);
              mkdirSync(dir, { recursive: true });
              const shot = await page.screenshot({ type: "png" });
              const slug = `${role}-${visit.screen}`.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
              await sharp(shot).webp({ quality: 38 }).toFile(join(dir, `${slug}.webp`));
            }
          } catch (error) {
            result.error = error instanceof Error ? error.message.split("\n")[0] : String(error);
          }
          if (auditing) {
            results.push(result);
            const counts = countKinds(result.findings);
            log(`${size.name} ${role.padEnd(6)} ${visit.screen.padEnd(32)} ${result.error ? `ERROR ${result.error}` : formatCounts(counts)}`);
          }
        }
        await context.close();
      }
    }
  }
  return results;
}

export function countKinds(findings: Finding[]) {
  const counts = Object.fromEntries(FINDING_KINDS.map((kind) => [kind, 0])) as Record<FindingKind, number>;
  for (const finding of findings) counts[finding.kind] += 1;
  return counts;
}

function formatCounts(counts: Record<FindingKind, number>) {
  return FINDING_KINDS.filter((kind) => counts[kind]).map((kind) => `${kind}:${counts[kind]}`).join(" ") || "ok";
}

export function blocking(results: Result[]) {
  return results.flatMap((result) =>
    result.findings.filter((finding) => BLOCKING_KINDS.includes(finding.kind)).map((finding) => ({ ...finding, screen: result.screen, size: result.size })),
  );
}

/** Markdown summary: totals per size, then each screen's distinct findings (merged across sizes). */
export function summarize(results: Result[]) {
  const lines: string[] = [];
  const sizes = Array.from(new Set(results.map((result) => result.size)));
  lines.push(`| Size | ${FINDING_KINDS.join(" | ")} | errors |`, `|---|${FINDING_KINDS.map(() => "---:").join("|")}|---:|`);
  for (const size of sizes) {
    const subset = results.filter((result) => result.size === size);
    const counts = countKinds(subset.flatMap((result) => result.findings));
    lines.push(`| ${size} | ${FINDING_KINDS.map((kind) => counts[kind]).join(" | ")} | ${subset.filter((r) => r.error).length} |`);
  }
  const total = countKinds(results.flatMap((result) => result.findings));
  lines.push(`| **all** | ${FINDING_KINDS.map((kind) => `**${total[kind]}**`).join(" | ")} | **${results.filter((r) => r.error).length}** |`, "");

  const screens = Array.from(new Set(results.map((result) => `${result.role}|${result.screen}`)));
  for (const key of screens) {
    const [role, screen] = key.split("|");
    const subset = results.filter((result) => result.role === role && result.screen === screen);
    const merged = new Map<string, { finding: Finding; sizes: string[] }>();
    for (const result of subset) {
      for (const finding of result.findings) {
        const id = `${finding.kind}|${finding.target}`;
        const entry = merged.get(id) ?? { finding, sizes: [] };
        entry.sizes.push(result.size);
        merged.set(id, entry);
      }
    }
    const errors = subset.filter((result) => result.error);
    if (!merged.size && !errors.length) continue;
    lines.push(`### ${screen} (${role}) \`${subset[0].path}\``, "");
    for (const error of errors) lines.push(`- **error** at ${error.size}: ${error.error}`);
    const sorted = Array.from(merged.values()).sort((a, b) => FINDING_KINDS.indexOf(a.finding.kind) - FINDING_KINDS.indexOf(b.finding.kind));
    for (const { finding, sizes: where } of sorted.slice(0, 40)) {
      const at = where.length === subset.length ? "all sizes" : where.join(", ");
      lines.push(`- ${finding.kind}: \`${finding.target.replace(/`/g, "'")}\` ${finding.detail} (${at})`);
    }
    if (sorted.length > 40) lines.push(`- … ${sorted.length - 40} more`);
    lines.push("");
  }
  return lines.join("\n");
}

async function main() {
  const args = new Map(process.argv.slice(2).map((arg) => {
    const [key, value] = arg.replace(/^--/, "").split("=");
    return [key, value ?? "1"] as const;
  }));
  const base = process.env.DF_TEST_BASE_URL ?? "http://localhost:3000";
  const label = args.get("label") ?? "latest";
  const out = join(process.cwd(), "docs", "phone-audit");

  const browser = await loadBrowser();
  if (!browser) {
    console.error("[phone] Needs playwright-core and an installed Edge or Chrome: npm install --no-save playwright-core@1.48.2");
    process.exit(1);
  }
  try {
    await fetch(`${base}/api/auth/me`);
  } catch {
    console.error(`[phone] No server at ${base}. Start one (npm run dev, or npm run build && npm run start).`);
    process.exit(1);
  }

  const context = createContext(base);
  let fx: Fixtures | null = null;
  let exitCode = 0;
  try {
    await removeFixtures(); // leftovers from an interrupted run
    fx = await context.create();
    let visits = await buildVisits(fx);
    if (args.get("sizes") === "smoke" || args.has("key")) visits = smokeVisits(visits);
    const only = args.get("only");
    if (only) visits = visits.filter((visit) => visit.screen.toLowerCase().includes(only.toLowerCase()));
    const sizeArg = args.get("sizes");
    const sizes =
      sizeArg === "smoke" ? SMOKE_SIZES : sizeArg && sizeArg !== "all" ? sizeArg.split(",") : SIZES.map((size) => size.name);
    const screens = args.has("screens") ? { dir: join(out, "shots"), themes: ["dark", "light"] as ("dark" | "light")[] } : undefined;

    console.log(`[phone] ${visits.length} screens × ${sizes.length} sizes${screens ? ", with screenshots" : ""}`);
    const textScale = args.has("text") ? Number(args.get("text")) : undefined;
    const results = await runAudit({ base, browser, fx, visits, sizes, screens, textScale, log: (line) => console.log(line) });

    mkdirSync(out, { recursive: true });
    writeFileSync(join(out, `results-${label}.json`), JSON.stringify(results, null, 1));
    writeFileSync(join(out, `results-${label}.md`), `# Phone checker results: ${label}\n\n${summarize(results)}\n`);
    const blockers = blocking(results);
    console.log(`[phone] wrote docs/phone-audit/results-${label}.{json,md}; ${blockers.length} blocking findings`);
    if (blockers.length) exitCode = 2;
  } finally {
    await browser.close();
    const left = await removeFixtures();
    console.log(`[phone] fixtures removed (${left} left)`);
    await prisma.$disconnect();
  }
  process.exit(exitCode);
}

if (process.argv[1]?.replace(/\\/g, "/").endsWith("tests/phone/run.ts")) {
  void main();
}
