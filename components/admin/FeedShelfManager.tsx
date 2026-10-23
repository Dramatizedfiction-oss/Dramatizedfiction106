"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import ItemList from "@/components/author-profile/editor/ItemList";
import { Badge, Notice, Panel } from "@/components/admin/ui";
import { MAX_SHELF_ITEMS, MAX_SHELF_WEIGHT, MAX_STAFF_PICKS } from "@/lib/feed/config";
import { FILTERABLE_RULES, MAX_FILTER_TAGS, SHELF_NAME_MAX } from "@/lib/feed/shelf-rules";
import { GENRES } from "@/lib/genres";
import { SERIES_TAGS } from "@/lib/series-tags";

/*
 * Administration > Feed: the shelf manager (Sweep C). Rename, weight, size,
 * on/off and season per shelf; reorder; add tag shelves; edit Staff Picks.
 * Every change goes to /api/admin/feed/* (Board/CEO, audited) and refreshes.
 */

export type ManagedShelf = {
  id: string;
  key: string;
  name: string;
  tier: string;
  rule: string;
  genres: string[];
  tags: string[];
  weight: number;
  minItems: number;
  maxItems: number;
  enabled: boolean;
  builtIn: boolean;
  months: number[];
  picks: { id: string; title: string; authorName: string | null; published: boolean }[];
};
type Row = ManagedShelf & { key: string; shelfKey: string };

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const RULE_LABELS: Record<string, string> = {
  NEW_WRITERS: "One card per new writer, least shown first",
  CONTINUE_READING: "Personal: series the reader is in the middle of",
  BECAUSE_YOU_LIKED: "Personal: like a series they rated 4+ or bookmarked",
  TRENDING: "Trending score (on Explore the top row is Trending, so it's skipped there)",
  JUST_UPDATED: "Newest episode first",
  TRENDING_TOP_GENRE: "Personal: Trending in the reader's top genre",
  TOP_RATED: "Adjusted average rating, 3+ ratings",
  COMPLETED: "Complete series, by Trending",
  TRENDING_GENRE: "Genre/tag filter, by Trending",
  HIDDEN_GEMS: "4.3+ average, few reads",
  QUICK_READS: "10 minutes or less in total",
  WEEKEND_BINGES: "Complete, 8+ episodes",
  FRESH_FINISHES: "Completed in the last 30 days",
  FOLLOWED_WRITERS: "Personal: new episodes from writers they follow",
  STAFF_PICKS: "Hand-picked by Board/CEO",
  TAGS: "Tag filter, by Trending",
};

