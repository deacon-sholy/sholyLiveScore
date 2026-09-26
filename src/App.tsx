import { useEffect } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import HomePage from './pages/HomePage';
import LeaguePage from './pages/LeaguePage';
import MatchPage from './pages/MatchPage';

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

function App() {
  return (
    // Safe-area insets live on this wrapper (it has no padding utilities of its
    // own, so nothing can override them) and min-h-dvh keeps the footer
    // reachable on mobile browsers where 100vh includes the space hidden
    // behind the collapsing URL bar.
    <div className="safe-x safe-b relative flex min-h-screen min-h-dvh flex-col bg-canvas text-fg">
      {/* Ambient background glow */}
      <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-48 left-1/2 h-[28rem] w-[28rem] -translate-x-1/2 rounded-full bg-accent-500/10 blur-[120px]" />
        <div className="absolute top-1/3 -right-40 h-80 w-80 rounded-full bg-accent-500/[0.07] blur-[100px]" />
        <div className="absolute bottom-0 -left-32 h-72 w-72 rounded-full bg-sky-500/[0.05] blur-[100px]" />
      </div>

      <ScrollToTop />
      <div className="flex-1">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/league/:leagueSlug" element={<LeaguePage />} />
          <Route path="/league/:leagueSlug/match/:matchId" element={<MatchPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>

      {/* The footer is the last thing on the page, so the home-indicator /
          gesture bar clearance comes from `safe-b` on the wrapper above. */}
      <footer className="relative border-t border-line py-7 text-center">
        <p className="text-xs text-muted">
          Live data from ESPN · Auto-refresh every 30s
        </p>
      </footer>
    </div>
  );
}

export default App;
