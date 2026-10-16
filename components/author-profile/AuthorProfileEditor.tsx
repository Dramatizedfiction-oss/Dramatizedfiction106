"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useMemo, useState, type ReactNode } from "react";
import BookCoverField from "@/components/author-profile/editor/BookCoverField";
import ItemList from "@/components/author-profile/editor/ItemList";
import LinkIcon from "@/components/author-profile/LinkIcon";
import { OPEN_EDITOR_EVENT, type EditorTab } from "@/components/author-profile/OwnerPrompt";
import WritingSections from "@/components/author-profile/WritingSections";
import { FollowerListSwitch, PenIcon, VisibilitySwitch } from "@/components/profile/ProfileEditor";
import { useAuthSession } from "@/components/providers/AuthSessionProvider";
import ImageUploadField from "@/components/uploads/ImageUploadField";
import UserAvatar from "@/components/UserAvatar";
import Sheet from "@/components/writer-studio/ui/Sheet";
import {
  AUTHOR_PROFILE_LIMITS as LIMITS,
  STARTER_PROMPTS,
  linkDomain,
  linkIcon,
  normalizeAuthorProfile,
  type AboutCardData,
  type AuthorProfileInput,
  type LibraryCardData,
  type LinkData,
  type OnSiteData,
  type SectionKey,
  type SectionSwitches,
  type SeriesCardInfo,
} from "@/lib/author-profile-rules";
import { normalizeProfileLink } from "@/lib/profile";

/*
 * The writer's profile editor (Sweep 14), opened by the owner's pen on their
 * author page or by an empty section's prompt. Full screen on phones, a side
 * panel on desktop. Tabs match the page: Basics (avatar, banner, bio, On site
 * and reading-profile switches), Library, About me, Links, plus a visitor
 * Preview built from the unsaved values with the page's own components.
 *
 * "Save" sends, only for what changed:
 *   bio, section switches, Library, About, Links -> PUT  /api/me/author-profile
 *   reading-profile visibility                   -> PATCH /api/me/profile
 *   banner                                       -> PATCH /api/me/profile-images
 * To add a section later: add its values to EditorValues and toInput(), a tab
 * to TABS, and its panel below; the page side lives in WritingSections.
 */

type Visibility = "PRIVATE" | "PUBLIC";

type LibraryItem =
  | { key: string; id?: string; kind: "BOOK"; title: string; note: string; url: string; coverImage: string }
  | { key: string; id?: string; kind: "SERIES"; seriesId: string; info: SeriesCardInfo };
type AboutItem = { key: string; id?: string; prompt: string; answer: string };
type LinkItem = { key: string; id?: string; label: string; url: string; subtext: string };

type EditorValues = {
  bio: string;
  sections: SectionSwitches;
  library: LibraryItem[];
  about: AboutItem[];
  links: LinkItem[];
  bannerImage: string;
  readingProfileVisibility: Visibility;
  activityVisibility: Visibility;
  followerListVisibility: Visibility;
};

export type AuthorProfileDoc = {
  bio: string;
  sections: SectionSwitches;
  library: LibraryCardData[];
  about: AboutCardData[];
  links: LinkData[];
};

const TABS: { key: EditorTab; label: string }[] = [
  { key: "basics", label: "Basics" },
  { key: "library", label: "Library" },
  { key: "about", label: "About me" },
  { key: "links", label: "Links" },
];

let counter = 0;
const newKey = () => `new-${Date.now().toString(36)}-${(counter += 1)}`;

function fromDoc(doc: AuthorProfileDoc) {
  return {
    bio: doc.bio,
    sections: { ...doc.sections },
    library: doc.library.map<LibraryItem>((card) =>
      card.kind === "BOOK"
        ? { key: card.key, id: card.key, kind: "BOOK", title: card.title, note: card.note ?? "", url: card.url ?? "", coverImage: card.coverImage ?? "" }
        : { key: card.key, id: card.key, kind: "SERIES", seriesId: card.series.id, info: card.series },
    ),
    about: doc.about.map((card) => ({ key: card.key, id: card.key, prompt: card.prompt, answer: card.answer })),
    links: doc.links.map((link) => ({ key: link.key, id: link.key, label: link.label, url: link.url, subtext: link.subtext ?? "" })),
  };
}

