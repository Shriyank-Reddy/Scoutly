import { ExternalLink } from 'lucide-react';
import { externalSearchLinks } from '../config/externalSearch';

/** Plain links to other sites' search pages, pre-filled. We never fetch or scrape them. */
export function ExternalSearch({
  keywords,
  location,
  country,
}: {
  keywords: string;
  location?: string;
  country?: string | null;
}) {
  const links = externalSearchLinks({ keywords, location, country });
  return (
    <div
      className="flex flex-wrap items-center gap-2"
      role="group"
      aria-label="Search on other sites"
    >
      <span className="font-mono text-xs text-muted">Search on</span>
      {links.map((l) => (
        <a
          key={l.id}
          href={l.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-9 items-center gap-1 rounded border border-line px-2 text-xs text-ink hover:border-muted md:min-h-8"
        >
          {l.label}
          <ExternalLink size={12} aria-hidden="true" />
          <span className="sr-only"> (opens in a new tab)</span>
        </a>
      ))}
    </div>
  );
}
