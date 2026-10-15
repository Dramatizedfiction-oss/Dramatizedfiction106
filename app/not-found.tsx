import ErrorPage from "@/components/errors/ErrorPage";

// 404: any missing page, series, episode or profile (notFound()). Copy: lib/error-copy.ts.
export default function NotFound() {
  return <ErrorPage code={404} />;
}
