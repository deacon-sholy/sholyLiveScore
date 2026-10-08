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

Three extras make it behave like a real app: verified App Links (`android:autoVerify`) open `https://sholylivescore.netlify.app/...` URLs inside the app instead of the browser, backed by `public/.well-known/assetlinks.json`; link intents land on the tapped page rather than the home page; and a branded offline page with a retry button replaces Chromium's error page when nothing is cached yet.

### Building the APK

Requires a JDK (17+) and the Android SDK. Point `android/local.properties` at your SDK (`sdk.dir=...`) if it is not found automatically, then:

```
npm run apk
```

`scripts/build-apk.ps1` runs `gradlew assembleRelease` and publishes the result twice: `public/downloads/sholy-scores-<version>.apk` (served by the site and linked from `/download`) and a copy at the repo root as `SholyScores-<version>.apk`. For an unsigned-check debug build use `.\android\gradlew.bat -p android assembleDebug` instead — the APK lands in `android/app/build/outputs/apk/debug/`.

When cutting a release, bump `versionName`/`versionCode` in `android/app/build.gradle` and `APP_VERSION` in `src/lib/appInfo.ts` together — the download page builds its link and filename from it.

### Release signing

The release build is signed from `android/keystore.properties` + `android/sholy-release.keystore`. Both are gitignored: the key is never committed. **Back the keystore and the properties file up somewhere off this machine** — if they are lost, every installed copy has to be uninstalled and reinstalled, because Android refuses upgrades signed by a different key. If they are missing, the build falls back to the debug key so a fresh clone still produces an installable APK.

Installing over the older `SholyScores-1.0.0-debug.apk` test build needs an uninstall first: it was signed with a different key.

The release fingerprint also lives in `public/.well-known/assetlinks.json` (regenerate with `keytool -list -v` and paste the SHA-256 value) — Android checks it before handing links to the app.

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
6. **Back up the Android signing key.** Copy `android/sholy-release.keystore` and `android/keystore.properties` to a password manager or other off-repo safe. They are gitignored on purpose, so nothing else preserves them.