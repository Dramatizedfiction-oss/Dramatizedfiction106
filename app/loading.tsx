import { BrandMarkImage } from "@/components/brand/BrandMark";

// Shown while a page loads: the round mark with a soft pulse (still for
// "reduce motion", from the system or from Settings › Reading & Appearance).
export default function Loading() {
  return (
    <div role="status" aria-label="Loading" className="flex min-h-[60vh] items-center justify-center">
      <BrandMarkImage size={64} className="brand-loading" />
    </div>
  );
}
