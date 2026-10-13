/*
 * One-time (Sweep 13): make the 480px small copy for every series and episode
 * cover uploaded before small copies existed (lib/cover-thumbs.ts). Writes
 * image files only; the database is read, never changed. Safe to re-run:
 * existing small copies are skipped.
 *
 * Needs Vercel Blob credentials (BLOB_READ_WRITE_TOKEN, or BLOB_STORE_ID plus
 * a fresh VERCEL_OIDC_TOKEN from `vercel env pull`):
 *
 *   node --env-file=.env --import ./tests/setup/register.mjs scripts/backfill-cover-thumbs.ts [--apply]
 *
 * Without --apply it only lists what it would make.
 */
import { coverThumbUrl } from "@/lib/cover-thumbs";
import { prisma } from "@/lib/prisma";
import { isOwnedImageUrl, storeCoverThumb } from "@/lib/uploads/image-storage";
import { makeCoverThumb } from "@/lib/uploads/process-image";

const apply = process.argv.includes("--apply");

async function main() {
  const [series, episodes] = await Promise.all([
    prisma.series.findMany({ where: { coverImage: { not: null } }, select: { coverImage: true } }),
    prisma.episode.findMany({ where: { coverImage: { not: null } }, select: { coverImage: true } }),
  ]);
  const covers = [...new Set([...series, ...episodes].map((row) => row.coverImage!))].filter(
    (url) => isOwnedImageUrl(url) && coverThumbUrl(url),
  );
  console.log(`${covers.length} uploaded covers (${apply ? "applying" : "dry run"}).`);

  let made = 0;
  for (const cover of covers) {
    const thumb = coverThumbUrl(cover)!;
    if ((await fetch(thumb, { method: "HEAD" })).ok) continue;
    if (!apply) {
      console.log(`would make ${thumb}`);
      continue;
    }
    const response = await fetch(cover);
    if (!response.ok) {
      console.warn(`skipped (cover unavailable): ${cover}`);
      continue;
    }
    await storeCoverThumb(cover, await makeCoverThumb(Buffer.from(await response.arrayBuffer())), true);
    made++;
  }
  if (apply) console.log(`${made} small copies made.`);
}

main().finally(() => prisma.$disconnect());