export default function FeedShelfManager({ shelves }: { shelves: ManagedShelf[] }) {
  const router = useRouter();
  const toRows = (list: ManagedShelf[]): Row[] => list.map((shelf) => ({ ...shelf, shelfKey: shelf.key, key: shelf.id }));
  const [rows, setRows] = useState<Row[]>(() => toRows(shelves));
  const [openKey, setOpenKey] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ tone: "error" | "success"; text: string } | null>(null);

  useEffect(() => setRows(toRows(shelves)), [shelves]);
  const orderChanged = rows.map((row) => row.id).join() !== shelves.map((shelf) => shelf.id).join();

  async function request(url: string, init: RequestInit, success: string) {
    setBusy(true);
    setMessage(null);
    const response = await fetch(url, { credentials: "include", headers: { "Content-Type": "application/json" }, ...init }).catch(() => null);
    const payload = (await response?.json().catch(() => null)) as { error?: string } | null;
    setBusy(false);
    if (!response?.ok) {
      setMessage({ tone: "error", text: payload?.error || "That didn't work. Please try again." });
      return false;
    }
    setMessage({ tone: "success", text: success });
    router.refresh();
    return true;
  }

  async function remove(row: Row) {
    if (row.builtIn) {
      setMessage({ tone: "error", text: `"${row.name}" is built in: switch it off instead.` });
      return;
    }
    if (!window.confirm(`Delete the shelf "${row.name}"?`)) return;
    await request(`/api/admin/feed/shelves/${encodeURIComponent(row.id)}`, { method: "DELETE" }, `Deleted "${row.name}".`);
  }

  return (
    <div className="space-y-6">
      <Panel
        title={`Shelves (${shelves.length})`}
        description="Weight is how often a shelf is picked for a reader's feed (relative to the others). Shelves with fewer series than their minimum hide themselves. Tap a shelf to edit it."
        action={
          orderChanged ? (
            <button
              type="button"
              disabled={busy}
              onClick={() => void request("/api/admin/feed/shelves", { method: "PUT", body: JSON.stringify({ ids: rows.map((row) => row.id) }) }, "Order saved.")}
              className="story-button-primary min-h-11 disabled:opacity-50"
            >
              Save order
            </button>
          ) : null
        }
      >
        <ItemList
          items={rows}
          itemName="shelf"
          wrapTitles
          openKey={openKey}
          onOpenKeyChange={setOpenKey}
          onChange={(next) => {
            if (next.length < rows.length) {
              const gone = rows.find((row) => !next.some((other) => other.id === row.id));
              if (gone) void remove(gone);
              return;
            }
            setRows(next);
          }}
          summary={(row) => ({
            title: row.name,
            detail: `${row.enabled ? "On" : "Off"} · weight ${row.weight} · ${row.minItems}-${row.maxItems} series${row.months.length ? ` · ${row.months.map((month) => MONTHS[month - 1]).join(", ")}` : ""}`,
            // Only "Off" gets a badge, so shelf names keep their room on phones.
            badge: row.enabled ? undefined : <Badge>Off</Badge>,
          })}
          renderForm={(row) => <ShelfForm row={row} busy={busy} request={request} />}
        />
        {orderChanged ? <p className="theme-meta mt-3 text-xs">New order not saved yet. The order is used for the admin list and ties; readers&apos; feeds are picked by weight.</p> : null}
      </Panel>

      <AddTagShelf busy={busy} request={request} />

      {message ? <Notice tone={message.tone}>{message.text}</Notice> : null}
    </div>
  );
}

type Send = (url: string, init: RequestInit, success: string) => Promise<boolean>;

function ShelfForm({ row, busy, request }: { row: Row; busy: boolean; request: Send }) {
  const [name, setName] = useState(row.name);
  const [weight, setWeight] = useState(String(row.weight));
  const [minItems, setMinItems] = useState(String(row.minItems));
  const [maxItems, setMaxItems] = useState(String(row.maxItems));
  const [months, setMonths] = useState<number[]>(row.months);
  const [genres, setGenres] = useState<string[]>(row.genres);
  const [tags, setTags] = useState<string[]>(row.tags);
  const filterable = FILTERABLE_RULES.includes(row.rule as never);
  const url = `/api/admin/feed/shelves/${encodeURIComponent(row.id)}`;

  function save() {
    const body: Record<string, unknown> = {
      name,
      weight: Number(weight),
      minItems: Number(minItems),
      maxItems: Number(maxItems),
      months,
    };
    if (filterable) Object.assign(body, { genres, tags });
    void request(url, { method: "PATCH", body: JSON.stringify(body) }, `Saved "${name.trim()}".`);
  }

  return (
    <div className="space-y-4">
      <p className="theme-meta text-sm">
        {row.tier.charAt(0) + row.tier.slice(1).toLowerCase()} shelf · {RULE_LABELS[row.rule] ?? row.rule}
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Name">
          <input value={name} onChange={(event) => setName(event.target.value)} maxLength={SHELF_NAME_MAX} className="ui-input w-full px-3 py-2 text-base sm:text-sm" />
        </Field>
        <Field label={`Weight (0-${MAX_SHELF_WEIGHT})`}>
          <input type="number" inputMode="decimal" min={0} max={MAX_SHELF_WEIGHT} step={0.5} value={weight} onChange={(event) => setWeight(event.target.value)} className="ui-input w-full px-3 py-2 text-base sm:text-sm" />
        </Field>
        <Field label="Minimum series">
          <input type="number" inputMode="numeric" min={1} max={MAX_SHELF_ITEMS} value={minItems} onChange={(event) => setMinItems(event.target.value)} className="ui-input w-full px-3 py-2 text-base sm:text-sm" />
        </Field>
        <Field label="Maximum series">
          <input type="number" inputMode="numeric" min={1} max={MAX_SHELF_ITEMS} value={maxItems} onChange={(event) => setMaxItems(event.target.value)} className="ui-input w-full px-3 py-2 text-base sm:text-sm" />
        </Field>
      </div>
      <ChipGroup label="Season (leave empty for all year)" options={MONTHS.map((label, index) => ({ value: String(index + 1), label }))} value={months.map(String)} onChange={(next) => setMonths(next.map(Number))} />
      {filterable ? (
        <>
          <ChipGroup label="Genres (any)" options={GENRES.map((genre) => ({ value: genre, label: genre }))} value={genres} onChange={setGenres} />
          <ChipGroup label={`Tags (any, up to ${MAX_FILTER_TAGS})`} options={SERIES_TAGS.map((tag) => ({ value: tag, label: tag }))} value={tags} onChange={setTags} />
        </>
      ) : null}
      {row.rule === "STAFF_PICKS" ? <StaffPicks row={row} busy={busy} request={request} /> : null}
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" disabled={busy} onClick={save} className="story-button-primary min-h-11 disabled:opacity-50">
          Save shelf
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => void request(url, { method: "PATCH", body: JSON.stringify({ enabled: !row.enabled }) }, row.enabled ? `"${row.name}" is off.` : `"${row.name}" is on.`)}
          className="story-button-secondary min-h-11 disabled:opacity-50"
        >
          {row.enabled ? "Switch off" : "Switch on"}
        </button>
      </div>
    </div>
  );
}

