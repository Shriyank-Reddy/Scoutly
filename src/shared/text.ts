const ENTITIES: Record<string, string> = {
  '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#39;': "'", '&apos;': "'", '&nbsp;': ' ', '&ndash;': '-', '&mdash;': '-', '&rsquo;': "'", '&lsquo;': "'",
};

/** Turn HTML (possibly entity-encoded, as Greenhouse returns it) into plain text. */
export function htmlToText(html: string): string {
  let s = html ?? '';
  // Greenhouse double-encodes: "&lt;p&gt;" -> decode once first so tags become real tags.
  if (!/<[a-z][\s\S]*>/i.test(s) && /&lt;[a-z]/i.test(s)) s = decodeEntities(s);
  s = s.replace(/<(script|style)[\s\S]*?<\/\1>/gi, ' ');
  s = s.replace(/<\/(p|div|li|h[1-6]|ul|ol|br)>|<br\s*\/?>/gi, '\n');
  s = s.replace(/<[^>]+>/g, ' ');
  s = decodeEntities(s);
  return s.replace(/[ \t ]+/g, ' ').replace(/\s*\n\s*/g, '\n').trim();
}

export function decodeEntities(s: string): string {
  return s
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&[a-z]+;|&#39;/gi, (m) => ENTITIES[m.toLowerCase()] ?? m);
}

/** A short snippet: first ~280 characters, cut at a word boundary. */
export function makeSnippet(text: string, max = 280): string {
  const flat = text.replace(/\s+/g, ' ').trim();
  if (flat.length <= max) return flat;
  const cut = flat.slice(0, max);
  return cut.slice(0, cut.lastIndexOf(' ') > 150 ? cut.lastIndexOf(' ') : max) + '…';
}

export const norm = (s: string) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
