import type { AuthFlag } from './types';

// Text matches only. We never decide eligibility: we show the phrase and let the reader judge.
const RULES: { id: AuthFlag['id']; label: string; re: RegExp }[] = [
  {
    id: 'no-sponsorship',
    label: 'no sponsorship',
    re: /(?:will not|won'?t|unable to|cannot|can ?not|do(?:es)? not|not able to)\s+(?:provide\s+|offer\s+)?(?:visa\s+|employment\s+)?sponsor\w*|no\s+(?:visa\s+)?sponsorship|without\s+(?:visa\s+)?sponsorship|not\s+(?:eligible|available)\s+for\s+(?:visa\s+)?sponsorship/i,
  },
  {
    id: 'citizenship',
    label: 'citizenship requirement',
    re: /\bU\.?S\.?\s+citizen(?:ship)?s?\b|\bcitizens?\s+of\s+the\s+(?:United States|U\.?S\.?)|citizenship\s+(?:is\s+)?required|must\s+be\s+a\s+(?:\w+\s+)?citizen|permanent resident|green card/i,
  },
  {
    id: 'clearance',
    label: 'security clearance',
    re: /security clearance|\b(?:TS\/SCI|top secret|secret clearance)\b|clearance\s+(?:required|eligib\w+)|ability to obtain (?:a )?(?:\w+\s+)?clearance/i,
  },
  {
    id: 'cpt-opt',
    label: 'CPT/OPT',
    re: /\b(?:CPT|OPT|STEM OPT|curricular practical training|optional practical training)\b/,
  },
  {
    id: 'sponsorship-available',
    label: 'sponsorship offered',
    re: /(?:visa|immigration)\s+sponsorship\s+(?:is\s+)?(?:available|provided|offered)|(?:we|will)\s+(?:provide\s+|offer\s+)?(?:visa\s+)?sponsor(?:ship)?\s+(?:for\s+)?(?:eligible|qualified|international)/i,
  },
];

export function detectAuthFlags(text: string): AuthFlag[] {
  const out: AuthFlag[] = [];
  for (const r of RULES) {
    const m = text.match(r.re);
    if (m) out.push({ id: r.id, label: r.label, match: m[0].trim() });
  }
  return out;
}
