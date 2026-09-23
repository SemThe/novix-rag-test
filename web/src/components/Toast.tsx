import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from "react";
import { IconAlert, IconCheck, IconX } from "./icons";

interface ToastItem {
  id: number;
  kind: "success" | "error";
  message: string;
}

interface ToastContextValue {
  success: (message: string) => void;
  error: (message: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const idRef = useRef(0);

  const push = useCallback((kind: ToastItem["kind"], message: string) => {
    const id = ++idRef.current;
    setToasts((prev) => [...prev, { id, kind, message }]);
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 5000);
  }, []);

  const value: ToastContextValue = {
    success: (message) => push("success", message),
    error: (message) => push("error", message),
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="fixed bottom-5 right-5 z-toast flex w-full max-w-sm flex-col gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            role="status"
            className={`animate-toast-in flex items-start gap-2.5 rounded-lg border px-4 py-3 shadow-popover ${
              t.kind === "success"
                ? "border-success/25 bg-success-soft text-ink"
                : "border-danger/25 bg-danger-soft text-ink"
            }`}
          >
            {t.kind === "success" ? (
              <IconCheck className="mt-0.5 h-4 w-4 shrink-0 text-success" />
            ) : (
              <IconAlert className="mt-0.5 h-4 w-4 shrink-0 text-danger" />
            )}
            <p className="text-sm leading-snug">{t.message}</p>
            <button
              onClick={() => setToasts((prev) => prev.filter((x) => x.id !== t.id))}
              className="ml-auto shrink-0 rounded p-0.5 text-ink-faint hover:text-ink"
              aria-label="Sluiten"
            >
              <IconX className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
