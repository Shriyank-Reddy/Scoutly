const a = 'underline underline-offset-2 hover:text-ink';

/** Required attribution for aggregator sources, plus map and city-data credits. */
export function Credits({ className = '' }: { className?: string }) {
  return (
    <p className={`text-xs text-muted ${className}`}>
      Listings come from company job boards (Greenhouse, Lever, Ashby) and, via their public APIs,
      from{' '}
      <a className={a} href="https://www.adzuna.com" target="_blank" rel="noopener noreferrer">
        Jobs by Adzuna
      </a>
      ,{' '}
      <a className={a} href="https://remotive.com" target="_blank" rel="noopener noreferrer">
        Remotive
      </a>{' '}
      and{' '}
      <a className={a} href="https://www.arbeitnow.com" target="_blank" rel="noopener noreferrer">
        Arbeitnow
      </a>
      . Every listing links to its original posting. Map ©{' '}
      <a
        className={a}
        href="https://www.openstreetmap.org/copyright"
        target="_blank"
        rel="noopener noreferrer"
      >
        OpenStreetMap
      </a>{' '}
      contributors. City data:{' '}
      <a className={a} href="https://www.geonames.org" target="_blank" rel="noopener noreferrer">
        GeoNames
      </a>{' '}
      (CC BY 4.0).
    </p>
  );
}
