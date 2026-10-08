import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Download,
  Smartphone,
  Monitor,
  Apple,
  Radio,
  Trophy,
  Star,
  BarChart3,
  Moon,
  ShieldCheck,
  ChevronRight,
} from 'lucide-react';
import SiteHeader from '../components/SiteHeader';
import { applySeo, SITE } from '../lib/seo';
import { ANDROID_MIN_VERSION, APP_VERSION, APK_URL } from '../lib/appInfo';

type Platform = 'android' | 'ios' | 'desktop';

const FEATURES = [
  { icon: Radio, title: 'Live scores', body: 'Every match on the page refreshes itself every 30 seconds.' },
  { icon: BarChart3, title: 'Stats, form & head-to-head', body: 'Possession, shots, corners, the last five results and the full H2H record.' },
  { icon: Trophy, title: 'Standings', body: 'League tables for every competition, plus cup groups when they exist.' },
  { icon: Star, title: 'My Leagues', body: 'Star the competitions you follow and they move to the top, saved on your device.' },
  { icon: Moon, title: 'Dark & light themes', body: 'Follows your system theme and remembers your choice.' },
  { icon: Smartphone, title: 'Made for the phone', body: 'A full-screen app with edge-to-edge layout and no browser chrome.' },
];

const ANDROID_STEPS = [
  'Tap Download APK below.',
  'Open the file from your notification shade or Files app.',
  'If your browser warns you, choose Allow / Install unknown apps for it, then confirm.',
  'Tap Install and open Sholy Scores.',
];

const IOS_STEPS = [
  'Open this page in Safari.',
  'Tap the Share button (the square with an arrow).',
  'Scroll down and tap Add to Home Screen.',
  'Tap Add — Sholy Scores appears on your home screen.',
];

const BROWSER_STEPS = [
  'Open this page in Chrome, Edge or Samsung Internet.',
  'Tap the menu (⋮) and choose Install app / Add to Home screen.',
  'Confirm — the site installs as a standalone app.',
];

