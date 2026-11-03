// "Search on…" buttons. ALL URL templates live here so they are easy to fix when a site changes its format.
// These are plain links that open the site in a new tab. Scoutly never fetches or scrapes any of them.
// Placeholders: {q} keywords, {loc} location, {qDash}/{locDash} lowercase-hyphenated versions.
export interface ExternalSite {
  id: string;
  label: string;
  template: string; // used when we have a location
  noLocation?: string; // used when we do not
  byCountry?: Record<string, string>; // template overrides by ISO country code
}

export const EXTERNAL_SITES: ExternalSite[] = [
  {
    id: 'linkedin',
    label: 'LinkedIn',
    template: 'https://www.linkedin.com/jobs/search/?keywords={q}&location={loc}',
    noLocation: 'https://www.linkedin.com/jobs/search/?keywords={q}',
  },
  {
    id: 'internshala',
    label: 'Internshala',
    template: 'https://internshala.com/internships/{qDash}-internship-in-{locDash}',
    noLocation: 'https://internshala.com/internships/keywords-{qDash}',
  },
  {
    id: 'handshake',
    label: 'Handshake',
    template: 'https://app.joinhandshake.com/stu/postings?query={q}',
    noLocation: 'https://app.joinhandshake.com/stu/postings?query={q}',
  },
  {
    id: 'indeed',
    label: 'Indeed',
    template: 'https://www.indeed.com/jobs?q={q}&l={loc}',
    noLocation: 'https://www.indeed.com/jobs?q={q}',
    byCountry: {
      GB: 'https://uk.indeed.com/jobs?q={q}&l={loc}',
      IN: 'https://in.indeed.com/jobs?q={q}&l={loc}',
      CA: 'https://ca.indeed.com/jobs?q={q}&l={loc}',
      AU: 'https://au.indeed.com/jobs?q={q}&l={loc}',
      DE: 'https://de.indeed.com/jobs?q={q}&l={loc}',
    },
  },
];

const dash = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

/** Make sure the search says "internship" even if the user typed only a field like "machine learning". */
export const withIntern = (kw: string) =>
  /\b(intern|internship|co-?op|placement|trainee)\b/i.test(kw)
    ? kw.trim()
    : `${kw.trim()} internship`.trim();

export function externalSearchLinks(opts: {
  keywords: string;
  location?: string;
  country?: string | null;
}): { id: string; label: string; url: string }[] {
  const q = withIntern(opts.keywords || 'software');
  const loc = (opts.location ?? '').trim();
  return EXTERNAL_SITES.map((s) => {
    const tpl = loc
      ? (opts.country && s.byCountry?.[opts.country]) || s.template
      : (s.noLocation ?? s.template);
    const url = tpl
      .replace('{qDash}', dash(q))
      .replace('{locDash}', dash(loc))
      .replace('{q}', encodeURIComponent(q))
      .replace('{loc}', encodeURIComponent(loc));
    return { id: s.id, label: s.label, url };
  });
}
