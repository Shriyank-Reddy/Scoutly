import { useRef, useState } from 'react';
import { FileText, Lock, Plus, Upload, X } from 'lucide-react';
import { useApp } from '../state/AppState';
import { btn, input } from './ui';
import { parseResumeText, readResumeFile, validateResumeFile } from '../lib/resume';
import { ALL_SKILL_NAMES, canonicalSkill } from '../shared/skills';

type Phase =
  | { kind: 'idle' }
  | { kind: 'reading'; pct: number; label: string; file: string }
  | { kind: 'error'; msg: string };

/** Drop zone + progress + editable summary of what was extracted. Everything happens in this tab. */
export function ResumeIntake() {
  const { profile, updateProfile } = useApp();
  const [phase, setPhase] = useState<Phase>({ kind: 'idle' });
  const [drag, setDrag] = useState(false);
  const [pasting, setPasting] = useState(false);
  const [paste, setPaste] = useState('');
  const [skillText, setSkillText] = useState('');
  const [found, setFound] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const hasSummary = profile.resumeText !== '' || profile.skills.length > 0 || profile.name !== '';

  const apply = (text: string) => {
    const r = parseResumeText(text);
    if (!r.skills.length && !r.education.length && !r.name) {
      setPhase({
        kind: 'error',
        msg: 'We could not find a name, skills or education in that text. Check the file, or add details by hand below.',
      });
      updateProfile({ resumeText: text.slice(0, 20000) });
      return;
    }
    updateProfile({
      ...r,
      name: r.name || profile.name,
      skills: [...new Set([...profile.skills, ...r.skills])],
    });
    setFound(
      `Extracted ${r.skills.length} skills${r.education[0]?.gradYear ? `, graduation ${r.education[0].gradYear}` : ''}.`,
    );
    setPhase({ kind: 'idle' });
  };

  const handleFile = async (f?: File | null) => {
    if (!f) return;
    const problem = validateResumeFile(f);
    if (problem) return setPhase({ kind: 'error', msg: problem });
    setFound(null);
    setPhase({ kind: 'reading', pct: 5, label: 'Starting', file: f.name });
    try {
      const text = await readResumeFile(f, (pct, label) =>
        setPhase({ kind: 'reading', pct, label, file: f.name }),
      );
      setPhase({
        kind: 'reading',
        pct: 95,
        label: 'Finding skills, school and links',
        file: f.name,
      });
      await new Promise((r) => setTimeout(r, 0)); // let the browser paint the last step
      apply(text);
    } catch {
      setPhase({
        kind: 'error',
        msg: 'Could not read that file. It may be scanned or protected. Try pasting the text instead.',
      });
    }
  };

  const edu = profile.education[0] ?? { school: '', degree: '', gradYear: null };
  const setEdu = (patch: Partial<typeof edu>) =>
    updateProfile({ education: [{ ...edu, ...patch }, ...profile.education.slice(1)] });
  const addSkill = () => {
    const s = canonicalSkill(skillText) ?? skillText.trim();
    if (s && !profile.skills.includes(s)) updateProfile({ skills: [...profile.skills, s] });
    setSkillText('');
  };

  return (
    <div className="space-y-4">
      <div
        role="button"
        tabIndex={0}
        aria-label="Drop your resume here, or press Enter to choose a file"
        onClick={() => fileRef.current?.click()}
        onKeyDown={(e) =>
          (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), fileRef.current?.click())
        }
        onDragOver={(e) => {
          e.preventDefault();
          setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDrag(false);
          void handleFile(e.dataTransfer.files[0]);
        }}
        className={`flex min-h-48 cursor-pointer flex-col items-start justify-center gap-3 rounded-md border border-dashed p-6 ${drag ? 'border-accent bg-accent/10' : 'border-line bg-surface hover:border-muted'}`}
      >
        <Upload size={24} className="text-accent-soft" aria-hidden="true" />
        <div>
          <p className="text-xl font-semibold">Drop your resume (PDF or DOCX)</p>
          <p className="mt-1 text-sm text-muted">or click to browse. Up to 5 MB.</p>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept=".pdf,.docx,.txt,application/pdf"
          className="sr-only"
          tabIndex={-1}
          onChange={(e) => {
            void handleFile(e.target.files?.[0]);
            e.target.value = '';
          }}
        />
      </div>

      <p className="flex items-center gap-2 text-sm text-muted">
        <Lock size={16} className="shrink-0 text-match" aria-hidden="true" />
        <span>
          <strong className="font-medium text-ink">Your resume stays in your browser.</strong> It is
          never uploaded, and there are no accounts or trackers.
        </span>
      </p>

      <div>
        <button
          type="button"
          className="text-sm text-accent-soft underline underline-offset-4"
          aria-expanded={pasting}
          onClick={() => setPasting((v) => !v)}
        >
          {pasting ? 'Hide pasted text' : 'Paste text instead'}
        </button>
        {pasting && (
          <div className="mt-2 space-y-2">
            <label htmlFor="resume-paste" className="sr-only">
              Paste resume text
            </label>
            <textarea
              id="resume-paste"
              className={`${input} h-32 font-mono text-xs`}
              placeholder="Paste your resume text here…"
              value={paste}
              onChange={(e) => setPaste(e.target.value)}
            />
            <button
              type="button"
              className={btn.ghost}
              disabled={!paste.trim()}
              onClick={() => {
                apply(paste);
                setPaste('');
                setPasting(false);
              }}
            >
              Extract from pasted text
            </button>
          </div>
        )}
      </div>

      <div aria-live="polite">
        {phase.kind === 'reading' && (
          <div className="rounded-md border border-line bg-surface p-4" role="status">
            <div className="mb-2 flex items-center justify-between text-sm">
              <span className="flex items-center gap-2">
                <FileText size={16} aria-hidden="true" />
                {phase.file}
              </span>
              <span className="font-mono text-xs text-muted">{phase.pct}%</span>
            </div>
            <div className="h-1 overflow-hidden rounded-sm bg-line">
              <div
                className="h-full bg-accent"
                style={{ width: `${phase.pct}%`, transition: 'width 180ms ease-out' }}
              />
            </div>
            <p className="mt-2 text-xs text-muted">{phase.label}</p>
          </div>
        )}
        {phase.kind === 'error' && (
          <p className="rounded-md border border-danger/50 p-3 text-sm text-danger" role="alert">
            {phase.msg}
          </p>
        )}
        {found && phase.kind === 'idle' && (
          <p className="text-sm text-match" role="status">
            {found} Review it below.
          </p>
        )}
      </div>

      {hasSummary && (
        <section
          aria-label="Extracted profile"
          className="space-y-4 rounded-md border border-line bg-surface p-4"
        >
          <h2 className="text-base font-semibold">
            What we found <span className="font-normal text-muted">(edit anything)</span>
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Name" value={profile.name} onChange={(v) => updateProfile({ name: v })} />
            <Field
              label="Graduation year"
              value={edu.gradYear?.toString() ?? ''}
              inputMode="numeric"
              onChange={(v) => setEdu({ gradYear: /^\d{4}$/.test(v) ? +v : null })}
            />
            <Field label="School" value={edu.school} onChange={(v) => setEdu({ school: v })} />
            <Field label="Degree" value={edu.degree} onChange={(v) => setEdu({ degree: v })} />
          </div>
          <div>
            <p className="mb-2 text-xs text-muted">
              Skills ({profile.skills.length}). Aliases like “JS” become “JavaScript”.
            </p>
            <ul className="flex flex-wrap gap-2">
              {profile.skills.map((s) => (
                <li key={s}>
                  <button
                    type="button"
                    aria-label={`Remove skill ${s}`}
                    onClick={() => updateProfile({ skills: profile.skills.filter((x) => x !== s) })}
                    className="inline-flex h-8 items-center gap-1 rounded border border-line px-2 font-mono text-xs hover:border-muted"
                  >
                    {s}
                    <X size={12} aria-hidden="true" />
                  </button>
                </li>
              ))}
              {profile.skills.length === 0 && (
                <li className="text-sm text-muted">No skills found yet. Add some below.</li>
              )}
            </ul>
            <form
              className="mt-3 flex gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                addSkill();
              }}
            >
              <label htmlFor="add-skill" className="sr-only">
                Add a skill
              </label>
              <input
                id="add-skill"
                list="skill-options"
                className={input}
                placeholder="Add a skill…"
                value={skillText}
                onChange={(e) => setSkillText(e.target.value)}
              />
              <datalist id="skill-options">
                {ALL_SKILL_NAMES.map((s) => (
                  <option key={s} value={s} />
                ))}
              </datalist>
              <button className={btn.ghost} type="submit">
                <Plus size={16} aria-hidden="true" />
                Add
              </button>
            </form>
          </div>
          <div>
            <p className="mb-2 text-xs text-muted">Links</p>
            <ul className="space-y-1">
              {profile.links.map((l) => (
                <li key={l} className="flex items-center justify-between gap-2 font-mono text-xs">
                  <span className="min-w-0 truncate">{l}</span>
                  <button
                    type="button"
                    aria-label={`Remove link ${l}`}
                    onClick={() => updateProfile({ links: profile.links.filter((x) => x !== l) })}
                    className="shrink-0 p-2 text-muted hover:text-ink"
                  >
                    <X size={14} aria-hidden="true" />
                  </button>
                </li>
              ))}
              {profile.links.length === 0 && (
                <li className="text-sm text-muted">No links found.</li>
              )}
            </ul>
          </div>
        </section>
      )}
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  inputMode,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  inputMode?: 'numeric';
}) {
  const id = `f-${label.replace(/\s/g, '-').toLowerCase()}`;
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-xs text-muted">
        {label}
      </label>
      <input
        id={id}
        className={input}
        value={value}
        inputMode={inputMode}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}
