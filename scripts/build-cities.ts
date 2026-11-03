// Builds src/data/cities.json from GeoNames (via the `all-the-cities` package, CC BY 4.0).
// Run once with: npx tsx scripts/build-cities.ts   (output is committed; the app never needs the package.)
import cities from 'all-the-cities';
import { writeFileSync } from 'node:fs';

const BIG = new Set(['US', 'CA', 'GB', 'IN', 'DE', 'AU']);
const rows = cities
  .filter((c) => c.population >= (BIG.has(c.country) ? 25000 : 150000))
  // [name, countryCode, adminCode, lat, lon, population]
  .map((c) => [
    c.name,
    c.country,
    c.adminCode,
    +c.loc.coordinates[1].toFixed(3),
    +c.loc.coordinates[0].toFixed(3),
    c.population,
  ])
  .sort((a, b) => (b[5] as number) - (a[5] as number));
writeFileSync('src/data/cities.json', JSON.stringify(rows));
console.log(rows.length, 'cities');
