export default function LiquidWordmark() {
  return (
    <div className="relative flex select-none flex-col items-center justify-center pb-10 pt-14 md:pb-16 md:pt-24">
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background: "radial-gradient(ellipse 60% 40% at 50% 50%, rgba(124,58,237,0.12) 0%, transparent 70%)",
        }}
      />

      <h1
        className="liquid-text font-heading animate-fade-in-up text-center leading-none"
        style={{
          fontSize: "clamp(3rem, 10vw, 9rem)",
          fontWeight: 900,
          letterSpacing: "-0.02em",
        }}
      >
        Dramatized
      </h1>
      <h1
        className="liquid-text font-heading animate-fade-in-up text-center leading-none"
        style={{
          fontSize: "clamp(3rem, 10vw, 9rem)",
          fontWeight: 900,
          letterSpacing: "-0.02em",
          animationDelay: "120ms",
        }}
      >
        Fiction
      </h1>
      <p className="mt-6 text-balance text-center font-mono-df text-xs font-bold uppercase tracking-[0.22em] text-[var(--text-secondary)] sm:text-sm sm:tracking-[0.3em]">
        Stories Performed in Text
      </p>
    </div>
  );
}
