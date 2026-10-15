"use client";

import ErrorScene, { errorActionClass } from "@/components/errors/ErrorScene";
import { ERROR_COPY, type ErrorCode } from "@/lib/error-copy";

/*
 * An error page for one code, with its copy from lib/error-copy.ts. "Try
 * again" calls `onRetry` (Next's reset() in error boundaries) or reloads the
 * page. Links are plain <a>: a full load is the safest way out of an error.
 */
export default function ErrorPage({
  code,
  onRetry,
  fullScreen = false,
}: {
  code: ErrorCode;
  onRetry?: () => void;
  fullScreen?: boolean;
}) {
  const copy = ERROR_COPY[code];
  const action =
    copy.action.kind === "link" ? (
      <a href={copy.action.href} className={errorActionClass}>
        {copy.action.label}
      </a>
    ) : (
      <button type="button" onClick={() => (onRetry ? onRetry() : window.location.reload())} className={errorActionClass}>
        {copy.action.label}
      </button>
    );

  return (
    <ErrorScene eyebrow={`Error ${code}`} title={copy.title} line={copy.line} action={action} fullScreen={fullScreen}>
      {code !== 404 && copy.action.kind !== "link" ? (
        <a href="/" className="underline decoration-1 underline-offset-4 hover:text-white">
          Or go home
        </a>
      ) : null}
    </ErrorScene>
  );
}
