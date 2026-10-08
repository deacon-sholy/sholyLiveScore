package com.sholylivescore.scores;

import android.annotation.SuppressLint;
import android.app.Activity;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.content.pm.ApplicationInfo;
import android.graphics.Color;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.view.View;
import android.view.ViewGroup;
import android.view.Window;
import android.view.WindowInsets;
import android.view.WindowInsetsController;
import android.webkit.ServiceWorkerClient;
import android.webkit.ServiceWorkerController;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

/**
 * Hosts the deployed Sholy Livescore site in a full-screen WebView.
 *
 * The site is loaded from its production origin rather than bundled, so the app
 * always shows the current deploy and the API calls stay same-origin (no CORS
 * changes required).
 */
public class MainActivity extends Activity {

    private static final String HOME_URL = "https://sholylivescore.netlify.app/";
    private static final Uri HOME_URI = Uri.parse(HOME_URL);
    private static final int BRAND_BG = 0xFF070B14;

    /**
     * Shown when the main frame cannot be loaded. Chromium's own error page
     * would break the shell's look (and its dark palette), and once the
     * service worker has a shell cached the site keeps working offline anyway,
     * so this only appears before anything is cached.
     */
    private static final String OFFLINE_HTML = """
            <!doctype html>
            <html lang="en">
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
              <title>Sholy Scores</title>
              <style>
                :root { color-scheme: dark; }
                * { box-sizing: border-box; }
                body {
                  margin: 0; min-height: 100vh; display: flex; align-items: center; justify-content: center;
                  padding: 24px; background: #070b14; color: #e5e9f2; text-align: center;
                  font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
                }
                .card { max-width: 22rem; }
                .bolt {
                  width: 56px; height: 56px; margin: 0 auto 20px; border-radius: 16px;
                  display: flex; align-items: center; justify-content: center;
                  background: linear-gradient(135deg, #34d399, #059669);
                  box-shadow: 0 10px 30px -12px rgba(16, 185, 129, 0.55);
                }
                h1 { margin: 0 0 8px; font-size: 1.25rem; font-weight: 700; }
                p { margin: 0 0 24px; font-size: 0.875rem; line-height: 1.55; color: #94a3b8; }
                button {
                  font: 600 0.875rem/1 system-ui, sans-serif; color: #070b14; background: #f7f9fc;
                  border: 0; border-radius: 12px; padding: 14px 26px; cursor: pointer;
                }
                button:active { opacity: 0.85; }
              </style>
            </head>
            <body>
              <div class="card">
                <div class="bolt">
                  <svg width="26" height="26" viewBox="0 0 24 24" fill="#04321f" aria-hidden="true">
                    <path d="M13 2L4.5 13.5H11L9.5 22 19 10h-6.5L13 2z"/>
                  </svg>
                </div>
                <h1>You're offline</h1>
                <p>Sholy Scores needs a connection to pull live scores. Check your network and try again.</p>
                <button onclick="location.replace('https://sholylivescore.netlify.app/')">Try again</button>
              </div>
            </body>
            </html>
            """;

    private WebView webView;

    @SuppressLint("SetJavaScriptEnabled")
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        applyEdgeToEdge();

