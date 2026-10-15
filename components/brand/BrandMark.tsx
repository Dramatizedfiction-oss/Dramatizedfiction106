/*
 * The logo (Sweep B1): the round book mark (public/brand/mark-*.webp, made by
 * scripts/make-brand-assets.ts, transparent outside the circle so it sits on
 * light and dark) with the site name beside it as real text. The lettering in
 * the original image is unreadable at small sizes, so it is never relied on.
 * A plain <img>: it loads even when the database is down.
 */
export function BrandMarkImage({ size, className = "" }: { size: number; className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={size <= 32 ? "/brand/mark-64.webp" : "/brand/mark-128.webp"}
      srcSet={size <= 32 ? "/brand/mark-64.webp 2x, /brand/mark-128.webp 4x" : "/brand/mark-128.webp 2x, /brand/mark-256.webp 4x"}
      width={size}
      height={size}
      alt=""
      aria-hidden="true"
      decoding="async"
      className={`shrink-0 rounded-full ${className}`}
    />
  );
}

export default function BrandMark({
  size = 32,
  showName = true,
  compact = false,
  className = "",
}: {
  size?: number;
  showName?: boolean;
  /** Phone header: slightly smaller name and gap, so it fits beside the header buttons at 375px. */
  compact?: boolean;
  className?: string;
}) {
  return (
    <span className={`flex min-w-0 items-center ${compact ? "gap-2" : "gap-2.5"} ${className}`}>
      <BrandMarkImage size={size} />
      {showName ? (
        <span
          className={`font-heading truncate whitespace-nowrap font-semibold leading-none tracking-tight text-[var(--text-primary)] ${
            compact ? "text-[15px]" : "text-base"
          }`}
        >
          Dramatized Fiction
        </span>
      ) : null}
    </span>
  );
}
