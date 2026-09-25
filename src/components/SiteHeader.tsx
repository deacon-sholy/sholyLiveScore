import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { RefreshCw, Sun, Moon, Zap } from 'lucide-react';
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
    <header className="sticky top-0 z-50 border-b border-line glass">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="flex h-14 items-center justify-between gap-3">
          <Link to="/" className="group flex min-w-0 items-center gap-2.5" aria-label="Sholy Livescore home">
            <span className="relative flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-accent-400 to-accent-600 shadow-lg shadow-accent-500/25 transition-transform group-hover:scale-105">
              <Zap className="h-[18px] w-[18px] text-white" fill="white" />
            </span>
            <span className="min-w-0">
              <span className="font-display block truncate text-[15px] font-extrabold leading-none tracking-tight text-fg">
                Sholy <span className="text-gradient">Livescore</span>
              </span>
              <span className="mt-1 block text-[10px] font-medium leading-none text-muted">
                Live football scores
              </span>
            </span>
          </Link>

          <div className="flex flex-shrink-0 items-center gap-1.5">
            {onRefresh && (
              <button
                onClick={onRefresh}
                disabled={refreshing}
                aria-label="Refresh scores"
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-line bg-surface text-muted transition-colors hover:border-line-strong hover:text-fg disabled:opacity-50"
              >
                <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin-slow' : ''}`} />
              </button>
            )}

            <ShareButton title="Sholy Livescore" text="Live football scores, stats & match events" />

            <button
              onClick={toggleDark}
              aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-line bg-surface text-muted transition-colors hover:border-line-strong hover:text-fg"
            >
              {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {children}
      </div>
    </header>
  );
}
