import { useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { IconX } from "./icons";

export function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return createPortal(
    <div className="fixed inset-0 z-modal flex items-start justify-center overflow-y-auto bg-ink/40 px-4 py-10 backdrop-blur-[2px]">
      <div
        className="absolute inset-0"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="animate-pop relative w-full max-w-lg rounded-xl border border-border bg-surface shadow-popover">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 className="text-base font-semibold">{title}</h2>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-ink-faint hover:bg-surface-sunken hover:text-ink"
            aria-label="Sluiten"
          >
            <IconX className="h-4 w-4" />
          </button>
        </div>
        <div className="max-h-[75vh] overflow-y-auto px-5 py-5">{children}</div>
      </div>
    </div>,
    document.body
  );
}
