"use client";

import { useEditorState, type Editor } from "@tiptap/react";
import type { CSSProperties, ReactNode } from "react";
import { useKeyboardInset, useModifierLabel } from "./use-viewport";

/*
 * Formatting for exactly the content contract (lib/episode-content/types):
 * bold, italic, heading, quote and scene break, plus undo/redo. Buttons keep
 * the editor's selection (mousedown is prevented) and reflect the current
 * formatting via aria-pressed. On phones the bar docks above the keyboard.
 */
export default function EditorToolbar({ editor, mobile }: { editor: Editor | null; mobile: boolean }) {
  const mod = useModifierLabel();
  const keyboardInset = useKeyboardInset();
  const state = useEditorState({
    editor,
    selector: ({ editor: current }) =>
      current
        ? {
            bold: current.isActive("bold"),
            italic: current.isActive("italic"),
            heading: current.isActive("heading", { level: 2 }),
            quote: current.isActive("blockquote"),
            canUndo: current.can().undo(),
            canRedo: current.can().redo(),
          }
        : null,
  });

  const disabled = !editor || !state;
  const chain = () => editor!.chain().focus();

  const style: CSSProperties | undefined = mobile ? { bottom: keyboardInset } : undefined;

  return (
    <div
      role="toolbar"
      aria-label="Formatting"
      style={style}
      className={
        mobile
          ? "fixed inset-x-0 z-40 flex items-center justify-center gap-1 border-t border-[var(--studio-border)] bg-[var(--sidebar-bg)] px-2 py-1.5 backdrop-blur"
          : "sticky top-14 z-30 flex flex-wrap items-center gap-1 rounded-xl border border-[var(--studio-border)] bg-[var(--sidebar-bg)] px-2 py-1.5 backdrop-blur"
      }
    >
      <Tool label={`Undo (${mod}+Z)`} disabled={disabled || !state?.canUndo} onClick={() => chain().undo().run()}>
        ↶
      </Tool>
      <Tool label={`Redo (${mod}+Shift+Z)`} disabled={disabled || !state?.canRedo} onClick={() => chain().redo().run()}>
        ↷
      </Tool>
      <Divider />
      <Tool label={`Bold (${mod}+B)`} pressed={state?.bold} disabled={disabled} onClick={() => chain().toggleBold().run()}>
        <span className="font-bold">B</span>
      </Tool>
      <Tool label={`Italic (${mod}+I)`} pressed={state?.italic} disabled={disabled} onClick={() => chain().toggleItalic().run()}>
        <span className="font-reading text-base italic">I</span>
      </Tool>
      <Divider />
      <Tool
        label={`Heading (${mod}+Alt+2)`}
        pressed={state?.heading}
        disabled={disabled}
        onClick={() => chain().toggleHeading({ level: 2 }).run()}
      >
        <span className="font-heading font-semibold">H</span>
      </Tool>
      <Tool label={`Quote (${mod}+Shift+B)`} pressed={state?.quote} disabled={disabled} onClick={() => chain().toggleBlockquote().run()}>
        <span className="font-heading text-lg leading-none">“</span>
      </Tool>
      <Tool label="Scene break" disabled={disabled} onClick={() => chain().setHorizontalRule().run()}>
        ✦
      </Tool>
    </div>
  );
}

function Tool({
  label,
  pressed,
  disabled,
  onClick,
  children,
}: {
  label: string;
  pressed?: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      className="studio-tool"
      aria-label={label}
      title={label}
      aria-pressed={pressed === undefined ? undefined : pressed}
      disabled={disabled}
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

function Divider() {
  return <span aria-hidden className="mx-1 h-5 w-px bg-[var(--studio-border)]" />;
}
