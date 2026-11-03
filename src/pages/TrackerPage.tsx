import { useState } from 'react';
import { ArrowUpRight, Plus } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useApp } from '../state/AppState';
import { extractBoard } from '../shared/boards';
import {
  STAGES,
  detectSite,
  newManualItem,
  parseJobLink,
  toCsv,
  type Stage,
  type TrackedItem,
} from '../lib/tracker';
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

function AddFromLink() {
  const { addTracked } = useApp();
  const [url, setUrl] = useState('');
  const [title, setTitle] = useState('');
  const [company, setCompany] = useState('');
  const [location, setLocation] = useState('');
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const site = url ? detectSite(url) : null;
  const board = url ? extractBoard(url) : null;

  const onUrl = (v: string) => {
    setUrl(v);
    const b = extractBoard(v);
    if (b && !company) setCompany(b.slug.replace(/[-_]/g, ' ')); // a guess from the board name; the user can edit it
  };
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const item = newManualItem({ url, title, company, location });
    if (!item)
      return setMsg({
        ok: false,
        text: !parseJobLink(url)
          ? 'Paste a full link starting with https://'
          : 'Title and company are required.',
      });
    addTracked(item);
    setMsg({ ok: true, text: `Saved to Saved: ${item.title} at ${item.company}.` });
    setUrl('');
    setTitle('');
    setCompany('');
    setLocation('');
  };

  return (
    <form
      onSubmit={submit}
      className="rounded-md border border-line bg-surface p-4"
      aria-label="Add from link"
    >
      <h2 className="text-base font-semibold">Add from link</h2>
      <p className="mt-1 text-xs text-muted">
        Found a posting elsewhere (LinkedIn, Handshake, Indeed, a company site)? Paste the link and
        type the title and company. Scoutly never opens or reads the page.
      </p>
      <div className="mt-3 grid gap-3 md:grid-cols-2">
        <div className="md:col-span-2">
          <label htmlFor="al-url" className="mb-1 block text-xs text-muted">
            Job link
          </label>
          <input
            id="al-url"
            type="url"
            inputMode="url"
            className={input}
            placeholder="https://www.linkedin.com/jobs/view/…"
            value={url}
            onChange={(e) => onUrl(e.target.value)}
          />
          {site && (
            <p className="mt-1 font-mono text-xs text-muted" aria-live="polite">
              Detected: {site}
              {board ? ` (board “${board.slug}”)` : ''}
            </p>
          )}
        </div>
        <div>
          <label htmlFor="al-title" className="mb-1 block text-xs text-muted">
            Title
          </label>
          <input
            id="al-title"
            className={input}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>
        <div>
          <label htmlFor="al-company" className="mb-1 block text-xs text-muted">
            Company
          </label>
          <input
            id="al-company"
            className={input}
            value={company}
            onChange={(e) => setCompany(e.target.value)}
          />
        </div>
        <div>
          <label htmlFor="al-loc" className="mb-1 block text-xs text-muted">
            Location (optional)
          </label>
          <input
            id="al-loc"
            className={input}
            value={location}
            onChange={(e) => setLocation(e.target.value)}
          />
        </div>
        <div className="flex items-end">
          <button type="submit" className={btn.primary}>
            <Plus size={16} aria-hidden="true" />
            Add to tracker
          </button>
        </div>
      </div>
      {msg && (
        <p
          className={`mt-3 text-sm ${msg.ok ? 'text-match' : 'text-danger'}`}
          role={msg.ok ? 'status' : 'alert'}
        >
          {msg.text}
        </p>
      )}
    </form>
  );
}

export default function TrackerPage() {
  const { tracker } = useApp();
  return (
    <div className="mx-auto max-w-[1400px] space-y-4 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-semibold">
          Tracker{' '}
          {tracker.length > 0 && (
            <span className="font-mono text-sm font-normal text-muted">{tracker.length} saved</span>
          )}
        </h1>
        {tracker.length > 0 && (
          <button
            type="button"
            className={btn.ghost}
            onClick={() => download('scoutly-tracker.csv', toCsv(tracker))}
          >
            Export CSV
          </button>
        )}
      </div>
      <AddFromLink />
      {tracker.length === 0 ? (
        <EmptyState
          title="Nothing saved yet"
          action={
            <Link to="/search" className={btn.primary}>
              Find internships
            </Link>
          }
        >
          Open any listing and choose “Save to tracker”, or add a link above. Move items through
          Saved, Applied, Interviewing, Offer and Rejected, with notes and follow-up dates.
          Everything stays on this device.
        </EmptyState>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          {STAGES.map((st) => {
            const col = tracker.filter((t) => t.stage === st);
            return (
              <section key={st} aria-label={`${st} column`} className="min-w-0">
                <h2 className="mb-2 flex items-center justify-between font-mono text-xs uppercase tracking-wide text-muted">
                  <span>{st}</span>
                  <span>{col.length}</span>
                </h2>
                <ul className="space-y-3">
                  {col.map((it) => (
                    <Card key={it.listingId} it={it} />
                  ))}
                </ul>
                {col.length === 0 && (
                  <p className="rounded-md border border-dashed border-line p-3 text-xs text-muted">
                    Empty
                  </p>
                )}
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
