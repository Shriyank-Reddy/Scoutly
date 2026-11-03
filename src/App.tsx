import { lazy, Suspense } from 'react';
import { HashRouter, NavLink, Route, Routes } from 'react-router-dom';
import { AppProvider, useApp } from './state/AppState';
import { Skeleton } from './components/ui';

const HomePage = lazy(() => import('./pages/HomePage'));
const SearchPage = lazy(() => import('./pages/SearchPage'));
const CityPage = lazy(() => import('./pages/CityPage'));
const ProfilePage = lazy(() => import('./pages/ProfilePage'));
const TrackerPage = lazy(() => import('./pages/TrackerPage'));

const NAV = [
  { to: '/', label: 'Start' },
  { to: '/search', label: 'Search' },
  { to: '/city', label: 'City' },
  { to: '/profile', label: 'Profile' },
  { to: '/tracker', label: 'Tracker' },
];

function Shell() {
  const { meta, tracker } = useApp();
  const updated = meta
    ? new Date(meta.fetchedAt).toLocaleString(undefined, {
        dateStyle: 'medium',
        timeStyle: 'short',
      })
    : null;
  return (
    <div className="flex h-full flex-col">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:bg-accent focus:p-2"
      >
        Skip to content
      </a>
      {meta?.isSample && (
        <div className="bg-flag/15 px-4 py-1.5 text-center text-xs text-flag" role="status">
          <strong>Sample data.</strong> These are fictional demo listings. Live listings appear
          after the first scheduled data refresh succeeds.
        </div>
      )}
      <header className="flex flex-wrap items-center gap-x-6 gap-y-1 border-b border-line px-4 py-2">
        <NavLink to="/" className="font-display text-lg font-bold tracking-tight">
          Scout<span className="text-accent-soft">ly</span>
        </NavLink>
        <nav aria-label="Main" className="flex gap-1">
          {NAV.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.to === '/'}
              className={({ isActive }) =>
                `rounded-lg px-3 py-1.5 text-sm ${isActive ? 'bg-accent/20 text-accent-soft' : 'text-muted hover:text-ink'}`
              }
            >
              {n.label}
              {n.to === '/tracker' && tracker.length > 0 ? (
                <span className="ml-1 font-mono text-[11px]">{tracker.length}</span>
              ) : null}
            </NavLink>
          ))}
        </nav>
        <span className="ml-auto font-mono text-[11px] text-muted">
          {updated ? `Updated ${updated}` : ''}
        </span>
      </header>
      <main id="main" className="min-h-0 flex-1 overflow-hidden">
        <Suspense
          fallback={
            <div className="space-y-3 p-4">
              <Skeleton className="h-10 w-1/2" />
              <Skeleton className="h-40" />
            </div>
          }
        >
          <Routes>
            <Route
              path="/"
              element={
                <div className="h-full overflow-y-auto">
                  <HomePage />
                </div>
              }
            />
            <Route path="/search" element={<SearchPage />} />
            <Route
              path="/city"
              element={
                <div className="h-full overflow-y-auto lg:overflow-hidden">
                  <CityPage />
                </div>
              }
            />
            <Route
              path="/profile"
              element={
                <div className="h-full overflow-y-auto">
                  <ProfilePage />
                </div>
              }
            />
            <Route
              path="/tracker"
              element={
                <div className="h-full overflow-y-auto">
                  <TrackerPage />
                </div>
              }
            />
          </Routes>
        </Suspense>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <HashRouter>
        <Shell />
      </HashRouter>
    </AppProvider>
  );
}
