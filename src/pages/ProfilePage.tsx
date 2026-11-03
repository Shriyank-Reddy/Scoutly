import { useId, useRef, useState } from 'react';
import { useApp } from '../state/AppState';
import { btn, Chip, input } from '../components/ui';
import { CityPicker } from '../components/CityPicker';
import { parseResumeText, readResumeFile } from '../lib/resume';
import { ALL_SKILL_NAMES, canonicalSkill } from '../shared/skills';
import { cityLabel, findCityByKey } from '../shared/locations';

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section className="rounded-2xl border border-line bg-surface p-5">
    <h2 className="mb-3 text-base font-semibold">{title}</h2>
    {children}
  </section>
);

export default function ProfilePage() {
  const { profile, updateProfile, deleteAll } = useApp();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [paste, setPaste] = useState('');
  const [skillText, setSkillText] = useState('');
  const [confirm, setConfirm] = useState(false);
  const file = useRef<HTMLInputElement>(null);
  const id = useId();

  const applyText = (text: string) => {
    const r = parseResumeText(text);
    const grad = r.education.find((e) => e.gradYear)?.gradYear ?? null;
    updateProfile({
      ...r,
      skills: [...new Set([...profile.skills, ...r.skills])],
      name: r.name || profile.name,
    });
    setMsg(
      `Found ${r.skills.length} skills, ${r.education.length} education entr${r.education.length === 1 ? 'y' : 'ies'}${grad ? `, graduation ${grad}` : ''}. Review and edit below.`,
    );
  };
  const onFile = async (f?: File | null) => {
    if (!f) return;
    setBusy(true);
    setMsg(null);
    try {
      applyText(await readResumeFile(f));
    } catch {
      setMsg('Could not read that file. Try pasting the text instead.');
    } finally {
      setBusy(false);
    }
  };
  const addSkill = () => {
    const s = canonicalSkill(skillText) ?? skillText.trim();
    if (s && !profile.skills.includes(s)) updateProfile({ skills: [...profile.skills, s] });
    setSkillText('');
  };
  const toggleMode = (m: 'remote' | 'hybrid' | 'onsite') =>
    updateProfile({
      workModes: profile.workModes.includes(m)
        ? profile.workModes.filter((x) => x !== m)
        : [...profile.workModes, m],
    });

  return (
    <div className="mx-auto max-w-3xl space-y-5 overflow-y-auto p-4 pb-24">
      <h1 className="text-2xl font-bold">Your profile</h1>
      <p className="rounded-xl border border-match/40 bg-match/5 p-4 text-sm" role="note">
        <strong className="text-match">Private by design.</strong> Your resume is read inside this
        browser tab and never uploaded. Your profile and tracker are stored only on this device
        (localStorage). There are no accounts, no analytics and no trackers. “Delete all my data”
        below erases everything.
      </p>

      <Section title="1. Resume">
        <div className="flex flex-wrap items-center gap-3">
          <input
            ref={file}
            id={`${id}-f`}
            type="file"
            accept=".pdf,.docx,.txt,application/pdf"
            className="sr-only"
            onChange={(e) => onFile(e.target.files?.[0])}
          />
          <button
            type="button"
            className={btn.primary}
            onClick={() => file.current?.click()}
            disabled={busy}
          >
            {busy ? 'Reading…' : 'Upload PDF or DOCX'}
          </button>
          <span className="text-sm text-muted">or paste the text:</span>
        </div>
        <label htmlFor={`${id}-p`} className="sr-only">
          Paste resume text
        </label>
        <textarea
          id={`${id}-p`}
          className={`${input} mt-3 h-28 font-mono text-xs`}
          placeholder="Paste your resume text here…"
          value={paste}
          onChange={(e) => setPaste(e.target.value)}
        />
        <button
          type="button"
          className={`${btn.ghost} mt-2`}
          disabled={!paste.trim()}
          onClick={() => {
            applyText(paste);
            setPaste('');
          }}
        >
          Extract from pasted text
        </button>
        {msg && (
          <p className="mt-3 text-sm text-accent-soft" role="status">
            {msg}
          </p>
        )}
      </Section>

      <Section title="2. Profile (editable)">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor={`${id}-n`} className="mb-1 block text-xs text-muted">
              Name
            </label>
            <input
              id={`${id}-n`}
              className={input}
              value={profile.name}
              onChange={(e) => updateProfile({ name: e.target.value })}
            />
          </div>
          <div>
            <label htmlFor={`${id}-g`} className="mb-1 block text-xs text-muted">
              Graduation year
            </label>
            <input
              id={`${id}-g`}
              type="number"
              className={input}
              value={profile.education[0]?.gradYear ?? ''}
              onChange={(e) => {
                const e0 = profile.education[0] ?? { school: '', degree: '', gradYear: null };
                updateProfile({
                  education: [
                    { ...e0, gradYear: e.target.value ? +e.target.value : null },
                    ...profile.education.slice(1),
                  ],
                });
              }}
            />
          </div>
          <div className="sm:col-span-2">
            <label htmlFor={`${id}-s`} className="mb-1 block text-xs text-muted">
              School and degree
            </label>
            <input
              id={`${id}-s`}
              className={input}
              value={
                profile.education[0]
                  ? `${profile.education[0].school}${profile.education[0].degree ? ' — ' + profile.education[0].degree : ''}`
                  : ''
              }
              onChange={(e) => {
                const [school, degree = ''] = e.target.value.split(' — ');
                const e0 = profile.education[0] ?? { school: '', degree: '', gradYear: null };
                updateProfile({
                  education: [{ ...e0, school, degree }, ...profile.education.slice(1)],
                });
              }}
              placeholder="Arizona State University — B.S. Computer Science"
            />
          </div>
        </div>
        <div className="mt-4">
          <p className="mb-1 text-xs text-muted">
            Skills ({profile.skills.length}). Aliases like “JS” become “JavaScript”.
          </p>
          <ul className="flex flex-wrap gap-1.5">
            {profile.skills.map((s) => (
              <li key={s}>
                <button
                  type="button"
                  aria-label={`Remove skill ${s}`}
                  onClick={() => updateProfile({ skills: profile.skills.filter((x) => x !== s) })}
                  className="rounded-full"
                >
                  <Chip tone="blue">{s} ✕</Chip>
                </button>
              </li>
            ))}
            {profile.skills.length === 0 && (
              <li className="text-sm text-muted">None yet. Upload a resume or add skills below.</li>
            )}
          </ul>
          <form
            className="mt-2 flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              addSkill();
            }}
          >
            <label htmlFor={`${id}-sk`} className="sr-only">
              Add a skill
            </label>
            <input
              id={`${id}-sk`}
              list={`${id}-sl`}
              className={input}
              placeholder="Add a skill…"
              value={skillText}
              onChange={(e) => setSkillText(e.target.value)}
            />
            <datalist id={`${id}-sl`}>
              {ALL_SKILL_NAMES.map((s) => (
                <option key={s} value={s} />
              ))}
            </datalist>
            <button className={btn.ghost} type="submit">
              Add
            </button>
          </form>
        </div>
        {profile.links.length > 0 && (
          <p className="mt-4 break-words text-sm text-muted">
            Links found: {profile.links.join(' · ')}
          </p>
        )}
      </Section>

      <Section title="3. Preferences">
        <div className="space-y-4">
          <div>
            <label htmlFor={`${id}-r`} className="mb-1 block text-xs text-muted">
              Target roles (comma separated)
            </label>
            <input
              id={`${id}-r`}
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
          </div>
          <div>
            <CityPicker
              label="Preferred cities"
              onPick={(k) =>
                !profile.locations.includes(k) &&
                updateProfile({ locations: [...profile.locations, k] })
              }
            />
            <ul className="mt-2 flex flex-wrap gap-1.5">
              {profile.locations.map((k) => (
                <li key={k}>
                  <button
                    type="button"
                    aria-label={`Remove ${k.split('|')[0]}`}
                    onClick={() =>
                      updateProfile({ locations: profile.locations.filter((x) => x !== k) })
                    }
                  >
                    <Chip tone="blue">
                      {(() => {
                        const c = findCityByKey(k);
                        return c ? cityLabel(c) : k;
                      })()}{' '}
                      ✕
                    </Chip>
                  </button>
                </li>
              ))}
            </ul>
            <label htmlFor={`${id}-rad`} className="mt-3 block text-xs text-muted">
              Commute radius <span className="font-mono">{profile.radiusKm} km</span>
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
          </div>
          <fieldset>
            <legend className="mb-1 text-xs text-muted">Work mode (none ticked = any)</legend>
            <div className="flex flex-wrap gap-4">
              {(['onsite', 'hybrid', 'remote'] as const).map((m) => (
                <label key={m} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    className="h-4 w-4 accent-[#2a62f5]"
                    checked={profile.workModes.includes(m)}
                    onChange={() => toggleMode(m)}
                  />
                  {m === 'onsite' ? 'In person' : m[0].toUpperCase() + m.slice(1)}
                </label>
              ))}
            </div>
          </fieldset>
          <fieldset>
            <legend className="mb-1 text-xs text-muted">
              Availability window (e.g. May to August 2027)
            </legend>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor={`${id}-af`} className="sr-only">
                  Available from
                </label>
                <input
                  id={`${id}-af`}
                  type="date"
                  className={input}
                  value={profile.availableFrom ?? ''}
                  onChange={(e) => updateProfile({ availableFrom: e.target.value || null })}
                />
              </div>
              <div>
                <label htmlFor={`${id}-at`} className="sr-only">
                  Available until
                </label>
                <input
                  id={`${id}-at`}
                  type="date"
                  className={input}
                  value={profile.availableTo ?? ''}
                  onChange={(e) => updateProfile({ availableTo: e.target.value || null })}
                />
              </div>
            </div>
          </fieldset>
          <div className="flex flex-wrap gap-6">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                className="h-4 w-4 accent-[#2a62f5]"
                checked={profile.paid === 'paid'}
                onChange={(e) => updateProfile({ paid: e.target.checked ? 'paid' : 'any' })}
              />
              Paid roles only
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                className="h-4 w-4 accent-[#2a62f5]"
                checked={profile.needsSponsorship}
                onChange={(e) => updateProfile({ needsSponsorship: e.target.checked })}
              />
              I need visa sponsorship / work-authorization-friendly roles
            </label>
          </div>
        </div>
      </Section>

      <Section title="Delete all my data">
        <p className="mb-3 text-sm text-muted">
          Removes your profile, resume text and tracker from this browser. This cannot be undone.
        </p>
        {!confirm ? (
          <button type="button" className={btn.danger} onClick={() => setConfirm(true)}>
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
                setMsg('All your data was deleted from this browser.');
              }}
            >
              Yes, delete
            </button>
            <button type="button" className={btn.ghost} onClick={() => setConfirm(false)}>
              Cancel
            </button>
          </div>
        )}
      </Section>
    </div>
  );
}
