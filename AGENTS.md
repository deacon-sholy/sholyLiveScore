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
- League slugs: PL `eng.1`; Champions League `uefa.champions`, Europa `uefa.europa`, Conference `uefa.europa.conf`; Spain `esp.1`, Italy `ita.1`, Germany `ger.1`, France `fra.1`, Turkey `tur.1`, Netherlands `ned.1`, Portugal `por.1`, USA `usa.1`, Saudi `ksa.1` (NOT `sau.1` — that 400s), India `ind.1`. `qat.1`/`uae.1` don't exist in the scoreboard API. `eng.1` and `rus.1` both display "Premier League" (name collision).
- Scraped/blocked: league top-scorers endpoints return 404/400 for soccer — do not pursue.

## Architecture shortcuts
- `?league&event` on the function returns second participant as `Assist: <name>`; the UI must fetch detail (scoreboard events lack assists). App.tsx `handleMatchClick` triggers `fetchMatchDetail`.
- Favorites are client-side only: `src/lib/useFavorites.ts`, localStorage key `sholy-favorite-leagues`; the "favorites" filter fetches `all` then filters in the client.
- Analytics: `src/lib/analytics.ts` injects gtag only when `VITE_GA_ID` is set; no-op otherwise.
- Known legacy cleanup: `C:\Users\dell\AppData\Local\Temp\opencode\deploy-check` and `api-worktree.ts` are obsolete temp clones/backups — ignore.