import type { Listing } from '../shared/types';
import type { MatchResult } from '../lib/match';
import { WEIGHTS } from '../config/weights';
import { btn, Chip, ModeBadge, ScoreRing, timeAgo } from './ui';
import { termLabel } from './ListingCard';
import { placeLabel } from '../lib/tracker';
import { Check, Minus, X } from 'lucide-react';
import { useApp } from '../state/AppState';

const PART_LABEL = {
  skills: 'Skills',
  role: 'Role & keywords',
  location: 'Location',
  date: 'Dates',
  prefs: 'Preferences',
  recency: 'Recency',
} as const;

export function ListingDetail({
  l,
  match,
  showScore,
}: {
  l: Listing;
  match?: MatchResult;
  showScore: boolean;
}) {
  const { isTracked, track, profile } = useApp();
  const mine = new Set(profile.skills);
  const tracked = isTracked(l.id);
  const term = termLabel(l);
  return (
    <article className="space-y-5 p-5">
      <header className="flex items-start gap-3">
        {showScore && match && <ScoreRing value={match.score} size={64} />}
        <div className="min-w-0">
          <p className="font-mono text-xs text-muted">{l.company}</p>
          <h2 className="text-xl font-semibold leading-snug">{l.title}</h2>
          <p className="mt-1 text-sm text-muted">{placeLabel(l)}</p>
        </div>
      </header>

      <div className="flex flex-wrap gap-1.5">
        <ModeBadge mode={l.workMode} />
        {term ? <Chip tone="blue">{term}</Chip> : <Chip>Dates not stated</Chip>}
        {l.startDate && (
          <Chip>
            {l.startDate}
            {l.endDate ? ` → ${l.endDate}` : ''}
          </Chip>
        )}
        {l.paid === 'paid' && (
          <Chip tone="good">Pay stated{l.payText ? `: ${l.payText}` : ''}</Chip>
        )}
        {l.paid === 'unpaid' && <Chip tone="flag">Mentions: unpaid</Chip>}
        {l.paid === 'unknown' && <Chip>Pay not stated</Chip>}
        <Chip>Posted {timeAgo(l.postedAt)}</Chip>
      </div>

      <div className="flex flex-wrap gap-2">
        <a href={l.url} target="_blank" rel="noopener noreferrer" className={btn.primary}>
          Apply on company site ↗
        </a>
        <button type="button" onClick={() => track(l)} disabled={tracked} className={btn.ghost}>
          {tracked ? '✓ In tracker' : 'Save to tracker'}
        </button>
      </div>

      {l.authFlags.length > 0 && (
        <section
          aria-label="Work authorization text"
          className="rounded-xl border border-flag/40 bg-flag/5 p-3"
        >
          <h3 className="text-sm font-semibold text-flag">Work-authorization text found</h3>
          <ul className="mt-2 space-y-1 text-sm">
            {l.authFlags.map((f) => (
              <li key={f.id}>
                <span className="font-medium">Mentions: {f.label}</span>{' '}
                <span className="text-muted">— “{f.match}”</span>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-muted">
            These are text matches in the posting, not a legal determination. Read the full posting
            and ask the employer.
          </p>
        </section>
      )}

      {showScore && match && (
        <section aria-label="Why it matched">
          <h3 className="mb-2 text-sm font-semibold">Why it matched</h3>
          <div className="mb-3 flex flex-wrap gap-1.5">
            {match.reasons.map((r) => (
              <Chip key={r.text} tone={r.good ? 'good' : 'plain'}>
                {r.text}
              </Chip>
            ))}
          </div>
          <ul className="space-y-1.5">
            {(Object.keys(PART_LABEL) as (keyof typeof PART_LABEL)[]).map((k) => (
              <li key={k} className="grid grid-cols-[110px_1fr_40px] items-center gap-2 text-xs">
                <span className="text-muted">
                  {PART_LABEL[k]} <span className="font-mono">×{WEIGHTS[k]}</span>
                </span>
                <span className="h-1.5 overflow-hidden rounded-full bg-line">
                  <span
                    className="block h-full rounded-full bg-accent-soft"
                    style={{
                      width: `${Math.round(match.parts[k] * 100)}%`,
                      transition: 'width 500ms ease-out',
                    }}
                  />
                </span>
                <span className="text-right font-mono">{Math.round(match.parts[k] * 100)}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {showScore && match && match.checks.length > 0 && (
        <section aria-label="Your preferences">
          <h3 className="mb-2 text-sm font-semibold">Your preferences</h3>
          <ul className="space-y-1 text-sm">
            {match.checks.map((c) => (
              <li key={c.key} className="flex items-center gap-2">
                {c.state === 'match' ? (
                  <Check size={14} className="shrink-0 text-match" aria-label="matches" />
                ) : c.state === 'miss' ? (
                  <X size={14} className="shrink-0 text-flag" aria-label="does not match" />
                ) : (
                  <Minus size={14} className="shrink-0 text-muted" aria-label="unknown" />
                )}
                <span className={c.state === 'match' ? '' : 'text-muted'}>{c.label}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {l.skills.length > 0 && (
        <section aria-label="Skills mentioned">
          <h3 className="mb-2 text-sm font-semibold">Skills mentioned</h3>
          <div className="flex flex-wrap gap-1.5">
            {l.skills.map((s) => (
              <Chip key={s} tone={mine.has(s) ? 'good' : 'plain'}>
                {s}
              </Chip>
            ))}
          </div>
        </section>
      )}

      <section aria-label="Snippet">
        <h3 className="mb-1 text-sm font-semibold">Snippet</h3>
        <p className="text-sm leading-relaxed text-muted">{l.snippet}</p>
        <p className="mt-2 text-xs text-muted">
          Short excerpt only. The full description is on the original posting ({l.source}).
        </p>
      </section>
    </article>
  );
}
