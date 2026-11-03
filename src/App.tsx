import { lazy, Suspense, type ReactNode } from 'react';
import { Bookmark, FileText, MapPin, Search, SlidersHorizontal } from 'lucide-react';
import { HashRouter, NavLink, Route, Routes } from 'react-router-dom';
import { AppProvider, useApp } from './state/AppState';
import { Skeleton } from './components/ui';
import { Credits } from './components/Credits';

const HomePage = lazy(() => import('./pages/HomePage'));
const SearchPage = lazy(() => import('./pages/SearchPage'));
const CityPage = lazy(() => import('./pages/CityPage'));
const ProfilePage = lazy(() => import('./pages/ProfilePage'));
const TrackerPage = lazy(() => import('./pages/TrackerPage'));

const NAV = [
  { to: '/', label: 'Start', Icon: FileText },
  { to: '/search', label: 'Search', Icon: Search },
  { to: '/city', label: 'City', Icon: MapPin },
  { to: '/tracker', label: 'Tracker', Icon: Bookmark },
  { to: '/profile', label: 'Profile', Icon: SlidersHorizontal },
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
        <div
          className="border-b border-flag/40 px-4 py-1 font-mono text-xs text-flag"
          role="status"
        >
          <strong className="font-medium">Sample data.</strong> Fictional demo listings until the
          first live refresh.
        </div>
      )}
      <header className="flex items-center gap-6 border-b border-line px-4">
        <NavLink to="/" className="py-3 text-base font-semibold">
          Scoutly
        </NavLink>
        <nav aria-label="Main" className="hidden gap-1 md:flex">
          {NAV.map(({ to, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `-mb-px border-b-2 px-3 py-3 text-sm ${isActive ? 'border-accent text-ink' : 'border-transparent text-muted hover:text-ink'}`
              }
            >
              {label}
              {to === '/tracker' && tracker.length > 0 && (
                <span className="ml-2 font-mono text-xs text-muted">{tracker.length}</span>
              )}
            </NavLink>
          ))}
        </nav>
        <span className="ml-auto font-mono text-xs text-muted">
          {updated ? `Updated ${updated}` : ''}
        </span>
      </header>
      <main id="main" className="min-h-0 flex-1 overflow-hidden">
        <Suspense
          fallback={
            <div className="space-y-3 p-4">
              <Skeleton className="h-6 w-1/3" />
              <Skeleton className="h-40" />
            </div>
          }
        >
          <Routes>
            <Route
              path="/"
              element={
                <Scroll>
                  <HomePage />
                </Scroll>
              }
            />
            <Route path="/search" element={<SearchPage />} />
            <Route
              path="/city"
              element={
                <Scroll>
                  <CityPage />
                </Scroll>
              }
            />
            <Route
              path="/profile"
              element={
                <Scroll>
                  <ProfilePage />
                </Scroll>
              }
            />
            <Route
              path="/tracker"
              element={
                <Scroll>
                  <TrackerPage />
                </Scroll>
              }
            />
          </Routes>
        </Suspense>
      </main>
      <footer className="hidden border-t border-line px-4 py-2 md:block">
        <Credits />
      </footer>
      <nav aria-label="Main" className="grid grid-cols-5 border-t border-line bg-bg md:hidden">
        {NAV.map(({ to, label, Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex h-14 flex-col items-center justify-center gap-1 text-xs ${isActive ? 'text-ink' : 'text-muted'}`
            }
          >
            {({ isActive }) => (
              <>
                <Icon
                  size={20}
                  aria-hidden="true"
                  className={isActive ? 'text-accent-hover' : ''}
                />
                {label}
              </>
            )}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}

const Scroll = ({ children }: { children: ReactNode }) => (
  <div className="h-full overflow-y-auto">{children}</div>
);

export default function App() {
  return (
    <AppProvider>
      <HashRouter>
        <Shell />
      </HashRouter>
    </AppProvider>
  );
}
