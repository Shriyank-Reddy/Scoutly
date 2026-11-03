import { useId, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Check, X } from 'lucide-react';
import { useApp } from '../state/AppState';
import { btn, input } from '../components/ui';
import { CityPicker } from '../components/CityPicker';
import { INTERESTS } from '../shared/interests';
import { cityLabel, findCityByKey } from '../shared/locations';
import { isoToMonth, monthEnd, monthStart } from '../lib/months';
import type { CompanySize } from '../shared/types';

const Section = ({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: ReactNode;
}) => (
  <section className="rounded-md border border-line bg-surface p-4">
    <h2 className="text-base font-semibold">{title}</h2>
    {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
    <div className="mt-3">{children}</div>
  </section>
);

/** A toggle chip: filled accent border when on. Real <button aria-pressed> so it works with keyboard and screen readers. */
export function Toggle({
  on,
  onClick,
  children,
}: {
  on: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      className={`inline-flex h-9 items-center gap-1 rounded border px-3 text-sm ${on ? 'border-accent bg-accent/15 text-ink' : 'border-line text-muted hover:border-muted hover:text-ink'}`}
    >
      {on && <Check size={14} className="text-accent-soft" aria-hidden="true" />}
      {children}
    </button>
  );
}
const toggle = <T,>(list: T[], v: T) =>
  list.includes(v) ? list.filter((x) => x !== v) : [...list, v];

export default function ProfilePage() {
  const { profile, updateProfile, deleteAll } = useApp();
  const [kw, setKw] = useState('');
  const [confirm, setConfirm] = useState(false);
  const [done, setDone] = useState(false);
  const id = useId();
  const addKeyword = () => {
    const k = kw.trim().toLowerCase();
    if (k && !profile.keywords.includes(k)) updateProfile({ keywords: [...profile.keywords, k] });
    setKw('');
  };

  return (
    <div className="mx-auto max-w-3xl space-y-4 p-4 pb-24 md:p-6">
      <header>
        <h1 className="text-xl font-semibold">Preferences</h1>
        <p className="mt-1 text-sm text-muted">
          Everything here feeds your match score, and each listing shows which preferences it meets.{' '}
          <Link to="/" className="text-accent-soft underline underline-offset-4">
            Edit resume details
          </Link>
        </p>
      </header>

      <Section title="Interests" hint="Pick any that apply. Listings matching them rank higher.">
        <div className="flex flex-wrap gap-2" role="group" aria-label="Interests">
          {INTERESTS.map((i) => (
            <Toggle
              key={i.id}
              on={profile.interests.includes(i.id)}
              onClick={() => updateProfile({ interests: toggle(profile.interests, i.id) })}
            >
              {i.label}
            </Toggle>
          ))}
        </div>
        <form
          className="mt-3 flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            addKeyword();
          }}
        >
          <label htmlFor={`${id}-kw`} className="sr-only">
            Add a keyword
          </label>
          <input
            id={`${id}-kw`}
            className={input}
            placeholder="Add keywords, e.g. robotics, fintech, compilers"
            value={kw}
            onChange={(e) => setKw(e.target.value)}
          />
          <button type="submit" className={btn.ghost}>
            Add
          </button>
        </form>
        {profile.keywords.length > 0 && (
          <ul className="mt-2 flex flex-wrap gap-2">
            {profile.keywords.map((k) => (
              <li key={k}>
                <button
                  type="button"
                  aria-label={`Remove keyword ${k}`}
                  onClick={() =>
                    updateProfile({ keywords: profile.keywords.filter((x) => x !== k) })
                  }
                  className="inline-flex h-8 items-center gap-1 rounded border border-line px-2 font-mono text-xs hover:border-muted"
                >
                  {k}
                  <X size={12} aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
        )}
        <label htmlFor={`${id}-roles`} className="mb-1 mt-4 block text-xs text-muted">
          Target roles (comma separated)
        </label>
        <input
          id={`${id}-roles`}
          className={input}
          placeholder="machine learning intern, backend engineer"
          value={profile.targetRoles.join(', ')}
          onChange={(e) =>
            updateProfile({
              targetRoles: e.target.value
                .split(',')
                .map((x) => x.trim())
                .filter(Boolean),
            })
          }
        />
      </Section>

      <Section title="Work mode and pay">
        <fieldset>
          <legend className="mb-2 text-xs text-muted">Work mode (none selected = any)</legend>
          <div className="flex flex-wrap gap-2">
            {(['onsite', 'hybrid', 'remote'] as const).map((m) => (
              <Toggle
                key={m}
                on={profile.workModes.includes(m)}
                onClick={() => updateProfile({ workModes: toggle(profile.workModes, m) })}
              >
                {m === 'onsite' ? 'In person' : m[0].toUpperCase() + m.slice(1)}
              </Toggle>
            ))}
          </div>
        </fieldset>
        <fieldset className="mt-4">
          <legend className="mb-2 text-xs text-muted">Pay</legend>
          <div className="flex flex-wrap gap-2">
            {(
              [
                ['any', 'Either'],
                ['paid', 'Paid'],
                ['unpaid', 'Unpaid ok'],
              ] as const
            ).map(([v, label]) => (
              <Toggle key={v} on={profile.paid === v} onClick={() => updateProfile({ paid: v })}>
                {label}
              </Toggle>
            ))}
          </div>
          <p className="mt-2 text-xs text-muted">
            “Paid” prefers postings that state pay. Many postings do not state it, so those show
            “Pay not stated”.
          </p>
        </fieldset>
      </Section>

      <Section title="Availability" hint="The months you can work, for example May to August 2027.">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor={`${id}-af`} className="mb-1 block text-xs text-muted">
              From
            </label>
            <input
              id={`${id}-af`}
              type="month"
              aria-label="Available from"
              className={`${input} font-mono`}
              placeholder="YYYY-MM"
              value={isoToMonth(profile.availableFrom)}
              onChange={(e) => updateProfile({ availableFrom: monthStart(e.target.value) })}
            />
          </div>
          <div>
            <label htmlFor={`${id}-at`} className="mb-1 block text-xs text-muted">
              Until
            </label>
            <input
              id={`${id}-at`}
              type="month"
              aria-label="Available until"
              className={`${input} font-mono`}
              placeholder="YYYY-MM"
              value={isoToMonth(profile.availableTo)}
              onChange={(e) => updateProfile({ availableTo: monthEnd(e.target.value) })}
            />
          </div>
        </div>
      </Section>

      <Section
        title="Company size"
        hint="Approximate, from a curated list (not stated in postings)."
      >
        <div className="flex flex-wrap gap-2" role="group" aria-label="Company size">
          {(
            [
              ['startup', 'Startup'],
              ['mid', 'Mid-size'],
              ['large', 'Large'],
            ] as [CompanySize, string][]
          ).map(([v, label]) => (
            <Toggle
              key={v}
              on={profile.companySizes.includes(v)}
              onClick={() => updateProfile({ companySizes: toggle(profile.companySizes, v) })}
            >
              {label}
            </Toggle>
          ))}
        </div>
      </Section>

      <Section title="Work authorization">
        <label className="flex items-start gap-3 text-sm">
          <input
            type="checkbox"
            className="mt-0.5 h-4 w-4 accent-[#2a62f5]"
            checked={profile.needsSponsorship}
            onChange={(e) => updateProfile({ needsSponsorship: e.target.checked })}
          />
          <span>
            I need visa sponsorship or CPT/OPT-friendly roles
            <span className="block text-xs text-muted">
              Postings that mention sponsorship, CPT or OPT score higher; ones that mention no
              sponsorship, citizenship or clearance score lower. These are text matches, not legal
              advice.
            </span>
          </span>
        </label>
      </Section>

      <Section
        title="Preferred cities"
        hint="Used for the location part of your score. Pick as many as you like."
      >
        <CityPicker
          label="Add a city"
          onPick={(k) =>
            !profile.locations.includes(k) &&
            updateProfile({ locations: [...profile.locations, k] })
          }
        />
        <ul className="mt-2 flex flex-wrap gap-2">
          {profile.locations.map((k) => (
            <li key={k}>
              <button
                type="button"
                aria-label={`Remove ${k.split('|')[0]}`}
                onClick={() =>
                  updateProfile({ locations: profile.locations.filter((x) => x !== k) })
                }
                className="inline-flex h-8 items-center gap-1 rounded border border-line px-2 font-mono text-xs hover:border-muted"
              >
                {(() => {
                  const c = findCityByKey(k);
                  return c ? cityLabel(c) : k;
                })()}
                <X size={12} aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
        <label htmlFor={`${id}-rad`} className="mt-3 block text-xs text-muted">
          Radius <span className="font-mono">{profile.radiusKm} km</span>
        </label>
        <input
          id={`${id}-rad`}
          type="range"
          min={10}
          max={500}
          step={10}
          value={profile.radiusKm}
          onChange={(e) => updateProfile({ radiusKm: +e.target.value })}
          className="w-full accent-[#2a62f5]"
        />
      </Section>

      <Section
        title="Delete all my data"
        hint="Removes your profile, resume text and tracker from this browser. This cannot be undone."
      >
        {!confirm ? (
          <button
            type="button"
            className={btn.danger}
            onClick={() => {
              setConfirm(true);
              setDone(false);
            }}
          >
            Delete all my data
          </button>
        ) : (
          <div
            className="flex flex-wrap items-center gap-2"
            role="alertdialog"
            aria-label="Confirm delete"
          >
            <span className="text-sm">Really delete everything?</span>
            <button
              type="button"
              className={btn.danger}
              onClick={() => {
                deleteAll();
                setConfirm(false);
                setDone(true);
              }}
            >
              Yes, delete
            </button>
            <button type="button" className={btn.ghost} onClick={() => setConfirm(false)}>
              Cancel
            </button>
          </div>
        )}
        {done && (
          <p className="mt-2 text-sm text-match" role="status">
            All your data was deleted from this browser.
          </p>
        )}
      </Section>
    </div>
  );
}
