import { ArrowUpRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useApp } from '../state/AppState';
import { STAGES, toCsv, type Stage, type TrackedItem } from '../lib/tracker';
import { btn, Chip, EmptyState, input } from '../components/ui';

function download(name: string, text: string) {
  const url = URL.createObjectURL(new Blob([text], { type: 'text/csv;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

function Card({ it }: { it: TrackedItem }) {
  const { updateTracked, untrack } = useApp();
  const overdue =
    it.followUp &&
    it.stage !== 'Offer' &&
    it.stage !== 'Rejected' &&
    it.followUp < new Date().toISOString().slice(0, 10);
  const k = it.listingId;
  return (
    <li className="space-y-2 rounded-md border border-line bg-surface p-3">
      <div>
        <a
          href={it.url}
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium hover:text-accent-soft"
        >
          {it.title} <ArrowUpRight size={14} className="inline" aria-hidden="true" />
        </a>
        <p className="text-sm text-muted">
          {it.company} · {it.location}
        </p>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label htmlFor={`st-${k}`} className="block text-xs text-muted">
            Stage
          </label>
          <select
            id={`st-${k}`}
            className={input}
            value={it.stage}
            onChange={(e) => updateTracked(k, { stage: e.target.value as Stage })}
          >
            {STAGES.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor={`fu-${k}`} className="block text-xs text-muted">
            Follow up
          </label>
          <input
            id={`fu-${k}`}
            type="date"
            className={input}
            value={it.followUp}
            onChange={(e) => updateTracked(k, { followUp: e.target.value })}
          />
        </div>
      </div>
      {overdue && <Chip tone="flag">Follow-up overdue</Chip>}
      <label htmlFor={`nt-${k}`} className="sr-only">
        Notes
      </label>
      <textarea
        id={`nt-${k}`}
        className={`${input} h-16 text-xs`}
        placeholder="Notes…"
        value={it.notes}
        onChange={(e) => updateTracked(k, { notes: e.target.value })}
      />
      <button
        type="button"
        className="text-xs text-danger hover:underline"
        onClick={() => untrack(k)}
      >
        Remove
      </button>
    </li>
  );
}

export default function TrackerPage() {
  const { tracker } = useApp();
  if (tracker.length === 0)
    return (
      <EmptyState
        title="Nothing saved yet"
        action={
          <Link to="/search" className={btn.primary}>
            Find internships
          </Link>
        }
      >
        Open any listing and choose “Save to tracker”. Move it through Saved, Applied, Interviewing,
        Offer and Rejected, with notes and follow-up dates. Everything stays on this device.
      </EmptyState>
    );
  return (
    <div className="mx-auto max-w-[1400px] space-y-4 overflow-y-auto p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-bold">
          Tracker <span className="font-mono text-sm text-muted">{tracker.length} saved</span>
        </h1>
        <button
          type="button"
          className={btn.ghost}
          onClick={() => download('scoutly-tracker.csv', toCsv(tracker))}
        >
          Export CSV
        </button>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {STAGES.map((s) => {
          const col = tracker.filter((t) => t.stage === s);
          return (
            <section key={s} aria-label={`${s} column`} className="min-w-0 rounded-md bg-bg/60">
              <h2 className="mb-2 flex items-center justify-between font-mono text-xs uppercase tracking-wide text-muted">
                <span>{s}</span>
                <span>{col.length}</span>
              </h2>
              <ul className="space-y-3">
                {col.map((it) => (
                  <Card key={it.listingId} it={it} />
                ))}
              </ul>
              {col.length === 0 && (
                <p className="rounded-md border border-dashed border-line p-3 text-center text-xs text-muted">
                  Empty
                </p>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}
