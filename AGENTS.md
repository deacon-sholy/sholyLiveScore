# Repo notes for AI coding sessions

## Verification & health
- Build: `npm run build`. Typecheck: `npm run typecheck`. Lint: `npm run lint`. Run all three before finishing any change.
- Commit message style: lowercase imperative, e.g. `feat: premier league first in stable league order; add saudi pro league, indian super league`.
- Uncommitted work should always end a session committed + pushed (`git push`) and, if the site should be live, manually deployed.

## Deploy
- Manual (CI is a no-op until GitHub secrets are set — see README "Operator checklist"):
  `netlify deploy --dir=dist --functions=netlify/functions --prod --site ecbf0521-f10a-499b-9cb9-d2975fd3616d --no-build` (run `npm run build` first; always pass `--no-build`).
- Verifying the live site: use `curl.exe -4` — Windows curl prefers IPv6 and returns HTTP 000 otherwise.
- Netlify function execution ≈10s limit. A slow ESPN summary (occasionally ~9s+) can kill a `?league&event` detail request with HTTP 000. Retry once / try another live match; normal latency is ~2–3s. Nothing to fix on our side.

## Data source (ESPN)
- Scores: `https://site.web.api.espn.com/apis/site/v2/sports/soccer/{slug}/scoreboard?...`
- Summaries (events, stats, form, h2h): `https://site.web.api.espn.com/apis/site/v2/sports/soccer/{slug}/summary?event={id}`
  - `boxscore.teams[].statistics[]` keys: `possessionPct`, `totalShots`, `shotsOnTarget`, `wonCorners`, `foulsCommitted`, `yellowCards`, `redCards`, `offsides`, `saves`, `accuratePasses`, `totalPasses`, `passPct` (0–1 scale).
  - `lastFiveGames[].events[]`: `gameResult` (W/D/L), `opponent`, `score`, `atVs`, `gameDate`.
  - `seasonseries[]`: `title`/`summary` for H2H.
  - Rosters are empty even for finished matches — lineups are NOT available.
  - `summary.keyEvents` is the event source of truth. `header.competitions[0].details` is trimmed to ~2 nameless rows for some tournament finals (e.g. the World Cup final exposes 8 events in the scoreboard but only 2 in the summary header). `keyEvents` has full names/assists; use `details` only when `keyEvents` is missing.
  - `keyEvents` shapes events differently per competition: most use `athletesInvolved[]`; friendlies rely on `team.id`. `mapEvent` handles both and falls back to home/away team ids.
  - `substitution` events list the incoming player first, so the second participant is who comes **off** (`Off: X`).
- League slugs: PL `eng.1`; Champions League `uefa.champions`, Europa `uefa.europa`, Conference `uefa.europa.conf`; Spain `esp.1`, Italy `ita.1`, Germany `ger.1`, France `fra.1`, Turkey `tur.1`, Netherlands `ned.1`, Portugal `por.1`, USA `usa.1`, Saudi `ksa.1` (NOT `sau.1` — that 400s), India `ind.1`. `qat.1`/`uae.1` don't exist in the scoreboard API. `eng.1` and `rus.1` both display "Premier League" (name collision). Women's slugs: `eng.w.1`.
- International slugs: `fifa.world`, `fifa.friendly`, `uefa.nations`, `uefa.euro`, `fifa.cwc`, `fifa.worldq.uefa`, `fifa.worldq.conmebol`, `fifa.worldq.concacaf`, `fifa.worldq.afc`, `fifa.worldq.caf`.
- International team logos: national teams expose `team.logos[0].href` rather than `team.logo`; read both.
- Scraped/blocked: league top-scorers endpoints return 404/400 for soccer — do not pursue.

## Architecture shortcuts
- `src/lib/leagues.ts` is the single source of truth for the league list (order, grouping, `standings` support, `seoName` disambiguation). Client and both functions import it; there is no `netlify/functions/leagues.ts` and no `LEAGUE_META` copy in `seo.ts`. Functions reach it via `../../src/lib/leagues`, so Netlify's bundler must follow cross-directory relative imports.
- `?league&event` on the function now returns a fully built `match` plus `events`/`stats`/`form`/`h2h` from the summary, so `MatchPage` needs only one request and works for any past date.
- Single league fetch: `?league=<slug>[&date=YYYY-MM-DD]` returns that league's scoreboard only (used by `/league/:slug`).
- Standings: `?standings=<slug>` returns `groups[]` so World Cup/Euro show per-group tables; domestic leagues return a single implicit group. `standings: false` entries (friendlies) have no table.
- The all-leagues fan-out is capped at 8s with a shared deadline, per-request timeouts derived from remaining time, and 1 attempt when <3s remain. Unfinished leagues fall back to stale cache. Keep total runtime under Netlify's ~10s limit.
- Routes (react-router-dom): `/` home, `/league/:slug`, `/league/:slug/match/:id`. Every page sets title/description/canonical (+ JSON-LD via `src/lib/seo.ts`). `src/pages/` = HomePage, LeaguePage, MatchPage; shared chrome is `SiteHeader` + App shell.
- Sitemap: `netlify/functions/sitemap.ts` (redirect from `/sitemap.xml` in netlify.toml; league URLs come from `src/lib/leagues.ts`). No `<lastmod>` — ESPN gives no update timestamp and guessing it hurts SEO.
- Favorites are client-side only: `src/lib/useFavorites.ts`, localStorage key `sholy-favorite-leagues`; the "favorites" filter fetches `all` then filters in the client.
- Analytics: `src/lib/analytics.ts` injects gtag only when `VITE_GA_ID` is set; no-op otherwise.
- Known legacy cleanup: `C:\Users\dell\AppData\Local\Temp\opencode\deploy-check` and `api-worktree.ts` are obsolete temp clones/backups — ignore.