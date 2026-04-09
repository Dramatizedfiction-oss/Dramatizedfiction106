"use client";

type Props = {
  progress: number; // 0 to 1
};

export default function BookshelfMeter({ progress }: Props) {
  const clamped = Math.max(0, Math.min(progress, 1));
  const percent = Math.round(clamped * 100);

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="oak-bookshelf-frame">
        <div className="oak-bookshelf-inner">
          <div
            className="oak-liquid"
            style={{ height: `${percent}%` }}
          >
            <div className="oak-liquid-sheen" />
          </div>
        </div>
      </div>

      <p className="text-slate-300 text-sm">
        Shelf fill: <span className="font-semibold">{percent}%</span>
      </p>

      {percent >= 100 && (
        <p className="text-lime-400 font-semibold text-lg animate-pulse">
          BURP! The shelf is full. Time to file the LLC.
        </p>
      )}
    </div>
  );
}
