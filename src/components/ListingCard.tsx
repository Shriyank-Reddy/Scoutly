import type { Listing } from '../shared/types';
import type { MatchResult } from '../lib/match';
import { Chip, ModeBadge, ScoreRing, timeAgo } from './ui';
import { placeLabel } from '../lib/tracker';

const monthYear = (iso: string) =>
  new Date(iso + 'T00:00:00Z').toLocaleString('en-US', {
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  });

export function termLabel(l: Listing): string | null {
  const bits: string[] = [];
  if (l.season)
    bits.push(
      `${l.season[0].toUpperCase()}${l.season.slice(1)}${l.seasonYear ? ' ' + l.seasonYear : ''}`,
    );
  if (!l.season && l.startDate)
    bits.push(`Starts ${monthYear(l.startDate)}${l.endDate ? ' – ' + monthYear(l.endDate) : ''}`);
  if (l.engagement.includes('co-op')) bits.push('Co-op');
  if (l.engagement.includes('part-time')) bits.push('Part-time');
  return bits.length ? bits.join(' · ') : null;
}

export function ListingCard({
  l,
  match,
  selected,
  onSelect,
  showScore,
}: {
  l: Listing;
  match?: MatchResult;
  selected: boolean;
  onSelect: () => void;
  showScore: boolean;
}) {
  const term = termLabel(l);
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={`group flex h-26 w-full gap-3 rounded-md border p-3 text-left hover:border-muted ${selected ? 'border-accent bg-surface-2' : 'border-line bg-surface'}`}
    >
      {showScore && match && <ScoreRing value={match.score} />}
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <h2 className="truncate text-sm font-semibold">{l.title}</h2>
          <span className="shrink-0 font-mono text-xs text-muted">{timeAgo(l.postedAt)}</span>
        </div>
        <p className="truncate text-sm text-muted">
          {l.company} <span className="font-mono text-xs">· {placeLabel(l)}</span>
        </p>
        <div className="mt-2 flex h-6 items-start gap-2 overflow-hidden">
          <ModeBadge mode={l.workMode} />
          {l.via && <Chip>via {l.via}</Chip>}
          {term ? <Chip tone="strong">{term}</Chip> : <Chip>Dates not stated</Chip>}
          {l.authFlags.length > 0 && (
            <Chip tone="flag">
              Mentions: {l.authFlags[0].label}
              {l.authFlags.length > 1 ? ` +${l.authFlags.length - 1}` : ''}
            </Chip>
          )}
          {showScore &&
            match?.reasons
              .filter((r) => r.good && r.kind !== 'recency')
              .slice(0, 2)
              .map((r) => (
                <span key={r.text} className="hidden sm:contents">
                  <Chip tone="good">{r.text}</Chip>
                </span>
              ))}
        </div>
      </div>
    </button>
  );
}
