/*
 * Every error page's words (Sweep B1), in one place so they can later move to
 * Administration › Content. Short, in the site's voice, one next step each.
 * Client-safe, no imports: error pages must work with the database down.
 */

export type ErrorCode = 401 | 403 | 404 | 429 | 500 | 503;
export const ERROR_CODES: ErrorCode[] = [401, 403, 404, 429, 500, 503];

export type ErrorAction = { kind: "link"; label: string; href: string } | { kind: "retry"; label: string };

export const ERROR_COPY: Record<ErrorCode, { title: string; line: string; action: ErrorAction }> = {
  404: {
    title: "This page wandered off the map.",
    line: "The story you were looking for isn't here. It may have moved, or it was never written.",
    action: { kind: "link", label: "Go home", href: "/" },
  },
  500: {
    title: "The author dropped the manuscript.",
    line: "We're picking up the pages. Give it a moment, then try again.",
    action: { kind: "retry", label: "Try again" },
  },
  403: {
    title: "This chapter is for other eyes.",
    line: "Your account doesn't have access to this page.",
    action: { kind: "link", label: "Go home", href: "/" },
  },
  401: {
    title: "Sign in to turn the page.",
    line: "This part of the story is for members. It only takes a moment.",
    action: { kind: "link", label: "Sign in", href: "/sign-in" },
  },
  429: {
    title: "Slow down. The ink is still drying.",
    line: "That was a lot at once. Wait a moment, then try again.",
    action: { kind: "retry", label: "Try again" },
  },
  503: {
    title: "The writers are on a break.",
    line: "We'll be back soon. Your stories and progress are safe.",
    action: { kind: "retry", label: "Try again" },
  },
};

export function isErrorCode(value: number): value is ErrorCode {
  return (ERROR_CODES as number[]).includes(value);
}