function toInput(values: EditorValues): AuthorProfileInput {
  const id = (item: { id?: string }) => (item.id ? { id: item.id } : {});
  return {
    bio: values.bio,
    sections: values.sections,
    library: values.library.map((item) =>
      item.kind === "BOOK"
        ? { ...id(item), kind: "BOOK", title: item.title, note: item.note, url: item.url, coverImage: item.coverImage }
        : { ...id(item), kind: "SERIES", seriesId: item.seriesId },
    ),
    about: values.about.map((card) => ({ ...id(card), prompt: card.prompt, answer: card.answer })),
    links: values.links.map((link) => ({ ...id(link), label: link.label, url: link.url, subtext: link.subtext })),
  };
}

export default function AuthorProfileEditor({
  authorId,
  displayName,
  role,
  image,
  bannerImage,
  readingProfileVisibility,
  activityVisibility,
  followerListVisibility,
  doc,
  seriesOptions,
  onSite,
  openOnLoad = false,
}: {
  /** Open straight away (the "Edit profile" link from the visitor preview, ?edit=1). */
  openOnLoad?: boolean;
  authorId: string;
  displayName: string;
  role: string | null;
  image: string;
  bannerImage: string;
  readingProfileVisibility: Visibility;
  activityVisibility: Visibility;
  followerListVisibility: Visibility;
  doc: AuthorProfileDoc;
  seriesOptions: SeriesCardInfo[];
  onSite: OnSiteData;
}) {
  const router = useRouter();
  const { refreshSession } = useAuthSession();
  const initial = useMemo<EditorValues>(
    () => ({ ...fromDoc(doc), bannerImage, readingProfileVisibility, activityVisibility, followerListVisibility }),
    [doc, bannerImage, readingProfileVisibility, activityVisibility, followerListVisibility],
  );
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<EditorTab>("basics");
  const [preview, setPreview] = useState(false);
  const [openItem, setOpenItem] = useState<string | null>(null);
  const [saved, setSaved] = useState(initial);
  const [values, setValues] = useState(initial);
  const [status, setStatus] = useState<{ kind: "idle" | "saving" | "saved" | "error"; message?: string }>({ kind: "idle" });
  const dirty = JSON.stringify(values) !== JSON.stringify(saved);
  const tabsId = useId();

  function openEditor(at: EditorTab = "basics") {
    setValues(saved);
    setTab(at);
    setPreview(false);
    setOpenItem(null);
    setStatus({ kind: "idle" });
    setOpen(true);
  }

  // ?edit=1: open once, then drop the flag so a refresh doesn't reopen it.
  useEffect(() => {
    if (!openOnLoad) return;
    openEditor();
    const url = new URL(window.location.href);
    url.searchParams.delete("edit");
    window.history.replaceState(window.history.state, "", url.pathname + url.search + url.hash);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Empty-section prompts on the page open the editor at their tab.
  useEffect(() => {
    const onOpen = (event: Event) => openEditor((event as CustomEvent<EditorTab>).detail ?? "basics");
    window.addEventListener(OPEN_EDITOR_EVENT, onOpen);
    return () => window.removeEventListener(OPEN_EDITOR_EVENT, onOpen);
  });

  // Warn before leaving the page with unsaved changes.
  useEffect(() => {
    if (!open || !dirty) return;
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [open, dirty]);

  function requestClose() {
    if (status.kind === "saving") return;
    if (dirty && !window.confirm("Discard your unsaved changes?")) return;
    setOpen(false);
  }

  function update(patch: Partial<EditorValues>) {
    setValues((current) => ({ ...current, ...patch }));
    if (status.kind !== "saving") setStatus({ kind: "idle" });
  }
  const setSection = (key: SectionKey, on: boolean) => update({ sections: { ...values.sections, [key]: on } });

  async function send(url: string, method: "PUT" | "PATCH", body: unknown) {
    const response = await fetch(url, {
      method,
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }).catch(() => null);
    const payload = (await response?.json().catch(() => null)) as { error?: string; profile?: AuthorProfileDoc } | null;
    if (!response?.ok) {
      const message = response?.status === 401 ? "Your session has expired. Sign in again, then retry." : payload?.error || "Couldn't save your profile. Please try again.";
      return { ok: false as const, message };
    }
    return { ok: true as const, payload };
  }

  async function save() {
    const input = toInput(values);
    const checked = normalizeAuthorProfile(input);
    if (!checked.ok) return setStatus({ kind: "error", message: checked.message });

    setStatus({ kind: "saving" });
    let next = values;
    if (JSON.stringify(input) !== JSON.stringify(toInput(saved))) {
      const result = await send("/api/me/author-profile", "PUT", input);
      if (!result.ok) return setStatus({ kind: "error", message: result.message });
      // Fresh ids for new rows, so the next save updates instead of re-creating.
      if (result.payload?.profile) next = { ...next, ...fromDoc(result.payload.profile) };
    }
    const visibility: Record<string, Visibility> = {};
    if (values.readingProfileVisibility !== saved.readingProfileVisibility) visibility.readingProfileVisibility = values.readingProfileVisibility;
    if (values.activityVisibility !== saved.activityVisibility) visibility.activityVisibility = values.activityVisibility;
    if (values.followerListVisibility !== saved.followerListVisibility) visibility.followerListVisibility = values.followerListVisibility;
    if (Object.keys(visibility).length) {
      const result = await send("/api/me/profile", "PATCH", visibility);
      if (!result.ok) return setStatus({ kind: "error", message: result.message });
    }
    if (values.bannerImage !== saved.bannerImage) {
      const result = await send("/api/me/profile-images", "PATCH", { bannerImage: values.bannerImage || null });
      if (!result.ok) return setStatus({ kind: "error", message: result.message });
    }

    setSaved(next);
    setValues(next);
    setStatus({ kind: "saved" });
    void refreshSession();
    router.refresh();
  }

  // The preview shows what a save would store: cleaned links, complete cards only.
  const cleanUrl = (url: string) => {
    const result = normalizeProfileLink(url);
    return result.ok ? result.value : null;
  };
  const previewLibrary = values.library.flatMap<LibraryCardData>((item) =>
    item.kind === "BOOK"
      ? item.title.trim()
        ? [{ key: item.key, kind: "BOOK", title: item.title.trim(), note: item.note.trim() || null, url: cleanUrl(item.url), coverImage: item.coverImage || null }]
        : []
      : [{ key: item.key, kind: "SERIES", series: item.info }],
  );
  const previewLinks = values.links.flatMap<LinkData>((link) => {
    const url = cleanUrl(link.url);
    return link.label.trim() && url ? [{ key: link.key, label: link.label.trim(), url, subtext: link.subtext.trim() || null }] : [];
  });

  return (
    <>
      <button
        type="button"
        onClick={() => openEditor()}
        aria-label="Edit profile"
        title="Edit profile"
        className="flex h-11 w-11 items-center justify-center rounded-full border border-[var(--border-strong)] bg-[var(--surface-raised)] text-[var(--text-primary)] shadow-[var(--shadow-card)] transition hover:bg-[var(--panel-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--series-accent))]"
      >
        <PenIcon />
      </button>

      <Sheet
        open={open}
        wide
        title={preview ? "Preview" : "Edit profile"}
        onRequestClose={requestClose}
        footer={
          <div className="flex flex-wrap items-center justify-end gap-3">
            <p
              role={status.kind === "error" ? "alert" : "status"}
              className={`mr-auto min-w-0 flex-1 basis-full text-sm sm:basis-auto ${
                status.kind === "error" ? "text-[var(--status-danger)]" : status.kind === "saved" && !dirty ? "text-[var(--status-live)]" : "theme-meta"
              }`}
            >
              {status.kind === "error"
                ? status.message
                : status.kind === "saving"
                  ? "Saving…"
                  : status.kind === "saved" && !dirty
                    ? "✓ Saved"
                    : dirty
                      ? "Unsaved changes"
                      : ""}
            </p>
            <button type="button" onClick={requestClose} className="story-button-secondary min-h-11">
              {dirty ? "Cancel" : "Close"}
            </button>
            <button
              type="button"
              onClick={() => void save()}
              disabled={!dirty || status.kind === "saving"}
              className="story-button-primary min-h-11 disabled:opacity-50"
            >
              {status.kind === "saving" ? "Saving…" : "Save"}
            </button>
          </div>
        }
      >
        <div className="scrollbar-hide sticky -top-5 z-10 -mx-5 -mt-5 mb-5 flex items-center gap-1 overflow-x-auto border-b border-[var(--border-color)] bg-[var(--studio-raised)] px-3">
          <div role="tablist" aria-label="Profile sections" className="flex gap-1">
            {TABS.map((item) => (
              <button
                key={item.key}
                type="button"
                role="tab"
                id={`${tabsId}-${item.key}`}
                aria-selected={!preview && tab === item.key}
                aria-controls={`${tabsId}-panel`}
                onClick={() => {
                  setPreview(false);
                  setTab(item.key);
                  setOpenItem(null);
                }}
                className={`min-h-12 shrink-0 border-b-2 px-2.5 text-sm font-semibold transition sm:px-3 ${
                  !preview && tab === item.key
                    ? "border-[hsl(var(--series-accent))] text-[var(--text-primary)]"
                    : "border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
          <button
            type="button"
            aria-pressed={preview}
            aria-label="Preview as a visitor"
            title="Preview as a visitor"
            onClick={() => setPreview((value) => !value)}
            className={`ml-auto inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center gap-1.5 rounded-full border px-2.5 text-xs font-semibold transition sm:min-h-9 sm:px-3 ${
              preview ? "border-transparent bg-[var(--text-primary)] text-[var(--bg-secondary)]" : "border-[var(--border-strong)] text-[var(--text-primary)] hover:bg-[var(--panel-hover)]"
            }`}
          >
            <svg aria-hidden viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M2 10s3-5.5 8-5.5S18 10 18 10s-3 5.5-8 5.5S2 10 2 10z" />
              <circle cx="10" cy="10" r="2.5" />
            </svg>
            <span aria-hidden className="hidden sm:inline">
              Preview
            </span>
          </button>
        </div>

        {preview ? (
          <div>
            <p className="theme-meta mb-5 rounded-xl bg-[var(--accent-soft)] px-3 py-2 text-xs leading-5">
              How visitors see your profile with these changes (not saved yet). Empty or hidden sections don&apos;t appear.
            </p>
            <h3 className="font-heading theme-heading mb-4 text-2xl font-semibold">{displayName}</h3>
            <WritingSections
              mode="visitor"
              authorId={authorId}
              bio={values.bio}
              sections={values.sections}
              library={previewLibrary}
              about={values.about.filter((card) => card.prompt.trim() && card.answer.trim())}
              links={previewLinks}
              onSite={onSite}
            />
          </div>
        ) : (
          <div role="tabpanel" id={`${tabsId}-panel`} aria-labelledby={`${tabsId}-${tab}`} className="space-y-8">
            {tab === "basics" ? (
              <BasicsTab role={role} image={image} values={values} update={update} setSection={setSection} dirty={dirty} />
            ) : tab === "library" ? (
              <LibraryTab values={values} update={update} setSection={setSection} seriesOptions={seriesOptions} openItem={openItem} setOpenItem={setOpenItem} />
            ) : tab === "about" ? (
              <AboutTab values={values} update={update} setSection={setSection} openItem={openItem} setOpenItem={setOpenItem} />
            ) : (
              <LinksTab values={values} update={update} setSection={setSection} openItem={openItem} setOpenItem={setOpenItem} />
            )}
          </div>
        )}
      </Sheet>
    </>
  );
}

/* --------------------------------------------------------------- tabs */

type TabProps = {
  values: EditorValues;
  update: (patch: Partial<EditorValues>) => void;
  setSection: (key: SectionKey, on: boolean) => void;
};
type ListTabProps = TabProps & { openItem: string | null; setOpenItem: (key: string | null) => void };

function BasicsTab({ role, image, values, update, setSection, dirty }: TabProps & { role: string | null; image: string; dirty: boolean }) {
  const bioId = useId();
  return (
    <>
      <Group title="Picture">
        <Link
          href="/reader/avatar"
          onClick={(event) => {
            if (dirty && !window.confirm("Leave the editor? Your unsaved changes here will be lost.")) event.preventDefault();
          }}
          className="flex min-h-[72px] items-center gap-4 rounded-2xl border border-[var(--border-color)] p-3 transition hover:border-[var(--border-strong)] hover:bg-[var(--panel-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--series-accent))]"
        >
          <UserAvatar user={{ image: image || null, role }} size="lg" />
          <span className="min-w-0 flex-1">
            <span className="theme-heading block text-sm font-semibold">Choose avatar</span>
            <span className="theme-meta mt-0.5 block text-xs leading-5">Pick one from the library, or upload and position your own photo.</span>
          </span>
          <span aria-hidden className="text-lg text-[var(--text-muted)]">
            ›
          </span>
        </Link>
        <Link
          href="/store"
          onClick={(event) => {
            if (dirty && !window.confirm("Leave the editor? Your unsaved changes here will be lost.")) event.preventDefault();
          }}
          className="mt-2 flex min-h-11 items-center justify-between gap-3 rounded-2xl px-3 text-sm font-semibold text-[var(--text-primary)] transition hover:bg-[var(--panel-hover)]"
        >
          Browse the Store
          <span aria-hidden className="text-lg text-[var(--text-muted)]">
            ›
          </span>
        </Link>
      </Group>

      <ImageUploadField
        label="Background picture"
        purpose="profile-banner"
        shape="banner"
        value={values.bannerImage}
        onChange={(url) => update({ bannerImage: url })}
        hint="Shown across the top of your profile. A wide image (about 3:1) works best."
      />

      <Group title="Bio" description="Your display name is changed in Settings › Account.">
        <SectionSwitch label="Show your bio" checked={values.sections.bio} onChange={(on) => setSection("bio", on)} />
        <label htmlFor={bioId} className="sr-only">
          Bio
        </label>
        <textarea
          id={bioId}
          value={values.bio}
          onChange={(event) => update({ bio: event.target.value })}
          maxLength={Math.max(LIMITS.bio, values.bio.length)}
          rows={4}
          placeholder="A few lines about you and what you write."
          className="ui-input mt-3 w-full px-4 py-3 text-base leading-6 sm:text-sm"
        />
        <div className="mt-1.5 flex items-start justify-between gap-3 text-xs">
          <span className="theme-meta">Plain text. Links go in the Links tab.</span>
          <Counter value={values.bio.trim().length} max={LIMITS.bio} />
        </div>
      </Group>

      <Group title="On Dramatized Fiction" description="Your published series and latest episodes, filled in automatically.">
        <SectionSwitch label="Show your published work" checked={values.sections.onSite} onChange={(on) => setSection("onSite", on)} />
      </Group>

      <Group title="Reading profile" description="Your Reading view: the series you follow and your activity.">
        <div className="space-y-3">
          <VisibilitySwitch
            name="Library"
            value={values.readingProfileVisibility}
            onChange={(value) => update({ readingProfileVisibility: value })}
            publicText="Anyone can see the series you follow."
            privateText="Only you can see the series you follow."
          />
          <VisibilitySwitch
            name="Activity"
            value={values.activityVisibility}
            onChange={(value) => update({ activityVisibility: value })}
            publicText="Anyone can see your bookmarks, ratings and comments. Comments always show under their episode."
            privateText="Only you can see your Activity. Your comments still show under their episode."
          />
          <FollowerListSwitch value={values.followerListVisibility} onChange={(value) => update({ followerListVisibility: value })} />
          <p className="theme-meta text-xs leading-5">Your Bookmarks and the writers you follow are always private.</p>
        </div>
      </Group>
    </>
  );
}

function LibraryTab({ values, update, setSection, seriesOptions, openItem, setOpenItem }: ListTabProps & { seriesOptions: SeriesCardInfo[] }) {
  const pickerId = useId();
  const used = new Set(values.library.flatMap((item) => (item.kind === "SERIES" ? [item.seriesId] : [])));
  const available = seriesOptions.filter((series) => !used.has(series.id));
  const [pick, setPick] = useState("");
  const full = values.library.length >= LIMITS.libraryItems;

  function add(item: LibraryItem) {
    update({ library: [...values.library, item] });
    setOpenItem(item.kind === "BOOK" ? item.key : null);
  }

  return (
    <>
      <Group title="Library" description="Showcase your books and your series here. Your series are only added when you choose them.">
        <SectionSwitch label="Show your Library" checked={values.sections.library} onChange={(on) => setSection("library", on)} />
      </Group>

      <div>
        <ListCount count={values.library.length} max={LIMITS.libraryItems} noun="cards" />
        {values.library.length ? (
          <ItemList
            items={values.library}
            onChange={(library) => update({ library })}
            itemName="card"
            openKey={openItem}
            onOpenKeyChange={setOpenItem}
            summary={(item) =>
              item.kind === "BOOK"
                ? { title: item.title.trim() || "New book", detail: `Book${linkDomain(item.url) ? ` · ${linkDomain(item.url)}` : ""}` }
                : {
                    title: item.info.title,
                    detail: item.info.published ? "Your series" : "Unpublished · hidden from visitors",
                  }
            }
            renderForm={(item, set) =>
              item.kind === "BOOK" ? (
                <div className="space-y-4">
                  <TextField label="Title" value={item.title} max={LIMITS.bookTitle} onChange={(title) => set({ ...item, title })} />
                  <BookCoverField value={item.coverImage} title={item.title} onChange={(coverImage) => set({ ...item, coverImage })} />
                  <TextField label="Short note" optional multiline value={item.note} max={LIMITS.bookNote} onChange={(note) => set({ ...item, note })} placeholder="Book one of the Ember trilogy." />
                  <UrlField label="Link" optional value={item.url} onChange={(url) => set({ ...item, url })} placeholder="https://www.amazon.com/…" />
                </div>
              ) : (
                <p className="theme-meta text-sm leading-6">
                  The card shows this series&apos; cover, title and rating automatically.
                  {item.info.published ? "" : " It isn't published right now, so visitors don't see it."}
                </p>
              )
            }
          />
        ) : null}
      </div>

      <div className="space-y-3 rounded-2xl border border-dashed border-[var(--border-strong)] p-4">
        <button
          type="button"
          disabled={full}
          onClick={() => add({ key: newKey(), kind: "BOOK", title: "", note: "", url: "", coverImage: "" })}
          className="story-button-secondary min-h-11 w-full justify-center disabled:opacity-50"
        >
          + Add a book
        </button>
        {seriesOptions.length ? (
          <div className="flex flex-col gap-2 sm:flex-row">
            <label htmlFor={pickerId} className="sr-only">
              Choose one of your series
            </label>
            <select id={pickerId} value={pick} onChange={(event) => setPick(event.target.value)} disabled={full || !available.length} className="ui-input min-h-11 flex-1 px-3 text-base sm:text-sm">
              <option value="">{available.length ? "Choose one of your series…" : "All your series are added"}</option>
              {available.map((series) => (
                <option key={series.id} value={series.id}>
                  {series.title}
                </option>
              ))}
            </select>
            <button
              type="button"
              disabled={full || !pick}
              onClick={() => {
                const info = available.find((series) => series.id === pick);
                if (!info) return;
                add({ key: newKey(), kind: "SERIES", seriesId: info.id, info });
                setPick("");
              }}
              className="story-button-secondary min-h-11 justify-center disabled:opacity-50"
            >
              + Add series
            </button>
          </div>
        ) : (
          <p className="theme-meta text-xs">Your published series can be added here once you publish one.</p>
        )}
        {full ? <p className="theme-meta text-xs">Your Library is full ({LIMITS.libraryItems} cards). Remove one to add another.</p> : null}
      </div>
    </>
  );
}

function AboutTab({ values, update, setSection, openItem, setOpenItem }: ListTabProps) {
  const used = new Set(values.about.map((card) => card.prompt.trim()));
  const full = values.about.length >= LIMITS.aboutCards;

  function add(prompt: string) {
    const key = newKey();
    update({ about: [...values.about, { key, prompt, answer: "" }] });
    setOpenItem(key);
  }

  return (
    <>
      <Group title="About me" description="Short questions and answers that help readers get to know you.">
        <SectionSwitch label="Show About me" checked={values.sections.about} onChange={(on) => setSection("about", on)} />
      </Group>

      <div>
        <ListCount count={values.about.length} max={LIMITS.aboutCards} noun="cards" />
        {values.about.length ? (
          <ItemList
            items={values.about}
            onChange={(about) => update({ about })}
            itemName="card"
            openKey={openItem}
            onOpenKeyChange={setOpenItem}
            summary={(card) => ({ title: card.prompt.trim() || "Your question", detail: card.answer.trim() || "No answer yet" })}
            renderForm={(card, set) => (
              <div className="space-y-4">
                <TextField label="Question" value={card.prompt} max={LIMITS.prompt} onChange={(prompt) => set({ ...card, prompt })} />
                <TextField label="Your answer" multiline rows={5} value={card.answer} max={LIMITS.answer} onChange={(answer) => set({ ...card, answer })} />
              </div>
            )}
          />
        ) : null}
      </div>

      <div className="rounded-2xl border border-dashed border-[var(--border-strong)] p-4">
        <p className="theme-heading text-sm font-semibold">Add a card</p>
        {full ? (
          <p className="theme-meta mt-2 text-xs">You have {LIMITS.aboutCards} cards, the most allowed. Remove one to add another.</p>
        ) : (
          <div className="mt-3 flex flex-wrap gap-2">
            {STARTER_PROMPTS.filter((prompt) => !used.has(prompt)).map((prompt) => (
              <button
                key={prompt}
                type="button"
                onClick={() => add(prompt)}
                className="min-h-11 rounded-full border border-[var(--border-strong)] px-3.5 text-left text-sm text-[var(--text-primary)] transition hover:bg-[var(--panel-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]"
              >
                + {prompt}
              </button>
            ))}
            <button
              type="button"
              onClick={() => add("")}
              className="min-h-11 rounded-full border border-dashed border-[hsl(var(--series-accent))] px-3.5 text-sm font-semibold text-[var(--text-primary)] transition hover:bg-[var(--panel-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]"
            >
              + Add your own question
            </button>
          </div>
        )}
      </div>
    </>
  );
}

function LinksTab({ values, update, setSection, openItem, setOpenItem }: ListTabProps) {
  const full = values.links.length >= LIMITS.links;
  return (
    <>
      <Group title="Links" description="Your books, socials or newsletter. Links open in a new tab, and readers see the site's address.">
        <SectionSwitch label="Show your Links" checked={values.sections.links} onChange={(on) => setSection("links", on)} />
      </Group>

      <div>
        <ListCount count={values.links.length} max={LIMITS.links} noun="links" />
        {values.links.length ? (
          <ItemList
            items={values.links}
            onChange={(links) => update({ links })}
            itemName="link"
            openKey={openItem}
            onOpenKeyChange={setOpenItem}
            summary={(link) => ({
              title: link.label.trim() || "New link",
              detail: linkDomain(link.url) ?? (link.url.trim() ? "Check this address" : "No address yet"),
              badge: (
                <span className="text-[var(--text-secondary)]">
                  <LinkIcon icon={linkIcon(link.url)} className="h-4 w-4" />
                </span>
              ),
            })}
            renderForm={(link, set) => (
              <div className="space-y-4">
                <TextField label="Name" value={link.label} max={LIMITS.linkLabel} onChange={(label) => set({ ...link, label })} placeholder="My newsletter" />
                <UrlField label="Web address" value={link.url} onChange={(url) => set({ ...link, url })} placeholder="https://" />
                <TextField
                  label="Text above the link"
                  optional
                  value={link.subtext}
                  max={LIMITS.linkSubtext}
                  onChange={(subtext) => set({ ...link, subtext })}
                  placeholder="Click here to read my free prequel"
                />
              </div>
            )}
          />
        ) : null}
      </div>

      <button
        type="button"
        disabled={full}
        onClick={() => {
          const key = newKey();
          update({ links: [...values.links, { key, label: "", url: "", subtext: "" }] });
          setOpenItem(key);
        }}
        className="story-button-secondary min-h-11 w-full justify-center disabled:opacity-50"
      >
        + Add a link
      </button>
      {full ? <p className="theme-meta -mt-5 text-xs">You have {LIMITS.links} links, the most allowed.</p> : null}
    </>
  );
}

/* ---------------------------------------------------------- controls */

function Group({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return (
    <section>
      <h3 className="theme-heading text-base font-semibold">{title}</h3>
      {description ? <p className="theme-meta mt-1 text-sm leading-6">{description}</p> : null}
      <div className="mt-3">{children}</div>
    </section>
  );
}

function ListCount({ count, max, noun }: { count: number; max: number; noun: string }) {
  return (
    <p className="theme-meta mb-2 text-xs">
      {count} of {max} {noun}
    </p>
  );
}

function Counter({ value, max }: { value: number; max: number }) {
  const over = value > max;
  return (
    <span aria-live="polite" className={`shrink-0 tabular-nums ${over ? "font-semibold text-[var(--status-danger)]" : "theme-meta"}`}>
      {value}/{max}
      {over ? " (too long)" : ""}
    </span>
  );
}

/** "Show on your profile" switch for a section (on by default). */
function SectionSwitch({ label, checked, onChange }: { label: string; checked: boolean; onChange: (on: boolean) => void }) {
  const id = useId();
  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl border border-[var(--border-color)] px-4 py-2">
      <span id={id} className="min-w-0">
        <span className="theme-heading block text-sm font-semibold">{label}</span>
        <span className="theme-meta block text-xs">{checked ? "Visitors see it when it has something in it." : "Hidden from visitors. You still see it."}</span>
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-labelledby={id}
        onClick={() => onChange(!checked)}
        className="relative flex h-11 w-[60px] shrink-0 items-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--series-accent))]"
      >
        <span aria-hidden className={`absolute inset-x-0 top-1/2 h-8 -translate-y-1/2 rounded-full transition ${checked ? "bg-[hsl(var(--series-accent))]" : "bg-[var(--border-strong)]"}`} />
        <span aria-hidden className={`relative h-6 w-6 rounded-full bg-white shadow transition-transform ${checked ? "translate-x-[32px]" : "translate-x-[4px]"}`} />
      </button>
    </div>
  );
}

function TextField({
  label,
  value,
  max,
  onChange,
  optional = false,
  multiline = false,
  rows = 3,
  placeholder,
}: {
  label: string;
  value: string;
  max: number;
  onChange: (value: string) => void;
  optional?: boolean;
  multiline?: boolean;
  rows?: number;
  placeholder?: string;
}) {
  const id = useId();
  const common = {
    id,
    value,
    placeholder,
    maxLength: Math.max(max, value.length),
    className: "ui-input w-full px-4 py-3 text-base leading-6 sm:text-sm",
  };
  return (
    <div>
      <label htmlFor={id} className="theme-heading mb-1.5 flex items-baseline justify-between gap-3 text-sm font-semibold">
        <span>
          {label}
          {optional ? <span className="theme-meta font-normal"> (optional)</span> : null}
        </span>
        <span className="text-xs font-normal">
          <Counter value={value.trim().length} max={max} />
        </span>
      </label>
      {multiline ? (
        <textarea {...common} rows={rows} onChange={(event) => onChange(event.target.value)} />
      ) : (
        <input {...common} type="text" onChange={(event) => onChange(event.target.value)} />
      )}
    </div>
  );
}

function UrlField({ label, value, onChange, optional = false, placeholder }: { label: string; value: string; onChange: (value: string) => void; optional?: boolean; placeholder?: string }) {
  const id = useId();
  const hintId = useId();
  const checked = value.trim() ? normalizeProfileLink(value) : null;
  const domain = checked?.ok ? linkDomain(checked.value) : null;
  return (
    <div>
      <label htmlFor={id} className="theme-heading mb-1.5 block text-sm font-semibold">
        {label}
        {optional ? <span className="theme-meta font-normal"> (optional)</span> : null}
      </label>
      <input
        id={id}
        type="url"
        inputMode="url"
        autoComplete="url"
        value={value}
        maxLength={LIMITS.url}
        placeholder={placeholder}
        aria-describedby={hintId}
        aria-invalid={checked ? !checked.ok : undefined}
        onChange={(event) => onChange(event.target.value)}
        className="ui-input w-full px-4 py-3 text-base sm:text-sm"
      />
      <p id={hintId} className="mt-1.5 flex items-center gap-1.5 text-xs">
        {checked && !checked.ok ? (
          <span className="text-[var(--status-danger)]">{checked.message}</span>
        ) : domain ? (
          <>
            <span className="text-[var(--text-secondary)]">
              <LinkIcon icon={linkIcon(checked?.ok ? checked.value : null)} className="h-3.5 w-3.5" />
            </span>
            <span className="theme-meta">Readers will see: {domain}</span>
          </>
        ) : (
          <span className="theme-meta">Starts with https:// (added for you if you leave it out).</span>
        )}
      </p>
    </div>
  );
}
