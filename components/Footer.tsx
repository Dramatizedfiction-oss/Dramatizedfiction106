export default function Footer() {
  return (
    <footer className="border-t border-foreground/5 px-6 py-10">
      <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-4 sm:flex-row">
        <p className="font-mono-df text-xs uppercase tracking-widest text-foreground/25">
          Dramatized Fiction
        </p>
        <p className="text-xs text-foreground/30">
          Copyright {new Date().getFullYear()} · Stories performed in text
        </p>
      </div>
    </footer>
  );
}
