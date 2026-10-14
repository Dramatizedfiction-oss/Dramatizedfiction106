// Types for scripts/dev-db-target.mjs (used by the TypeScript seed scripts).
export const root: string;
export function readEnvFile(name: string): Record<string, string> | null;
export function describeDatabase(url: string): { host: string; database: string } | null;
export function sameDatabase(a: { host: string; database: string }, b: { host: string; database: string }): boolean;
export class TargetError extends Error {}
export function resolveDevelopmentTarget(): {
  devUrl: string;
  dev: { host: string; database: string };
  production: { host: string; database: string } | null;
  local: Record<string, string>;
};
