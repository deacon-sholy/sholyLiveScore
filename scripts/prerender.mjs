// Generates static HTML shells with per-route metadata. The SPA still renders
// the content on the client; Netlify serves these files ahead of the /*
// rewrite so crawlers and link previews get the right title/canonical/JSON-LD
// without executing JavaScript.
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const ROOT = process.cwd();
const DIST = join(ROOT, 'dist');
const SITE = 'https://sholylivescore.netlify.app';

const esc = (value) =>
  String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

function inject(base, { title, description, canonical, jsonLd }) {
  // The base index.html already has generic title/og/twitter tags; replace
  // them in place so each shell ends up with exactly one of each.
  let html = base
    .replace(/<title>[\s\S]*?<\/title>/, () => `<title>${esc(title)}</title>`)
    .replace(/(<meta name="description" content=")[^"]*(" \/>)/, (_, b, a) => `${b}${esc(description)}${a}`)
    .replace(/(<meta property="og:title" content=")[^"]*(" \/>)/, (_, b, a) => `${b}${esc(title)}${a}`)
    .replace(/(<meta property="og:description" content=")[^"]*(" \/>)/, (_, b, a) => `${b}${esc(description)}${a}`)
    .replace(/(<meta name="twitter:title" content=")[^"]*(" \/>)/, (_, b, a) => `${b}${esc(title)}${a}`);

  const extra = [
    `<link rel="canonical" href="${canonical}" />`,
    `<meta property="og:url" content="${canonical}" />`,
    `<meta name="twitter:description" content="${esc(description)}" />`,
    jsonLd
      ? `<script type="application/ld+json">${JSON.stringify(jsonLd).replace(/</g, '\\u003c')}</script>`
      : '',
  ]
    .filter(Boolean)
    .join('\n    ');

  return html.replace('</head>', `    ${extra}\n  </head>`);
}

async function leagueDefs() {
  const source = await readFile(join(ROOT, 'src/lib/leagues.ts'), 'utf8');
  const pattern = /\{\s*slug:\s*'([^']+)'[^}]*?name:\s*(?:'([^']*)'|"([^"]*)")/g;
  const defs = [];
  for (const match of source.matchAll(pattern)) {
    defs.push({ slug: match[1], name: match[2] ?? match[3] });
  }
  return defs;
}

const base = await readFile(join(DIST, 'index.html'), 'utf8');
const pages = [
  {
    file: 'index.html',
    title: 'Sholy Livescore · Live Football Scores, Stats & Match Events',
    description:
      'Live football scores, standings, stats & match events for leagues around the world. Premier League, Champions League, La Liga and more.',
    canonical: `${SITE}/`,
  },
  {
    file: 'news.html',
    title: 'Football News · Transfers, Match Reports & Headlines | Sholy Livescore',
    description:
      'The latest football news, transfer stories, match reports and headlines from the Premier League, Champions League, Africa and around the world.',
    canonical: `${SITE}/news`,
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      name: 'Football News',
      description: 'Latest football news and headlines from ESPN.',
      url: `${SITE}/news`,
    },
  },
  {
    file: 'download.html',
    title: 'Download the Sholy Scores App · Sholy Livescore',
    description:
      'Get the free Sholy Scores Android app (APK): live football scores, standings, stats and match events. Lightweight, Android 7.0 and up, no account needed.',
    canonical: `${SITE}/download`,
  },
];

for (const league of await leagueDefs()) {
  pages.push({
    file: `league/${league.slug}.html`,
    title: `${league.name} · Live Scores & Results | Sholy Livescore`,
    description: `${league.name} — live scores, fixtures, results, standings and stats. Following the ${league.name} on Sholy Livescore.`,
    canonical: `${SITE}/league/${league.slug}`,
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      name: `${league.name} — Live Scores`,
      description: `${league.name} live scores, fixtures, results, standings and stats on Sholy Livescore.`,
      url: `${SITE}/league/${league.slug}`,
    },
  });
}

for (const page of pages) {
  const target = join(DIST, page.file);
  await mkdir(join(target, '..'), { recursive: true });
  await writeFile(target, inject(base, page), 'utf8');
}

console.log(`Prerendered ${pages.length} static page shells into dist/`);
