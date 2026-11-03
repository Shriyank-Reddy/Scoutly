/** Availability is picked as months ("2027-05") but stored as full ISO dates. */
export const monthStart = (m: string): string | null =>
  /^\d{4}-(0[1-9]|1[0-2])$/.test(m) ? `${m}-01` : null;
export function monthEnd(m: string): string | null {
  if (!monthStart(m)) return null;
  const [y, mo] = m.split('-').map(Number);
  return `${m}-${String(new Date(Date.UTC(y, mo, 0)).getUTCDate()).padStart(2, '0')}`;
}
export const isoToMonth = (iso: string | null) => (iso ? iso.slice(0, 7) : '');
