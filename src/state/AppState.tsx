import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { Listing, Meta, Profile } from '../shared/types';
import {
  deleteAllData,
  EMPTY_PROFILE,
  loadProfile,
  loadTracker,
  saveProfile,
  saveTracker,
} from '../lib/storage';
import { hasProfileSignal, scoreListings, type MatchResult } from '../lib/match';
import { newItem, type TrackedItem } from '../lib/tracker';

interface AppCtx {
  listings: Listing[];
  meta: Meta | null;
  loading: boolean;
  error: string | null;
  profile: Profile;
  updateProfile: (patch: Partial<Profile>) => void;
  hasProfile: boolean;
  scores: Map<string, MatchResult>;
  tracker: TrackedItem[];
  isTracked: (id: string) => boolean;
  track: (l: Listing) => void;
  updateTracked: (id: string, patch: Partial<TrackedItem>) => void;
  untrack: (id: string) => void;
  deleteAll: () => void;
}

const Ctx = createContext<AppCtx | null>(null);
export const useApp = () => {
  const c = useContext(Ctx);
  if (!c) throw new Error('useApp outside provider');
  return c;
};

export function AppProvider({ children }: { children: ReactNode }) {
  const [listings, setListings] = useState<Listing[]>([]);
  const [meta, setMeta] = useState<Meta | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [profile, setProfile] = useState<Profile>(loadProfile);
  const [tracker, setTracker] = useState<TrackedItem[]>(loadTracker);

  useEffect(() => {
    const base = import.meta.env.BASE_URL;
    Promise.all([
      fetch(`${base}data/listings.json`).then((r) => r.json()),
      fetch(`${base}data/meta.json`).then((r) => r.json()),
    ])
      .then(([l, m]) => {
        setListings(l);
        setMeta(m);
      })
      .catch(() =>
        setError(
          'Could not load listings. Run "npm run fetch-jobs" to create public/data/listings.json.',
        ),
      )
      .finally(() => setLoading(false));
  }, []);

  const updateProfile = useCallback((patch: Partial<Profile>) => {
    setProfile((p) => {
      const next = { ...p, ...patch };
      saveProfile(next);
      return next;
    });
  }, []);
  const mutateTracker = useCallback((fn: (t: TrackedItem[]) => TrackedItem[]) => {
    setTracker((t) => {
      const next = fn(t);
      saveTracker(next);
      return next;
    });
  }, []);

  const scores = useMemo(() => scoreListings(listings, profile), [listings, profile]);
  const value: AppCtx = {
    listings,
    meta,
    loading,
    error,
    profile,
    updateProfile,
    hasProfile: hasProfileSignal(profile),
    scores,
    tracker,
    isTracked: (id) => tracker.some((t) => t.listingId === id),
    track: (l) =>
      mutateTracker((t) => (t.some((x) => x.listingId === l.id) ? t : [newItem(l), ...t])),
    updateTracked: (id, patch) =>
      mutateTracker((t) => t.map((x) => (x.listingId === id ? { ...x, ...patch } : x))),
    untrack: (id) => mutateTracker((t) => t.filter((x) => x.listingId !== id)),
    deleteAll: () => {
      deleteAllData();
      setProfile(EMPTY_PROFILE);
      setTracker([]);
    },
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
