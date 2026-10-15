import type { Metadata } from "next";
import { notFound } from "next/navigation";
import ErrorPage from "@/components/errors/ErrorPage";
import { ERROR_COPY, isErrorCode } from "@/lib/error-copy";

/*
 * The themed status pages at /status/{401,403,404,429,500,503}: previews of
 * each, and the real destination for a few (the page guards send people who
 * are signed in but lack access to /status/403). Never indexed.
 */
export function generateMetadata({ params }: { params: { code: string } }): Metadata {
  const code = Number(params.code);
  return {
    title: isErrorCode(code) ? ERROR_COPY[code].title : "Not found",
    robots: { index: false, follow: false },
  };
}

export default function StatusPage({ params }: { params: { code: string } }) {
  const code = Number(params.code);
  if (!isErrorCode(code)) notFound();
  return <ErrorPage code={code} />;
}
