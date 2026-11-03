import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { ResumeIntake } from '../components/ResumeIntake';
import { btn } from '../components/ui';
import { useApp } from '../state/AppState';

export default function HomePage() {
  const { hasProfile, listings } = useApp();
  return (
    <div className="mx-auto max-w-3xl space-y-6 p-4 pb-24 md:p-6">
      <header>
        <h1 className="text-xl font-semibold">Start with your resume</h1>
        <p className="mt-1 max-w-xl text-sm text-muted">
          Scoutly reads it here in your browser, then ranks internships from public job boards by
          how well they fit you, and says why.
        </p>
      </header>
      <ResumeIntake />
      <div className="flex flex-wrap items-center gap-3">
        <Link to="/search" className={btn.primary}>
          {hasProfile ? 'See matching internships' : 'Browse without a resume'}
          <ArrowRight size={16} aria-hidden="true" />
        </Link>
        {hasProfile && (
          <Link to="/profile" className={btn.ghost}>
            Set preferences
          </Link>
        )}
        {listings.length > 0 && (
          <span className="font-mono text-xs text-muted">{listings.length} listings loaded</span>
        )}
      </div>
    </div>
  );
}