export default function DownloadPage() {
  const [size, setSize] = useState<string | null>(null);

  const platform = useMemo<Platform>(() => {
    const ua = navigator.userAgent;
    if (/android/i.test(ua)) return 'android';
    if (/iPhone|iPad|iPod/i.test(ua)) return 'ios';
    return 'desktop';
  }, []);

  // The APK is a static file, so its Content-Length is exactly what a download
  // costs the visitor. Fetched lazily; the page works fine without it.
  useEffect(() => {
    let alive = true;
    fetch(APK_URL, { method: 'HEAD' })
      .then((res) => {
        const bytes = Number(res.headers.get('content-length'));
        if (alive && res.ok && bytes > 0) {
          setSize(bytes < 1024 * 1024 ? `${Math.round(bytes / 1024)} KB` : `${(bytes / (1024 * 1024)).toFixed(1)} MB`);
        }
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    applySeo({
      title: 'Download the Sholy Scores App · Sholy Livescore',
      description:
        'Get the free Sholy Scores Android app (APK): live football scores, standings, stats and match events. Lightweight, Android 7.0 and up, no account needed.',
      canonical: '/download',
      jsonLd: {
        '@context': 'https://schema.org',
        '@type': 'SoftwareApplication',
        name: 'Sholy Scores',
        alternateName: 'Sholy Livescore',
        description:
          'Live football scores, standings, stats and match events for leagues around the world.',
        operatingSystem: 'Android',
        applicationCategory: 'SportsApplication',
        softwareVersion: APP_VERSION,
        url: `${SITE}/download`,
        downloadUrl: `${SITE}${APK_URL}`,
        installUrl: `${SITE}${APK_URL}`,
        image: `${SITE}/icon-512.png`,
        offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
      },
    });
  }, []);

  const isAndroid = platform === 'android';

  return (
    <>
      <SiteHeader>
        <div className="flex items-center gap-2 pb-2.5 pt-2.5 text-sm sm:pb-3 sm:pt-3">
          <Link
            to="/"
            className="inline-flex items-center gap-1 rounded-lg border border-line bg-surface px-2.5 py-1.5 text-xs font-semibold text-muted transition-colors hover:border-line-strong hover:text-fg"
          >
            <ChevronRight className="h-3.5 w-3.5 rotate-180" />
            All scores
          </Link>
          <span className="min-w-0 flex-1 truncate text-sm font-bold text-fg">Get the app</span>
        </div>
      </SiteHeader>

      <main className="mx-auto max-w-3xl px-4 py-6 sm:px-6 sm:py-8">
        {/* Hero */}
        <section className="animate-slide-up overflow-hidden rounded-3xl border border-line bg-surface shadow-card">
          <div className="flex flex-col items-center gap-5 px-5 py-8 text-center sm:px-8 sm:py-10">
            <img
              src="/icon-512.png"
              alt=""
              width={96}
              height={96}
              className="h-20 w-20 rounded-[22px] shadow-lift sm:h-24 sm:w-24"
            />
            <div>
              <h1 className="font-display text-2xl font-extrabold tracking-tight text-fg sm:text-3xl">
                Sholy <span className="text-gradient">Scores</span>
              </h1>
              <p className="mx-auto mt-2 max-w-md text-sm text-muted">
                The Sholy Livescore Android app — every live match, standing and match stat, straight
                from your home screen.
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-2 text-[11px] font-semibold">
              <Chip>v{APP_VERSION}</Chip>
              <Chip>{ANDROID_MIN_VERSION}</Chip>
              <Chip>Free</Chip>
              {size && <Chip>{size}</Chip>}
            </div>

            {isAndroid ? (
              <a
                href={APK_URL}
                download
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-fg px-6 py-3.5 text-sm font-bold text-canvas shadow-lift transition-transform hover:opacity-90 active:scale-[0.98] sm:w-auto"
              >
                <Download className="h-4 w-4" />
                Download APK
              </a>
            ) : (
              <a
                href="#install"
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-fg px-6 py-3.5 text-sm font-bold text-canvas shadow-lift transition-transform hover:opacity-90 active:scale-[0.98] sm:w-auto"
              >
                <Download className="h-4 w-4" />
                How to install
              </a>
            )}

            <p className="max-w-sm text-xs text-subtle">
              The app wraps this site, so it always shows the current version — no updates to chase.
            </p>
          </div>

          <div className="grid grid-cols-3 divide-x divide-line border-t border-line text-center">
            <Meta label="Refresh" value="30s" />
            <Meta label="Leagues" value="30+" />
            <Meta label="Account" value="None" />
          </div>
        </section>

        {/* Features */}
        <section className="mt-8">
          <h2 className="font-display text-lg font-bold text-fg">What you get</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {FEATURES.map((f) => {
              const Icon = f.icon;
              return (
                <div
                  key={f.title}
                  className="flex gap-3 rounded-2xl border border-line bg-surface p-4 shadow-card"
                >
                  <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-accent-500/10">
                    <Icon className="h-4 w-4 text-accent-600 dark:text-accent-400" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-fg">{f.title}</p>
                    <p className="mt-0.5 text-xs leading-relaxed text-muted">{f.body}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Install instructions, tailored to the device that is reading. */}
        <section id="install" className="mt-8 scroll-mt-24">
          <h2 className="font-display text-lg font-bold text-fg">How to install</h2>

          <div className="mt-3 space-y-4">
            <InstallCard
              icon={<Download className="h-4 w-4" />}
              title="Android — install the APK"
              highlighted={isAndroid}
              note="Your phone will ask for permission to install apps from your browser the first time. The APK is signed and under a megabyte."
              steps={ANDROID_STEPS}
              action={
                <a
                  href={APK_URL}
                  download
                  className="inline-flex items-center gap-2 rounded-xl bg-fg px-5 py-2.5 text-sm font-semibold text-canvas transition-opacity hover:opacity-85"
                >
                  <Download className="h-4 w-4" />
                  Download APK{size ? ` (${size})` : ''}
                </a>
              }
            />

            <InstallCard
              icon={<Apple className="h-4 w-4" />}
              title="iPhone & iPad — add to home screen"
              highlighted={platform === 'ios'}
              note="There is no iOS build yet, but Safari runs Sholy Scores as a standalone app once it is added to the home screen."
              steps={IOS_STEPS}
            />

            <InstallCard
              icon={<Monitor className="h-4 w-4" />}
              title="Browser — install the site"
              highlighted={platform === 'desktop'}
              note="On a computer you can run Sholy Scores in its own window, separate from your browser tabs."
              steps={BROWSER_STEPS}
            />
          </div>
        </section>

        {/* Trust / fine print */}
        <section className="mt-8 rounded-2xl border border-line bg-surface p-5 shadow-card">
          <div className="flex items-start gap-3">
            <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-accent-500/10">
              <ShieldCheck className="h-4 w-4 text-accent-600 dark:text-accent-400" />
            </span>
            <div className="text-xs leading-relaxed text-muted">
              <p className="text-sm font-semibold text-fg">Good to know</p>
              <ul className="mt-2 list-disc space-y-1.5 pl-4">
                <li>
                  The app opens this site over HTTPS only — the same data, the same look, wrapped in a
                  full-screen shell.
                </li>
                <li>Scores come from ESPN through this site&apos;s own API proxy.</li>
                <li>
                  Installed an earlier test build? Remove it first: the app was re-signed for release,
                  so Android will refuse to update over it.
                </li>
              </ul>
            </div>
          </div>
        </section>

        <div className="mt-8 text-center">
          <Link
            to="/"
            className="inline-flex items-center gap-2 rounded-xl border border-line bg-surface px-5 py-2.5 text-sm font-semibold text-fg transition-colors hover:border-line-strong"
          >
            Browse live scores
            <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
      </main>
    </>
  );
}

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full border border-line bg-elevated px-2.5 py-1 text-muted">
      {children}
    </span>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div className="px-2 py-3">
      <p className="nums text-sm font-bold text-fg">{value}</p>
      <p className="mt-0.5 text-[10px] font-medium uppercase tracking-wide text-subtle">{label}</p>
    </div>
  );
}

function InstallCard({
  icon,
  title,
  note,
  steps,
  action,
  highlighted,
}: {
  icon: React.ReactNode;
  title: string;
  note: string;
  steps: string[];
  action?: React.ReactNode;
  highlighted?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border bg-surface p-5 shadow-card transition-colors ${
        highlighted ? 'border-accent-500/50' : 'border-line'
      }`}
    >
      <div className="flex items-center gap-2.5">
        <span
          className={`flex h-8 w-8 items-center justify-center rounded-lg ${
            highlighted ? 'bg-accent-500/15 text-accent-600 dark:text-accent-400' : 'bg-elevated text-muted'
          }`}
        >
          {icon}
        </span>
        <h3 className="text-sm font-bold text-fg">{title}</h3>
      </div>
      <p className="mt-2 text-xs leading-relaxed text-muted">{note}</p>
      <ol className="mt-3 space-y-2">
        {steps.map((step, i) => (
          <li key={step} className="flex gap-2.5 text-xs leading-relaxed text-fg">
            <span className="nums flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-elevated text-[10px] font-bold text-muted">
              {i + 1}
            </span>
            <span className="pt-0.5">{step}</span>
          </li>
        ))}
      </ol>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
