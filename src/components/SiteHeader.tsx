import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { RefreshCw, Sun, Moon, Zap, Globe } from 'lucide-react';
import ShareButton from './ShareButton';
import { useDarkMode } from '../lib/useDarkMode';

interface SiteHeaderProps {
  refreshing?: boolean;
  onRefresh?: () => void;
  children?: ReactNode;
}

export default function SiteHeader({ refreshing, onRefresh, children }: SiteHeaderProps) {
  const { dark, toggle: toggleDark } = useDarkMode();

  return (
    <header className="sticky top-0 z-50 glass border-b border-white/5">
      <div className="mx-auto max-w-3xl px-4 py-3.5">
        <div className="flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-accent-400 to-accent-600 shadow-lg shadow-accent-500/30">
              <Zap className="h-5 w-5 text-white" fill="white" />
            </div>
            <div>
              <h1 className="font-display text-xl font-extrabold leading-none tracking-tight text-white">
                Sholy <span className="text-gradient">Livescore</span>
              </h1>
              <p className="mt-0.5 flex items-center gap-1 text-[10px] font-medium text-ink-400">
                <Globe className="h-2.5 w-2.5" />
                Live football scores
              </p>
            </div>
          </Link>

          <div className="flex items-center gap-2">
            <button
              onClick={toggleDark}
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-ink-300 transition-colors hover:border-white/20 hover:bg-white/10"
              title={dark ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>

            <ShareButton title="Sholy Livescore" text="Live football scores, stats & match events" />

            {onRefresh && (
              <button
                onClick={onRefresh}
                disabled={refreshing}
                className="group flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-medium text-ink-200 transition-all hover:border-white/20 hover:bg-white/10 disabled:opacity-50"
              >
                <RefreshCw className={`h-3.5 w-3.5 transition-transform group-hover:rotate-180 ${refreshing ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">Refresh</span>
              </button>
            )}
          </div>
        </div>

        {children}
      </div>
    </header>
  );
}