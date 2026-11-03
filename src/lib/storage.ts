import type { Profile } from '../shared/types';
import type { TrackedItem } from './tracker';

// Everything the user owns stays in localStorage on THIS device. Every access is wrapped: private windows can throw.
const KEYS = {
  profile: 'scoutly.profile.v1',
  tracker: 'scoutly.tracker.v1',
  ui: 'scoutly.ui.v1',
} as const;

export const EMPTY_PROFILE: Profile = {
  name: '',
  skills: [],
  education: [],
  links: [],
  resumeText: '',
  targetRoles: [],
  locations: [],
  radiusKm: 80,
  workModes: [],
  availableFrom: null,
  availableTo: null,
  interests: [],
  keywords: [],
  companySizes: [],
  paid: 'any',
  needsSponsorship: false,
};

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? { ...fallback, ...JSON.parse(raw) } : fallback;
  } catch {
    return fallback;
  }
}
function write(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

export const loadProfile = () => read<Profile>(KEYS.profile, EMPTY_PROFILE);
export const saveProfile = (p: Profile) => write(KEYS.profile, p);
export function loadTracker(): TrackedItem[] {
  try {
    const v = JSON.parse(localStorage.getItem(KEYS.tracker) ?? '[]');
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}
export const saveTracker = (t: TrackedItem[]) => write(KEYS.tracker, t);

/** "Delete all my data": removes every Scoutly key. */
export function deleteAllData() {
  try {
    Object.values(KEYS).forEach((k) => localStorage.removeItem(k));
  } catch {
    /* nothing to delete */
  }
}
