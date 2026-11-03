import type { WorkMode } from './types';

/** Work mode from structured hint, location strings and a bit of text. Unknown stays unknown. */
export function detectWorkMode(locationTexts: string[], title: string, text: string, remoteHint: boolean | null): WorkMode {
  const loc = locationTexts.join(' | ');
  const head = `${title} ${loc}`;
  if (/\bhybrid\b/i.test(head) || /\bhybrid\b/i.test(text.slice(0, 1500)) && /\b(days?|week|office)\b/i.test(text.slice(0, 1500)) && /hybrid (work|role|schedule|model|position|environment)|\d\s*days?\s*(a|per|\/)\s*week.{0,40}office|in[- ]office.{0,30}\d\s*days/i.test(text)) return 'hybrid';
  if (/\bremote\b|work from home|\bwfh\b|anywhere/i.test(head) || remoteHint === true) return 'remote';
  if (/\b(fully remote|100% remote|remote[- ]first|remote position|this is a remote)\b/i.test(text.slice(0, 2500))) return 'remote';
  if (/\b(on-?site|in[- ]office|in[- ]person|onsite)\b/i.test(head + ' ' + text.slice(0, 2500))) return 'onsite';
  if (remoteHint === false && locationTexts.some((l) => l.trim())) return 'onsite';
  return 'unknown';
}
