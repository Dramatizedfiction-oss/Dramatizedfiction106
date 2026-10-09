"use client";

import Link from "next/link";
import { useCallback, useEffect, useId, useRef, useState, type CSSProperties } from "react";
import { BookOpenIcon, LogOutIcon, MailIcon, SettingsIcon, UserIcon } from "@/components/icons";
import UserAvatar from "@/components/UserAvatar";

export type ProfileMenuUser = {
  id?: string | null;
  name?: string | null;
  image?: string | null;
  role?: string | null;
};

type Variant =
  /** Sidebar bottom, labels shown: a profile card; the menu opens above it. */
  | "card"
  /** Collapsed sidebar: avatar only; the menu opens to the right. */
  | "rail"
  /** Mobile header: avatar only; the menu opens below, right-aligned. */
  | "header";

const PANEL_WIDTH = 248;

/*
 * Account menu: Profile, Settings, Contact, Log out. Positioned with fixed
 * coordinates from the trigger so it can leave the (clipped) sidebar rail.
 * Visibility only: every destination does its own server-side checks.
 */
export default function ProfileMenu({
  user,
  roleLabel,
  hasPublicProfile,
  isSigningOut,
  onSignOut,
  onNavigate,
  variant,
}: {
  user: ProfileMenuUser;
  roleLabel: string;
  /** Writers have a public author page; everyone has a private reader page at /reader. */
  hasPublicProfile: boolean;
  isSigningOut: boolean;
  onSignOut: () => void;
  /** Called after choosing a destination (e.g. to close the mobile drawer). */
  onNavigate?: () => void;
  variant: Variant;
}) {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<CSSProperties>({});
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const panelId = useId();
  const name = user.name?.trim() || "Member";

  const close = useCallback((restoreFocus = false) => {
    setOpen(false);
    if (restoreFocus) triggerRef.current?.focus();
  }, []);

  function toggle() {
    if (open) {
      close();
      return;
    }
    const rect = triggerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const width = Math.min(PANEL_WIDTH, window.innerWidth - 16);
    const clampLeft = (left: number) => Math.min(Math.max(left, 8), window.innerWidth - 8 - width);

    if (variant === "rail") {
      setPosition({ left: clampLeft(rect.right + 8), bottom: Math.max(8, window.innerHeight - rect.bottom), width });
    } else if (variant === "header") {
      setPosition({ left: clampLeft(rect.right - width), top: rect.bottom + 8, width });
    } else {
      const cardWidth = Math.max(rect.width, Math.min(220, width));
      setPosition({ left: clampLeft(rect.left), bottom: window.innerHeight - rect.top + 8, width: cardWidth });
    }
    setOpen(true);
  }

  useEffect(() => {
    if (!open) return;
    panelRef.current?.querySelector<HTMLElement>("a, button:not([disabled])")?.focus();

    function onPointerDown(event: PointerEvent) {
      const target = event.target as Node;
      if (panelRef.current?.contains(target) || triggerRef.current?.contains(target)) return;
      close();
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        // Don't also close the mobile drawer underneath.
        event.stopPropagation();
        close(true);
      }
    }
    function onResize() {
      close();
    }

    document.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("keydown", onKeyDown, true);
    window.addEventListener("resize", onResize);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("keydown", onKeyDown, true);
      window.removeEventListener("resize", onResize);
    };
  }, [close, open]);

  function choose() {
    close();
    onNavigate?.();
  }

  const trigger =
    variant === "card" ? (
      <button
        ref={triggerRef}
        type="button"
        onClick={toggle}
        aria-haspopup="true"
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        className="flex w-full items-center gap-3 rounded-xl border border-[var(--border-color)] bg-[var(--panel-bg)] px-3 py-2.5 text-left transition hover:border-[var(--border-strong)] hover:bg-[var(--panel-hover)]"
      >
        <UserAvatar user={user} size="md" />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold text-[var(--text-primary)]">{name}</span>
          <span className="mt-0.5 block truncate font-mono-df text-[10px] uppercase tracking-[0.2em] text-[var(--text-muted)]">
            {roleLabel}
          </span>
        </span>
        <span aria-hidden className="text-xs text-[var(--text-muted)]">
          ⋯
        </span>
      </button>
    ) : (
      <button
        ref={triggerRef}
        type="button"
        onClick={toggle}
        aria-haspopup="true"
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        aria-label={`Account menu for ${name}`}
        title={name}
        className="flex h-11 w-11 items-center justify-center rounded-full transition hover:bg-[var(--panel-hover)]"
      >
        <UserAvatar user={user} size="sm" />
      </button>
    );

  return (
    <>
      {trigger}
      {open ? (
        <div
          ref={panelRef}
          id={panelId}
          aria-label="Account"
          className="fixed z-[60] rounded-2xl border border-[var(--border-color)] bg-[var(--surface-raised)] p-2 shadow-[var(--shadow-raised)]"
          style={position}
        >
          {variant !== "card" ? (
            <div className="flex items-center gap-3 border-b border-[var(--border-color)] px-2 pb-3 pt-1">
              <UserAvatar user={user} size="md" />
              <span className="min-w-0">
                <span className="block truncate text-sm font-semibold text-[var(--text-primary)]">{name}</span>
                <span className="block truncate font-mono-df text-[10px] uppercase tracking-[0.2em] text-[var(--text-muted)]">
                  {roleLabel}
                </span>
              </span>
            </div>
          ) : null}

          <div className="space-y-0.5 pt-1">
            {/* Writers' "Profile" is their public author page; everyone's private
                reader page (/reader) is "Profile" for readers, "Reading profile" for writers. */}
            {hasPublicProfile && user.id ? (
              <>
                <Link href={`/author/${user.id}`} onClick={choose} className="sidebar-link">
                  <UserIcon size={16} className="shrink-0" />
                  <span>Profile</span>
                </Link>
                <Link href="/reader" onClick={choose} className="sidebar-link">
                  <BookOpenIcon size={16} className="shrink-0" />
                  <span>Reading profile</span>
                </Link>
              </>
            ) : (
              <Link href="/reader" onClick={choose} className="sidebar-link">
                <UserIcon size={16} className="shrink-0" />
                <span>Profile</span>
              </Link>
            )}
            <Link href="/settings" onClick={choose} className="sidebar-link">
              <SettingsIcon size={16} className="shrink-0" />
              <span>Settings</span>
            </Link>
            <UnavailableItem icon={<MailIcon size={16} className="shrink-0" />} label="Contact" />
          </div>

          <div className="mt-1 border-t border-[var(--border-color)] pt-1">
            <button
              type="button"
              onClick={() => {
                close();
                onSignOut();
              }}
              disabled={isSigningOut}
              className="sidebar-link w-full disabled:opacity-60"
            >
              <LogOutIcon size={16} className="shrink-0" />
              <span>{isSigningOut ? "Logging out…" : "Log out"}</span>
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}

/** A destination that doesn't exist yet: shown, but clearly not usable. */
function UnavailableItem({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <button type="button" disabled className="sidebar-link w-full cursor-not-allowed opacity-60">
      {icon}
      <span className="flex-1 text-left">{label}</span>
      <span className="whitespace-nowrap font-mono-df text-[10px] uppercase tracking-[0.14em] text-[var(--text-muted)]">
        Coming soon
      </span>
    </button>
  );
}