        // Without this the service worker never runs, so the app would have no
        // cached shell to fall back on.
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            ServiceWorkerController.getInstance().setServiceWorkerClient(new ServiceWorkerClient() {
                @Override
                public WebResourceResponse shouldInterceptRequest(WebResourceRequest request) {
                    return null;
                }
            });
        }

        webView = new WebView(this);
        webView.setBackgroundColor(BRAND_BG);
        webView.setLayoutParams(new ViewGroup.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT));
        webView.setOverScrollMode(WebView.OVER_SCROLL_NEVER);

        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setUseWideViewPort(true);
        settings.setLoadWithOverviewMode(true);
        settings.setSupportZoom(false);
        settings.setBuiltInZoomControls(false);
        settings.setDisplayZoomControls(false);
        settings.setJavaScriptCanOpenWindowsAutomatically(false);
        settings.setSupportMultipleWindows(false);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        settings.setMediaPlaybackRequiresUserGesture(true);
        settings.setCacheMode(WebSettings.LOAD_DEFAULT);
        // The shell only ever renders the site over https, so local file and
        // content access would just widen the attack surface.
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(false);
        settings.setGeolocationEnabled(false);

        if ((getApplicationInfo().flags & ApplicationInfo.FLAG_DEBUGGABLE) != 0) {
            WebView.setWebContentsDebuggingEnabled(true);
        }

        // The site is a SPA: keep in-app navigation inside the WebView and hand
        // anything off-origin to the system so the shell can't browse other sites.
        webView.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                Uri url = request.getUrl();
                if (isInternal(url)) {
                    return false;
                }
                openExternally(url);
                return true;
            }

            @Override
            public void onPageFinished(WebView view, String url) {
                super.onPageFinished(view, url);
                standDownAsNativeShell();
            }

            @Override
            public void onReceivedError(WebView view, WebResourceRequest request, WebResourceError error) {
                super.onReceivedError(view, request, error);
                // Sub-resources fail quietly; only a dead main frame needs the
                // branded fallback. HTTP 4xx/5xx arrive at onReceivedHttpError.
                if (request.isForMainFrame()) {
                    view.loadDataWithBaseURL(HOME_URL, OFFLINE_HTML, "text/html", "utf-8", null);
                }
            }
        });
        webView.setWebChromeClient(new WebChromeClient());

        setContentView(webView);
        insetWebView();
        webView.loadUrl(targetUrl());
    }

    /**
     * App Links hand the tapped URL to the activity instead of the launcher
     * home page. Anything that is not on our own origin falls back to the home
     * page, so a spoofed intent can never make the shell load a foreign site.
     */
    private String targetUrl() {
        Uri data = getIntent() != null ? getIntent().getData() : null;
        return data != null && isInternal(data) ? data.toString() : HOME_URL;
    }

    /**
     * Target SDK 35 lays the app out behind the status and navigation bars, so
     * the window is told to stay edge-to-edge and the WebView insets itself. The
     * bars themselves are transparent so the page background runs underneath
     * them, and the site is dark everywhere, hence the light (white) icons.
     */
    @SuppressWarnings("deprecation")
    private void applyEdgeToEdge() {
        Window window = getWindow();
        window.setStatusBarColor(Color.TRANSPARENT);
        window.setNavigationBarColor(Color.TRANSPARENT);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            window.setDecorFitsSystemWindows(false);
            window.getInsetsController().setSystemBarsAppearance(0,
                    WindowInsetsController.APPEARANCE_LIGHT_STATUS_BARS
                            | WindowInsetsController.APPEARANCE_LIGHT_NAVIGATION_BARS);
        }
    }

    /**
     * Pads the WebView by the window insets so content clears the status bar,
     * any display cutout and the navigation bar.
     */
    private void insetWebView() {
        // Before Android 11 the window still fits its own content, so the system
        // has already inset the WebView and padding it again would double up.
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.R) {
            return;
        }
        webView.setOnApplyWindowInsetsListener((v, insets) -> {
            android.graphics.Insets bars = insets.getInsets(
                    WindowInsets.Type.systemBars() | WindowInsets.Type.displayCutout());
            // An edge-to-edge window no longer resizes for the keyboard, so the
            // IME height joins the bottom inset. The IME inset already covers the
            // navigation bar while it is open.
            int bottom = Math.max(bars.bottom, insets.getInsets(WindowInsets.Type.ime()).bottom);
            v.setPadding(bars.left, bars.top, bars.right, bottom);
            return insets;
        });
        webView.requestApplyInsets();
    }

    /**
     * The site carries CSS safe-area padding, which is what a mobile browser
     * needs. The shell insets the WebView natively instead, so the page is told
     * to stand down rather than have the same insets applied twice.
     */
    private void standDownAsNativeShell() {
        webView.evaluateJavascript(
                "document.documentElement.classList.add('native-shell');", null);
    }

    private boolean isInternal(Uri url) {
        return url != null
                && "https".equals(url.getScheme())
                && HOME_URI.getHost().equals(url.getHost());
    }

    private void openExternally(Uri url) {
        String scheme = url.getScheme();
        if (scheme == null) {
            return;
        }
        if (!"http".equals(scheme) && !"https".equals(scheme)
                && !"mailto".equals(scheme) && !"tel".equals(scheme)) {
            return;
        }
        try {
            startActivity(new Intent(Intent.ACTION_VIEW, url));
        } catch (ActivityNotFoundException ignored) {
            // Nothing installed can handle it, so stay where we are.
        }
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        // singleTask delivers follow-up link taps here, so the intent has to be
        // replaced or the next rotation/recreation would replay the old one.
        setIntent(intent);
        Uri data = intent.getData();
        if (webView != null && data != null && isInternal(data)) {
            webView.loadUrl(data.toString());
        }
    }

    @Override
    protected void onResume() {
        super.onResume();
        if (webView != null) {
            webView.onResume();
        }
    }

    @Override
    protected void onPause() {
        if (webView != null) {
            webView.onPause();
        }
        super.onPause();
    }

    @Override
    public void onBackPressed() {
        if (webView != null && webView.canGoBack()) {
            webView.goBack();
            return;
        }
        super.onBackPressed();
    }

    @Override
    protected void onDestroy() {
        if (webView != null) {
            webView.setOnApplyWindowInsetsListener(null);
            webView.setWebChromeClient(null);
            webView.setWebViewClient(new WebViewClient());
            webView.removeAllViews();
            webView.destroy();
            webView = null;
        }
        super.onDestroy();
    }
}
