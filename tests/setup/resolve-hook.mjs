import { existsSync, statSync } from "node:fs";
import { dirname, join, resolve as resolvePath } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = resolvePath(dirname(fileURLToPath(import.meta.url)), "..", "..");
const EXTENSIONS = [".ts", ".tsx", ".mjs", ".js"];

function findFile(base) {
  if (existsSync(base) && statSync(base).isFile()) return base;
  for (const extension of EXTENSIONS) {
    if (existsSync(base + extension)) return base + extension;
  }
  for (const extension of EXTENSIONS) {
    const index = join(base, `index${extension}`);
    if (existsSync(index)) return index;
  }
  return null;
}

export async function resolve(specifier, context, nextResolve) {
  if (specifier.startsWith("@/")) {
    const file = findFile(join(root, specifier.slice(2)));
    if (file) return nextResolve(pathToFileURL(file).href, context);
  } else if ((specifier.startsWith("./") || specifier.startsWith("../")) && context.parentURL?.startsWith("file:")) {
    const parent = fileURLToPath(context.parentURL);
    // Only the app's own files; packages resolve normally.
    if (parent.startsWith(root) && !parent.includes("node_modules")) {
      const file = findFile(resolvePath(dirname(parent), specifier));
      if (file) return nextResolve(pathToFileURL(file).href, context);
    }
  }
  return nextResolve(specifier, context);
}
