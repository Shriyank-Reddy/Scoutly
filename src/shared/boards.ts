import type { BoardSource } from './types';

const RESERVED = new Set(['embed', 'jobs', 'api', 'v1', 'login', 'www']);

/** Platform + slug from a Greenhouse / Lever / Ashby apply link, or null. Used by discovery and by the tracker's "Add from link". */
export function extractBoard(raw: string): { source: BoardSource; slug: string } | null {
  let u: URL;
  try {
    u = new URL(raw);
  } catch {
    return null;
  }
  const host = u.hostname.toLowerCase();
  const first = decodeURIComponent(u.pathname.split('/').filter(Boolean)[0] ?? '');
  const ok = (slug: string | null | undefined) =>
    slug && /^[A-Za-z0-9._-]{2,60}$/.test(slug) && !RESERVED.has(slug.toLowerCase()) ? slug : null;
  if (/^(boards|job-boards)(\.eu)?\.greenhouse\.io$/.test(host)) {
    const slug = ok(first === 'embed' ? u.searchParams.get('for') : first);
    return slug ? { source: 'greenhouse', slug } : null;
  }
  if (/^jobs(\.eu)?\.lever\.co$/.test(host)) {
    const slug = ok(first);
    return slug ? { source: 'lever', slug } : null;
  }
  if (host === 'jobs.ashbyhq.com') {
    const slug = ok(first);
    return slug ? { source: 'ashby', slug } : null;
  }
  return null;
}
