// Lets `node --test` import the app's TypeScript modules: Node 24 strips the
// types itself; this hook resolves the "@/..." alias and extensionless paths.
import { register } from "node:module";

register("./resolve-hook.mjs", import.meta.url);
