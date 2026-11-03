import type { Listing, Meta } from '../shared/types';

export const NEW_DAYS = 7;
/**
 * "New" = first seen by the pipeline within the last NEW_DAYS AND after tracking began.
 * On the very first run everything has firstSeen === trackingSince, so nothing is falsely labelled new.
 */
export function isNew(
  l: Pick<Listing, 'firstSeen'>,
  meta: Pick<Meta, 'trackingSince'> | null,
  now = Date.now(),
): boolean {
  if (!l.firstSeen || !meta?.trackingSince) return false;
  return (
    Date.parse(l.firstSeen) > Date.parse(meta.trackingSince) &&
    now - Date.parse(l.firstSeen) < NEW_DAYS * 864e5
  );
}
