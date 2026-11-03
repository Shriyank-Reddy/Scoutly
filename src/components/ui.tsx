import { useEffect, useState, type ReactNode } from 'react';
import { Compass } from 'lucide-react';
import type { WorkMode } from '../shared/types';

// Buttons: accent is reserved for the one primary action; everything else is a 1px outline.
export const btn = {
  primary:
    'inline-flex min-h-11 items-center justify-center gap-2 rounded bg-accent px-4 text-sm font-medium text-white hover:bg-accent-hover disabled:opacity-50 md:min-h-9',
  ghost:
    'inline-flex min-h-11 items-center justify-center gap-2 rounded border border-line px-3 text-sm text-ink hover:border-muted disabled:opacity-50 md:min-h-9',
  danger:
    'inline-flex min-h-11 items-center justify-center gap-2 rounded border border-danger/50 px-3 text-sm text-danger hover:bg-danger/10 md:min-h-9',
};
export const input =
  'w-full min-h-11 rounded border border-line bg-bg px-3 text-sm text-ink placeholder:text-muted hover:border-muted md:min-h-9';

export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`skeleton ${className}`} aria-hidden="true" />;
}

/** Same geometry as a real result card (h-26, 12px gap) so nothing shifts when data arrives. */
export function ListSkeleton() {
  return (
    <div className="space-y-3 p-3" role="status" aria-label="Loading listings">
      {Array.from({ length: 7 }, (_, i) => (
        <div
          key={i}
          className="flex h-26 items-center gap-3 rounded-md border border-line bg-surface p-3"
        >
          <div
            className="skeleton h-12 w-12 shrink-0"
            style={{ borderRadius: '50%' }}
            aria-hidden="true"
          />
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-3 w-1/2" />
            <Skeleton className="h-6 w-3/4" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function Chip({
  children,
  tone = 'plain',
  title,
}: {
  children: ReactNode;
  tone?: 'plain' | 'good' | 'flag' | 'strong' | 'new';
  title?: string;
}) {
  const tones = {
    plain: 'border-line text-muted',
    strong: 'border-line text-ink',
    good: 'border-match/40 text-match',
    flag: 'border-flag/50 text-flag',
    new: 'border-accent text-accent-soft',
  };
  return (
    <span
      title={title}
      className={`inline-flex h-6 shrink-0 items-center whitespace-nowrap rounded-sm border px-2 font-mono text-xs ${tones[tone]}`}
    >
      {children}
    </span>
  );
}

const MODE_LABEL: Record<WorkMode, string> = {
  onsite: 'In person',
  hybrid: 'Hybrid',
  remote: 'Remote',
  unknown: 'Mode not stated',
};
export const ModeBadge = ({ mode }: { mode: WorkMode }) => (
  <Chip tone={mode === 'unknown' ? 'plain' : 'strong'}>{MODE_LABEL[mode]}</Chip>
);
export const modeLabel = (m: WorkMode) => MODE_LABEL[m];

/** Animated circular match score: the one place the accent colour is used for data. Fills from 0 on mount. */
export function ScoreRing({ value, size = 48 }: { value: number; size?: number }) {
  const [shown, setShown] = useState(0);
  useEffect(() => {
    const id = requestAnimationFrame(() => setShown(value));
    return () => cancelAnimationFrame(id);
  }, [value]);
  const r = (size - 6) / 2,
    c = 2 * Math.PI * r,
    pct = Math.round(value * 100);
  return (
    <div
      className="relative shrink-0"
      style={{ width: size, height: size }}
      role="img"
      aria-label={`Match score ${pct} percent`}
    >
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--color-line)"
          strokeWidth="3"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={value >= 0.45 ? 'var(--color-accent-hover)' : 'var(--color-muted)'}
          strokeWidth="3"
          strokeLinecap="butt"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - shown)}
          style={{ transition: 'stroke-dashoffset 600ms ease-out' }}
        />
      </svg>
      <span className="absolute inset-0 grid place-items-center font-mono text-xs font-medium">
        {pct}
      </span>
    </div>
  );
}

export function EmptyState({
  title,
  children,
  action,
}: {
  title: string;
  children?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="max-w-md px-4 py-12 md:px-6">
      <Compass size={24} className="mb-3 text-muted" aria-hidden="true" />
      <h2 className="text-base font-semibold">{title}</h2>
      <p className="mt-1 text-sm text-muted">{children}</p>
      {action && <div className="mt-4 flex">{action}</div>}
    </div>
  );
}

export function timeAgo(iso: string | null, now = Date.now()): string {
  if (!iso) return 'date not stated';
  const d = Math.floor((now - Date.parse(iso)) / 864e5);
  return d <= 0
    ? 'today'
    : d === 1
      ? '1d ago'
      : d < 60
        ? `${d}d ago`
        : `${Math.round(d / 30)}mo ago`;
}
