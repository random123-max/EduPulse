import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { X, CheckCircle2, AlertTriangle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

/* ---------------- Toast ---------------- */

type ToastTone = "success" | "error";
type Toast = { id: number; msg: string; tone: ToastTone };
type ToastCtx = { notify: (msg: string, tone?: ToastTone) => void };

const ToastContext = createContext<ToastCtx | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const notify = useCallback((msg: string, tone: ToastTone = "success") => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, msg, tone }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4000);
  }, []);

  return (
    <ToastContext.Provider value={{ notify }}>
      {children}
      <div className="pointer-events-none fixed bottom-5 right-5 z-100 flex w-[min(22rem,calc(100vw-2.5rem))] flex-col gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            role="status"
            className="glass animate-rise pointer-events-auto flex items-start gap-2.5 rounded-xl px-4 py-3 text-sm shadow-lg shadow-black/40"
          >
            {t.tone === "success" ? (
              <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-mint" />
            ) : (
              <AlertTriangle className="mt-0.5 size-4 shrink-0 text-destructive" />
            )}
            <span className="leading-snug">{t.msg}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

/* ---------------- Modal ---------------- */

export function Modal({
  open,
  onClose,
  title,
  description,
  wide,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  wide?: boolean;
  children?: ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-90 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div
        className={cn(
          "glass animate-rise relative z-10 max-h-[85vh] w-full overflow-y-auto rounded-3xl p-6 shadow-2xl shadow-black/60",
          wide ? "max-w-2xl" : "max-w-lg",
        )}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-balance text-lg font-semibold">{title}</h2>
            {description && (
              <p className="mt-1 text-pretty text-sm text-muted-foreground">{description}</p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="grid size-8 shrink-0 place-items-center rounded-lg border border-border text-muted-foreground transition-all hover:border-foreground/25 hover:text-foreground"
          >
            <X className="size-4" />
          </button>
        </div>
        {children && <div className="mt-5">{children}</div>}
      </div>
    </div>
  );
}

/* ---------------- Field ---------------- */

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}

/* ---------------- Buttons ---------------- */

export function EduButton({
  children,
  icon,
  variant = "solid",
  loading,
  className,
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  icon?: ReactNode;
  variant?: "solid" | "outline" | "ghost" | "violet" | "mint";
  loading?: boolean;
}) {
  return (
    <button
      {...rest}
      disabled={rest.disabled || loading}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all",
        "disabled:cursor-not-allowed disabled:opacity-40",
        variant === "solid" && "glow-cyan bg-cyan text-primary-foreground hover:brightness-110",
        variant === "violet" && "bg-violet text-accent-foreground hover:brightness-110",
        variant === "mint" && "bg-mint text-primary-foreground hover:brightness-110",
        variant === "outline" &&
          "border border-violet/40 text-violet hover:bg-violet/10 disabled:hover:bg-transparent",
        variant === "ghost" &&
          "border border-border bg-secondary/40 text-foreground hover:border-foreground/25",
        className,
      )}
    >
      {loading ? <Loader2 className="size-4 animate-spin" /> : icon}
      {children}
    </button>
  );
}

/* ---------------- Markdown-ish renderer ---------------- */

export function RichText({ text }: { text: string }) {
  const lines = text.split("\n");
  return (
    <div className="space-y-2 text-sm leading-relaxed">
      {lines.map((raw, i) => {
        const line = raw.trimEnd();
        if (!line.trim()) return <div key={i} className="h-1" />;
        const inline = (s: string) =>
          s.split(/(\*\*[^*]+\*\*)/g).map((part, j) =>
            part.startsWith("**") && part.endsWith("**") ? (
              <strong key={j} className="font-semibold text-foreground">
                {part.slice(2, -2)}
              </strong>
            ) : (
              <span key={j}>{part}</span>
            ),
          );
        if (/^#{1,6}\s/.test(line)) {
          return (
            <h3 key={i} className="pt-2 text-sm font-semibold text-cyan">
              {line.replace(/^#{1,6}\s/, "")}
            </h3>
          );
        }
        if (/^[-*]\s/.test(line)) {
          return (
            <p key={i} className="flex gap-2 text-muted-foreground">
              <span className="text-cyan">•</span>
              <span>{inline(line.replace(/^[-*]\s/, ""))}</span>
            </p>
          );
        }
        return (
          <p key={i} className="text-muted-foreground">
            {inline(line)}
          </p>
        );
      })}
    </div>
  );
}