"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";

/**
 * Side panel on desktop, full screen on mobile. Built on <dialog>, so focus
 * is trapped, Escape works and the page behind is inert. Escape and backdrop
 * clicks call `onRequestClose`, which lets the owner confirm unsaved changes.
 */
export default function Sheet({
  open,
  title,
  onRequestClose,
  children,
  footer,
}: {
  open: boolean;
  title: string;
  onRequestClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      className="studio-sheet"
      onCancel={(event) => {
        event.preventDefault();
        onRequestClose();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) onRequestClose();
      }}
    >
      <div className="flex h-full flex-col">
        <div className="flex items-center justify-between gap-4 border-b border-[var(--studio-border)] px-5 py-4">
          <h2 id={titleId} className="font-heading theme-heading text-xl font-semibold">
            {title}
          </h2>
          <button type="button" onClick={onRequestClose} className="studio-tool" aria-label="Close">
            ✕
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-5">{children}</div>
        {footer ? <div className="border-t border-[var(--studio-border)] px-5 py-4">{footer}</div> : null}
      </div>
    </dialog>
  );
}
