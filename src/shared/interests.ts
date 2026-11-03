// Interest chips on the profile. Each is a set of keywords matched against a listing's title, snippet and skills.
export interface Interest {
  id: string;
  label: string;
  keywords: string[];
}

export const INTERESTS: Interest[] = [
  {
    id: 'software',
    label: 'Software',
    keywords: [
      'software',
      'engineer',
      'engineering',
      'developer',
      'backend',
      'frontend',
      'full stack',
      'fullstack',
      'web',
      'mobile',
      'platform',
      'infrastructure',
      'devops',
      'sre',
    ],
  },
  {
    id: 'ai-ml',
    label: 'AI/ML',
    keywords: [
      'machine learning',
      'ml',
      'ai',
      'artificial intelligence',
      'deep learning',
      'nlp',
      'computer vision',
      'llm',
      'neural',
      'pytorch',
      'tensorflow',
    ],
  },
  {
    id: 'security',
    label: 'Security',
    keywords: [
      'security',
      'cybersecurity',
      'appsec',
      'penetration',
      'threat',
      'vulnerability',
      'cryptography',
      'soc',
      'infosec',
      'malware',
    ],
  },
  {
    id: 'data',
    label: 'Data',
    keywords: [
      'data',
      'analytics',
      'analyst',
      'etl',
      'sql',
      'warehouse',
      'statistics',
      'bi',
      'tableau',
    ],
  },
  {
    id: 'product',
    label: 'Product',
    keywords: ['product', 'product management', 'roadmap', 'program manager', 'strategy'],
  },
  {
    id: 'design',
    label: 'Design',
    keywords: ['design', 'designer', 'ux', 'ui', 'user experience', 'figma', 'visual'],
  },
  {
    id: 'research',
    label: 'Research',
    keywords: ['research', 'researcher', 'scientist', 'phd', 'publications', 'lab'],
  },
];

const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const RES = new Map(
  INTERESTS.map((i) => [
    i.id,
    new RegExp(`(?<![a-z0-9])(?:${i.keywords.map(esc).join('|')})(?![a-z0-9])`, 'i'),
  ]),
);

/** 1 = a keyword is in the title, 0.6 = only in snippet/skills, 0 = none. */
export function interestHit(id: string, title: string, rest: string): number {
  const re = RES.get(id);
  if (!re) return 0;
  return re.test(title) ? 1 : re.test(rest) ? 0.6 : 0;
}
export const interestLabel = (id: string) => INTERESTS.find((i) => i.id === id)?.label ?? id;
