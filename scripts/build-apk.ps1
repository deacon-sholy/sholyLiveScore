# Builds the release APK and publishes it where the site serves it.
#
#   npm run apk
#
# Requires JAVA_HOME (JDK 17+) and the Android SDK, plus android/keystore.properties
# for release signing (see README). Output lands in public/downloads/ so Vite copies
# it into dist and the site can hand it out.
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot

$gradle = Join-Path $root 'android\gradlew.bat'
if (-not (Test-Path $gradle)) {
    throw "gradlew.bat not found at $gradle"
}

& $gradle -p (Join-Path $root 'android') assembleRelease --console=plain
if ($LASTEXITCODE -ne 0) {
    throw "Gradle build failed with exit code $LASTEXITCODE"
}

$version = (Select-String -Path (Join-Path $root 'android\app\build.gradle') -Pattern "versionName '([^']+)'").Matches[0].Groups[1].Value
$built = Join-Path $root 'android\app\build\outputs\apk\release\app-release.apk'
$downloads = Join-Path $root 'public\downloads'
New-Item -ItemType Directory -Force -Path $downloads | Out-Null

# Drop stale copies so only the current version is offered for download.
Get-ChildItem -Path $downloads -Filter '*.apk' -ErrorAction SilentlyContinue | Remove-Item -Force
Get-ChildItem -Path $root -Filter 'SholyScores-*.apk' -ErrorAction SilentlyContinue | Remove-Item -Force

Copy-Item $built (Join-Path $downloads "sholy-scores-$version.apk") -Force
Copy-Item $built (Join-Path $root "SholyScores-$version.apk") -Force

Write-Host "Published sholy-scores-$version.apk to public\downloads and the repo root."
