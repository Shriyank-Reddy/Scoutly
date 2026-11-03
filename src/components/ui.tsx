import { useEffect, useState, type ReactNode } from 'react';
import type { WorkMode } from '../shared/types';

export const btn = {
  primary:
    'inline-flex items-center justify-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover active:scale-[0.98] disabled:opacity-50',
  ghost:
    'inline-flex items-center justify-center gap-2 rounded-lg border border-line bg-surface-2 px-3 py-2 text-sm text-ink hover:border-accent-soft active:scale-[0.98]',
  danger:
    'inline-flex items-center justify-center gap-2 rounded-lg border border-danger/50 px-3 py-2 text-sm text-danger hover:bg-danger/10',
};
export const input =
  'w-full rounded-lg border border-line bg-surface-2 px-3 py-2 text-sm text-ink placeholder:text-muted hover:border-accent-soft/60';

export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`skeleton ${className}`} aria-hidden="true" />;
}

export function ListSkeleton() {
  return (
    <div className="space-y-3 p-3" role="status" aria-label="Loading listings">
      {Array.from({ length: 6 }, (_, i) => (
        <Skeleton key={i} className="h-28" />
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
  tone?: 'plain' | 'good' | 'flag' | 'blue';
  title?: string;
}) {
  const tones = {
    plain: 'border-line text-muted',
    good: 'border-match/40 bg-match/10 text-match',
    flag: 'border-flag/40 bg-flag/10 text-flag',
    blue: 'border-accent-soft/30 bg-accent/10 text-accent-soft',
  };
  return (
    <span
      title={title}
      className={`inline-flex shrink-0 items-center whitespace-nowrap rounded-full border px-2 py-0.5 font-mono text-[11px] leading-5 ${tones[tone]}`}
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
  <Chip tone={mode === 'unknown' ? 'plain' : 'blue'}>{MODE_LABEL[mode]}</Chip>
);
export const modeLabel = (m: WorkMode) => MODE_LABEL[m];

/** Animated circular score. The ring fills from 0 on mount (CSS transition; disabled for reduced-motion). */
export function ScoreRing({ value, size = 52 }: { value: number; size?: number }) {
  const [shown, setShown] = useState(0);
  useEffect(() => {
    const id = requestAnimationFrame(() => setShown(value));
    return () => cancelAnimationFrame(id);
  }, [value]);
  const r = (size - 6) / 2,
    c = 2 * Math.PI * r,
    pct = Math.round(value * 100);
  const color =
    value >= 0.7
      ? 'var(--color-match)'
      : value >= 0.45
        ? 'var(--color-accent-soft)'
        : 'var(--color-muted)';
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
          strokeWidth="4"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - shown)}
          style={{ transition: 'stroke-dashoffset 700ms ease-out' }}
        />
      </svg>
      <span className="absolute inset-0 grid place-items-center font-mono text-xs font-medium">
        {pct}%
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
    <div className="mx-auto max-w-md px-6 py-16 text-center">
      <div
        className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-2xl bg-accent/15 text-accent-soft"
        aria-hidden="true"
      >
        ✦
      </div>
      <h2 className="text-lg font-semibold">{title}</h2>
      <p className="mt-2 text-sm text-muted">{children}</p>
      {action && <div className="mt-5 flex justify-center">{action}</div>}
    </div>
  );
}

export function timeAgo(iso: string | null, now = Date.now()): string {
  if (!iso) return 'date not stated';
  const d = Math.floor((now - Date.parse(iso)) / 864e5);
  return d <= 0
    ? 'today'
    : d === 1
      ? '1 day ago'
      : d < 60
        ? `${d} days ago`
        : `${Math.round(d / 30)} months ago`;
}
