export default function CreatorCard({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="rounded-[24px] border border-[var(--border-color)] bg-[var(--bg-secondary)] p-5 transition duration-200 hover:-translate-y-0.5 hover:border-[var(--text-secondary)]">
      <p className="eyebrow">{label}</p>
      <p className="font-heading theme-heading mt-3 text-3xl font-semibold">{value}</p>
      <p className="theme-meta mt-2 text-sm leading-5">{detail}</p>
    </div>
  );
}
