"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import FramedAvatar from "@/components/avatar/FramedAvatar";
import { useAuthSession } from "@/components/providers/AuthSessionProvider";
import { BUILT_IN_AVATARS } from "@/lib/avatars";
import { frameFor, FRAME_NAMES } from "@/lib/writer-frames";

/*
 * The Store's Frames tab (Sweep I). Each card shows the member's own avatar
 * wearing that choice. Writers see their earned level frame first (always
 * theirs, never lost); everyone can pick a Store frame or "No frame".
 * Choosing applies right away through PUT /api/me/frame; the "Using" marker
 * moves. Everything is free. Signed-out visitors browse and are sent to sign in.
 */
export type FrameGridItem = { id: string; name: string; imageUrl: string };

type Current = { selectedFrameId: string | null; hideLevelFrame: boolean };
type Member = { image: string | null; role: string; writerStatus: string | null } | null;

export default function FrameGrid({ items, member, initial }: { items: FrameGridItem[]; member: Member; initial: Current }) {
  const router = useRouter();
  const { refreshSession } = useAuthSession();
  const [current, setCurrent] = useState(initial);
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ tone: "ok" | "error"; text: string } | null>(null);

  const viewer = member ?? { image: BUILT_IN_AVATARS.writer, role: "READER", writerStatus: null };
  const level = member ? frameFor(member) : null;
  // A store frame that's no longer listed (hidden/removed) counts as the fallback.
  const wearingStore = current.selectedFrameId && items.some((item) => item.id === current.selectedFrameId) ? current.selectedFrameId : null;
  const choiceKey = wearingStore ? `store:${wearingStore}` : current.hideLevelFrame || !level ? "none" : "level";

  async function choose(key: string, body: Record<string, string>, label: string) {
    if (busy || key === choiceKey) return;
    if (!member) {
      router.push(`/sign-in?callbackUrl=${encodeURIComponent("/store?category=FRAME")}`);
      return;
    }
    setBusy(key);
    setNotice(null);
    const response = await fetch("/api/me/frame", {
      method: "PUT",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }).catch(() => null);
    const payload = (await response?.json().catch(() => null)) as { error?: string } | null;
    setBusy(null);
    if (!response?.ok) {
      setNotice({ tone: "error", text: payload?.error || "Couldn't change your frame. Please try again." });
      return;
    }
    setCurrent(
      body.choice === "store"
        ? { selectedFrameId: body.itemId, hideLevelFrame: false }
        : { selectedFrameId: null, hideLevelFrame: body.choice === "none" },
    );
    setNotice({ tone: "ok", text: label });
    void refreshSession();
    router.refresh();
  }

  const cards: { key: string; title: string; detail: string; body: Record<string, string>; done: string; preview: Parameters<typeof FramedAvatar>[0]["user"] }[] = [];
  if (level) {
    cards.push({
      key: "level",
      title: `${FRAME_NAMES[level.tier]} (earned)`,
      detail: `Your ${level.label} frame. Always yours.`,
      body: { choice: "level" },
      done: "You're wearing your level frame.",
      preview: { ...viewer, hideLevelFrame: false, selectedFrame: null },
    });
  }
  for (const item of items) {
    cards.push({
      key: `store:${item.id}`,
      title: item.name,
      detail: "Free",
      body: { choice: "store", itemId: item.id },
      done: `You're wearing ${item.name}.`,
      preview: { ...viewer, selectedFrame: { imageUrl: item.imageUrl, name: item.name, active: true, category: "FRAME" } },
    });
  }
  cards.push({
    key: "none",
    title: "No frame",
    detail: "Just your picture.",
    body: { choice: "none" },
    done: "No frame. Just your picture.",
    preview: { ...viewer, hideLevelFrame: true, selectedFrame: null },
  });

  return (
    <>
      <p aria-live="polite" className={`min-h-6 text-sm ${notice?.tone === "error" ? "text-[var(--status-danger)]" : "theme-meta"}`}>
        {notice?.text}
      </p>
      {items.length === 0 ? <p className="theme-meta mb-3 text-sm">No Store frames yet. Check back soon.</p> : null}
      <ul className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        {cards.map((card) => {
          const using = card.key === choiceKey;
          return (
            <li key={card.key} className="min-w-0">
              <button
                type="button"
                onClick={() => void choose(card.key, card.body, card.done)}
                disabled={Boolean(busy)}
                aria-pressed={using}
                aria-label={`${card.title}${using ? ", currently using" : ""}`}
                className={`relative flex min-h-[176px] w-full flex-col items-center gap-2 rounded-2xl border p-3 text-center transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] disabled:cursor-wait ${
                  using ? "border-[var(--accent)] bg-[var(--accent-soft)]" : "border-[var(--border-color)] bg-[var(--bg-secondary)] hover:border-[var(--border-strong)]"
                }`}
              >
                <FramedAvatar user={card.preview} size="xl" className="!h-24 !w-24" />
                <span className="w-full truncate text-sm font-semibold text-[var(--text-primary)]">{card.title}</span>
                <span className="theme-meta w-full truncate text-xs">{busy === card.key ? "Applying…" : card.detail}</span>
                {using ? (
                  <span className="absolute right-1.5 top-1.5 rounded-full border border-[var(--accent)] bg-[var(--bg-secondary)] px-2 py-0.5 font-mono-df text-[9px] font-semibold uppercase tracking-[0.14em] text-[var(--accent)]">
                    Using
                  </span>
                ) : null}
              </button>
            </li>
          );
        })}
      </ul>
      {!member ? (
        <p className="mt-4 text-sm">
          <Link href={`/sign-in?callbackUrl=${encodeURIComponent("/store?category=FRAME")}`} className="font-semibold text-[var(--text-primary)] underline underline-offset-4">
            Sign in
          </Link>{" "}
          <span className="theme-meta">to wear a frame.</span>
        </p>
      ) : null}
    </>
  );
}
