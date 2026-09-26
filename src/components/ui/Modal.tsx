import { useEffect, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { XIcon } from "../icons";

type ModalProps = {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  width?: number;
  labelledBy?: string;
  showClose?: boolean;
};

export default function Modal({
  open,
  onClose,
  children,
  width = 440,
  labelledBy,
  showClose = false,
}: ModalProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    const t = window.setTimeout(() => {
      ref.current
        ?.querySelector<HTMLElement>("[data-autofocus]")
        ?.focus();
    }, 40);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.clearTimeout(t);
    };
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-zinc-900/45 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        style={{ width }}
        className="relative z-10 overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-2xl shadow-zinc-900/20 animate-scale-in dark:border-zinc-700 dark:bg-zinc-800"
      >
        {showClose && (
          <button
            onClick={onClose}
            aria-label="关闭"
            className="absolute right-3 top-3 z-10 inline-flex h-7 w-7 items-center justify-center rounded-lg text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-700 dark:hover:text-zinc-200"
          >
            <XIcon className="h-4 w-4" />
          </button>
        )}
        {children}
      </div>
    </div>,
    document.body,
  );
}
