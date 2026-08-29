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
    <div className="min-h-screen bg-ink-950">
      {/* Ambient background glow */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full bg-accent-500/10 blur-[120px]" />
        <div className="absolute top-1/3 -right-40 h-80 w-80 rounded-full bg-accent-600/5 blur-[100px]" />
      </div>

      <ScrollToTop />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/league/:leagueSlug" element={<LeaguePage />} />
        <Route path="/league/:leagueSlug/match/:matchId" element={<MatchPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      {/* Footer */}
      <footer className="relative border-t border-white/5 py-6 text-center">
        <p className="text-xs text-ink-500">
          Sholy Livescore · Live data from ESPN · Auto-refresh every 30s
        </p>
      </footer>
    </div>
  );
}

export default App;