function StaffPicks({ row, busy, request }: { row: Row; busy: boolean; request: Send }) {
  const [picks, setPicks] = useState(row.picks.map((pick) => ({ ...pick, key: pick.id })));
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<{ id: string; title: string; authorName: string | null }[]>([]);
  const [openKey, setOpenKey] = useState<string | null>(null);
  const changed = picks.map((pick) => pick.id).join() !== row.picks.map((pick) => pick.id).join();

  async function search() {
    const response = await fetch(`/api/admin/feed/search?q=${encodeURIComponent(query)}`, { credentials: "include" }).catch(() => null);
    const data = (await response?.json().catch(() => null)) as { series?: { id: string; title: string; authorName: string | null }[] } | null;
    setResults(data?.series ?? []);
  }

  return (
    <div className="space-y-3 rounded-2xl border border-[var(--border-color)] p-4">
      <p className="theme-heading text-sm font-semibold">Picks ({picks.length}/{MAX_STAFF_PICKS})</p>
      {picks.length ? (
        <ItemList
          items={picks}
          itemName="pick"
          wrapTitles
          openKey={openKey}
          onOpenKeyChange={setOpenKey}
          onChange={setPicks}
          summary={(pick) => ({ title: pick.title, detail: `${pick.authorName ?? "Unknown writer"}${pick.published ? "" : " · not published"}` })}
          renderForm={() => <p className="theme-meta text-sm">Use the arrows to reorder, ✕ to remove.</p>}
        />
      ) : (
        <p className="theme-meta text-sm">No picks yet. The shelf stays hidden until it has its minimum.</p>
      )}
      <form
        className="flex gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          void search();
        }}
      >
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Find a published series or writer"
          aria-label="Find a published series or writer"
          className="ui-input min-w-0 flex-1 px-3 py-2 text-base sm:text-sm"
        />
        <button type="submit" className="story-button-secondary min-h-11">
          Search
        </button>
      </form>
      {results.length ? (
        <ul className="space-y-1">
          {results.map((result) => {
            const taken = picks.some((pick) => pick.id === result.id);
            return (
              <li key={result.id} className="flex items-center justify-between gap-2">
                <span className="min-w-0 truncate text-sm text-[var(--text-primary)]">
                  {result.title} <span className="theme-meta">· {result.authorName ?? "Unknown"}</span>
                </span>
                <button
                  type="button"
                  disabled={taken || picks.length >= MAX_STAFF_PICKS}
                  onClick={() => setPicks((current) => [...current, { ...result, published: true, key: result.id }])}
                  className="story-button-secondary min-h-11 shrink-0 disabled:opacity-50"
                >
                  {taken ? "Added" : "Add"}
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
      {changed ? (
        <button
          type="button"
          disabled={busy}
          onClick={() =>
            void request(
              `/api/admin/feed/shelves/${encodeURIComponent(row.id)}/items`,
              { method: "PUT", body: JSON.stringify({ seriesIds: picks.map((pick) => pick.id) }) },
              "Staff Picks saved.",
            )
          }
          className="story-button-primary min-h-11 disabled:opacity-50"
        >
          Save picks
        </button>
      ) : null}
    </div>
  );
}

function AddTagShelf({ busy, request }: { busy: boolean; request: Send }) {
  const [name, setName] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [genres, setGenres] = useState<string[]>([]);
  const [months, setMonths] = useState<number[]>([]);
  const [weight, setWeight] = useState("1");

  return (
    <Panel title="Add a tag shelf" description="Tag shelves show series with any of the chosen tags (from the fixed tag list), optionally only in some genres or months. New shelves are niche (weight 1) unless you change it.">
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Name">
            <input value={name} onChange={(event) => setName(event.target.value)} maxLength={SHELF_NAME_MAX} placeholder="e.g. Heists and Capers" className="ui-input w-full px-3 py-2 text-base sm:text-sm" />
          </Field>
          <Field label={`Weight (0-${MAX_SHELF_WEIGHT})`}>
            <input type="number" inputMode="decimal" min={0} max={MAX_SHELF_WEIGHT} step={0.5} value={weight} onChange={(event) => setWeight(event.target.value)} className="ui-input w-full px-3 py-2 text-base sm:text-sm" />
          </Field>
        </div>
        <ChipGroup label={`Tags (any, up to ${MAX_FILTER_TAGS})`} options={SERIES_TAGS.map((tag) => ({ value: tag, label: tag }))} value={tags} onChange={setTags} />
        <ChipGroup label="Genres (optional)" options={GENRES.map((genre) => ({ value: genre, label: genre }))} value={genres} onChange={setGenres} />
        <ChipGroup label="Season (optional)" options={MONTHS.map((label, index) => ({ value: String(index + 1), label }))} value={months.map(String)} onChange={(next) => setMonths(next.map(Number))} />
        <button
          type="button"
          disabled={busy || name.trim().length < 2 || tags.length === 0}
          onClick={async () => {
            const ok = await request(
              "/api/admin/feed/shelves",
              { method: "POST", body: JSON.stringify({ name, tags, genres, months, weight: Number(weight) }) },
              `Added "${name.trim()}".`,
            );
            if (ok) {
              setName("");
              setTags([]);
              setGenres([]);
              setMonths([]);
              setWeight("1");
            }
          }}
          className="story-button-primary min-h-11 disabled:opacity-50"
        >
          Add shelf
        </button>
      </div>
    </Panel>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block min-w-0">
      <span className="theme-heading mb-1 block text-sm font-semibold">{label}</span>
      {children}
    </label>
  );
}

function ChipGroup({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { value: string; label: string }[];
  value: string[];
  onChange: (next: string[]) => void;
}) {
  return (
    <fieldset>
      <legend className="theme-heading mb-2 text-sm font-semibold">{label}</legend>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => {
          const on = value.includes(option.value);
          return (
            <button
              key={option.value}
              type="button"
              aria-pressed={on}
              onClick={() => onChange(on ? value.filter((item) => item !== option.value) : [...value, option.value])}
              className={`min-h-11 rounded-full border px-3 text-xs capitalize transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] ${
                on
                  ? "border-[var(--accent)] bg-[color-mix(in_srgb,var(--accent)_14%,transparent)] text-[var(--text-primary)]"
                  : "border-[var(--border-color)] text-[var(--text-secondary)] hover:bg-[var(--panel-hover)]"
              }`}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
