import { useEffect, useState } from 'react';
import { Download, X } from 'lucide-react';

interface InstallEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const DISMISS_KEY = 'sholy-install-dismissed';

/**
 * Shows a small install banner when the browser fires beforeinstallprompt.
 * No-ops on browsers that don't support it (e.g. iOS Safari) and remembers a
 * dismissal so it never nags twice.
 */
export default function InstallPrompt() {
  const [event, setEvent] = useState<InstallEvent | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Already running as an installed app — nothing to prompt for.
    if (window.matchMedia('(display-mode: standalone)').matches) return;
    try {
      if (localStorage.getItem(DISMISS_KEY) === '1') return;
    } catch {
      // ignore storage errors
    }

    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      setEvent(e as InstallEvent);
      setVisible(true);
    };
    const onInstalled = () => {
      setVisible(false);
      setEvent(null);
    };

    window.addEventListener('beforeinstallprompt', onBeforeInstall);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  const dismiss = () => {
    setVisible(false);
    setEvent(null);
    try {
      localStorage.setItem(DISMISS_KEY, '1');
    } catch {
      // ignore storage errors
    }
  };

  const install = async () => {
    if (!event) return;
    await event.prompt();
    const { outcome } = await event.userChoice;
    if (outcome === 'accepted') {
      setVisible(false);
      setEvent(null);
    } else {
      dismiss();
    }
  };

  if (!visible || !event) return null;

  return (
    <div
      role="status"
      className="fixed inset-x-3 bottom-3 z-50 mx-auto flex max-w-md items-center gap-3 rounded-2xl border border-line-strong bg-surface px-4 py-3 shadow-lift sm:inset-x-auto sm:right-5 sm:bottom-5"
    >
      <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-accent-500/15 text-accent-600 dark:text-accent-400">
        <Download className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-bold text-fg">Install Sholy Scores</p>
        <p className="text-[11px] text-muted">Quick access to live scores, even offline.</p>
      </div>
      <button
        type="button"
        onClick={install}
        className="flex-shrink-0 rounded-lg bg-fg px-3 py-1.5 text-[11px] font-bold text-canvas transition-opacity hover:opacity-85"
      >
        Install
      </button>
      <button
        type="button"
        onClick={dismiss}
        aria-label="Dismiss install prompt"
        className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg text-subtle transition-colors hover:text-fg"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
