# Sholy Livescore

Live football scores, standings, stats & match events. Backed by the ESPN soccer API through a Netlify Functions proxy.

- Live site: https://sholylivescore.netlify.app
- Stack: React (Vite) + TypeScript, Tailwind, Netlify Functions, GitHub Actions

## Scripts

- `npm run dev` — local dev (functions run via `netlify dev`)
- `npm run build` — production build to `dist/`
- `npm run typecheck` — `tsc` for app + functions
- `npm run lint` — eslint
- `npm run preview` — preview the built app

## Manual deploy

Build from the repo root, then deploy without a rebuild:

```
npm run build
netlify deploy --dir=dist --functions=netlify/functions --prod --site ecbf0521-f10a-499b-9cb9-d2975fd3616d --no-build
```

`--no-build` is required because the `netlify.toml` build command breaks CLI deploys.

## Android app

`android/` is a plain Gradle project (`applicationId com.sholylivescore.scores`, minSdk 24, targetSdk 35) that wraps the deployed site in a WebView. It loads the production origin rather than bundling the build, so the app always shows the current deploy and the API calls stay same-origin.

Requires a JDK (17+) and the Android SDK. Point `android/local.properties` at your SDK (`sdk.dir=...`) if it is not found automatically, then:

```
set JAVA_HOME=<path-to-jdk>
.\android\gradlew.bat -p android assembleDebug
```

The APK lands in `android/app/build/outputs/apk/debug/app-debug.apk`. A copy is kept at the repo root as `SholyScores-1.0.0-debug.apk` for sideloading; it is debug-signed, so it is not distributable as-is.

### How insets are handled

Target SDK 35 draws the app behind the status and navigation bars, so the activity opts into edge-to-edge and the WebView pads itself by the system-bar, display-cutout and IME insets. Because the insets are applied natively, the page is told to stand down: the shell adds a `native-shell` class to `<html>`, and the `.safe-t` / `.safe-b` / `.safe-x` helpers in `src/index.css` zero themselves out under it. In a mobile browser those same helpers use `env(safe-area-inset-*)`, so each surface applies the insets exactly once. Before Android 11 the window still fits its own content, so the native padding is skipped to avoid doubling it.

## Operator checklist — items that need a human

These only need your account-doable actions. Until they're done, deploys stay manual.

1. **Revoke the leaked Supabase token.** A Supabase personal access token was posted in chat history during development. Revoke it at Supabase Dashboard → Project → Settings → API → Revoke. Do not commit new tokens or `.env` files.
2. **Enable push-to-deploy in CI.** Add two GitHub repository secrets (Settings → Secrets and variables → Actions):
   - `NETLIFY_AUTH_TOKEN` — create at https://app.netlify.com/user/applications#personal-access-tokens
   - `NETLIFY_SITE_ID` — `ecbf0521-f10a-499b-9cb9-d2975fd3616d` (Netlify → Site Settings → General → Site details)
   The workflow in `.github/workflows/deploy.yml` then deploys on every push to `main`. Without these secrets the job fails fast with setup instructions.
3. **Custom domain.** Connect a domain in Netlify → Site Settings → Domain management (DNS is user-side).
4. **Monetization.** Google AdSense needs your own Google account approval to display ads.
5. **Analytics.** Set `VITE_GA_ID` (Google Analytics Measurement ID) at build time to enable gtag; it is a no-op when unset.