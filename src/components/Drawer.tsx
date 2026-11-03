import { useEffect, useRef, type ReactNode } from 'react';

/** Right-hand detail drawer on desktop, full screen on phones. Esc closes; focus moves in and returns. */
export function Drawer({
  open,
  onClose,
  label,
  children,
}: {
  open: boolean;
  onClose: () => void;
  label: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const prev = document.activeElement as HTMLElement | null;
    ref.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      prev?.focus?.();
    };
  }, [open, onClose]);
  if (!open) return null;
  return (
    <>
      <div
        className="fixed inset-0 z-30 bg-black/50 md:bg-black/30"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        ref={ref}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={label}
        className="anim-slide fixed inset-y-0 right-0 z-40 flex w-full flex-col overflow-y-auto border-l border-line bg-surface shadow-2xl md:w-[480px]"
      >
        <div className="sticky top-0 z-10 flex justify-end border-b border-line bg-surface/95 p-2 backdrop-blur">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-3 py-1.5 text-sm text-muted hover:text-ink"
            aria-label="Close details"
          >
            Close ✕
          </button>
        </div>
        {children}
      </div>
    </>
  );
}

/** Bottom sheet used for the filter panel on phones. */
export function BottomSheet({
  open,
  onClose,
  label,
  children,
}: {
  open: boolean;
  onClose: () => void;
  label: string;
  children: ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <>
      <div className="fixed inset-0 z-30 bg-black/60" onClick={onClose} aria-hidden="true" />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={label}
        className="anim-sheet fixed inset-x-0 bottom-0 z-40 max-h-[85vh] overflow-y-auto rounded-t-2xl border-t border-line bg-surface p-4 pb-8"
      >
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-semibold">{label}</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-3 py-1.5 text-sm text-accent-soft"
          >
            Done
          </button>
        </div>
        {children}
      </div>
    </>
  );
}
