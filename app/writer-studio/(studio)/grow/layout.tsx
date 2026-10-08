import GrowSubNav from "@/components/writer-studio/grow/GrowSubNav";

// Presentation only. Access is enforced by the writer-studio layouts and by
// requireStudioUser() in every GROW page.
export default function GrowLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="space-y-8">
      <GrowSubNav />
      {children}
    </div>
  );
}
