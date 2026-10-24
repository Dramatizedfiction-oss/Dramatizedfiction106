/**
 * True for the errors Next.js throws on purpose: "this page is dynamic" (seen
 * while building), redirect() and notFound(). A catch block must re-throw
 * them instead of treating them as failures, or Next can't do its job and the
 * logs fill with false errors.
 */
export function isNextSignal(error: unknown): boolean {
  const digest = (error as { digest?: unknown } | null)?.digest;
  return typeof digest === "string" && (digest === "DYNAMIC_SERVER_USAGE" || digest === "NEXT_NOT_FOUND" || digest.startsWith("NEXT_REDIRECT"));
}
