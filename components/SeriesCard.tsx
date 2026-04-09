import Link from "next/link";

export default function SeriesCard({ series }) {
  return (
    <Link
      href={`/series/${series.id}`}
      className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden hover:border-slate-600 transition"
    >
      <div className="aspect-[3/4] bg-slate-800 flex items-center justify-center text-slate-500">
        {series.coverImage ? (
          <img
            src={series.coverImage}
            alt={series.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <span>No Cover</span>
        )}
      </div>

      <div className="p-4 space-y-1">
        <h2 className="text-lg font-semibold">{series.title}</h2>
        <p className="text-sm text-slate-400 line-clamp-2">
          {series.description}
        </p>
      </div>
    </Link>
  );
}
