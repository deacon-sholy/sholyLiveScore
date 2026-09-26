# Keep the WebView entry point; nothing else is reflected so defaults are fine.
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}
