import React from "react";

export function Badge({ className = "", children }: { className?: string; children: React.ReactNode }) {
  return (
    <span
      className={`inline-flex items-center rounded px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${className}`}
    >
      {children}
    </span>
  );
}

export function Spinner() {
  return (
    <div className="flex h-full w-full items-center justify-center p-10 text-text-mute">
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-line border-t-ink" />
    </div>
  );
}

export function Modal({
  title,
  onClose,
  children,
  wide
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  wide?: boolean;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/50 p-4"
      onClick={onClose}
    >
      <div
        className={`card w-full ${wide ? "max-w-2xl" : "max-w-md"} p-6`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold">{title}</h2>
          <button onClick={onClose} className="text-lg text-text-mute hover:text-text" aria-label="Close">
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function ErrorText({ message }: { message?: string }) {
  if (!message) return null;
  return <div className="rounded bg-red-50 px-3 py-2 text-sm text-accent-reject">{message}</div>;
}

export function EmptyState({ children }: { children: React.ReactNode }) {
  return <div className="rounded border border-dashed border-line p-8 text-center text-sm text-text-mute">{children}</div>;
}
