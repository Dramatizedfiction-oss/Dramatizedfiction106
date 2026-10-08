// Full-screen writing space (editor, preview, publish). The global sidebar is
// hidden for these paths by AppShell; each page renders its own top bar.
export default function FocusLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen bg-[var(--page-bg)]">{children}</div>;
}
