package com.xunfu.app;

import android.app.Activity;
import android.app.DownloadManager;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.os.Environment;
import android.view.View;
import android.view.WindowInsets;
import android.webkit.CookieManager;
import android.webkit.DownloadListener;
import android.webkit.URLUtil;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.FrameLayout;
import android.widget.Toast;

/** Native Android container; the website owns navigation and the mobile bottom menu. */
public final class MainActivity extends Activity {
    private static final int FILE_REQUEST = 1001;
    private WebView webView;
    private ValueCallback<Uri[]> uploadCallback;
    private String serverUrl;
    private Uri serverUri;

    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        serverUrl = getString(com.xunfu.app.R.string.server_url);
        serverUri = Uri.parse(serverUrl);
        FrameLayout root = new FrameLayout(this);
        root.setBackgroundColor(0xFFF8F8F4);
        root.setOnApplyWindowInsetsListener(new View.OnApplyWindowInsetsListener() {
            @Override public WindowInsets onApplyWindowInsets(View view, WindowInsets insets) {
                view.setPadding(insets.getSystemWindowInsetLeft(), insets.getSystemWindowInsetTop(),
                    insets.getSystemWindowInsetRight(), insets.getSystemWindowInsetBottom());
                return insets.consumeSystemWindowInsets();
            }
        });
        getWindow().getDecorView().setSystemUiVisibility(View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR);
        getWindow().setStatusBarColor(0xFFF8F8F4);
        getWindow().setNavigationBarColor(0xFFF8F8F4);
        webView = new WebView(this);
        root.addView(webView, new FrameLayout.LayoutParams(-1, -1));
        setContentView(root);
        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(true);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        settings.setMediaPlaybackRequiresUserGesture(true);
        settings.setUserAgentString(settings.getUserAgentString() + " XunfuAndroid/" + getString(R.string.version_name));
        CookieManager.getInstance().setAcceptCookie(true);
        CookieManager.getInstance().setAcceptThirdPartyCookies(webView, false);
        webView.setWebViewClient(new WebViewClient() {
            @Override public boolean shouldOverrideUrlLoading(WebView view, String url) {
                return handleNavigation(url);
            }
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                return handleNavigation(request.getUrl().toString());
            }
            @Override public void onReceivedError(WebView view, WebResourceRequest request, WebResourceError error) {
                if (request.isForMainFrame()) {
                    String html = "<!doctype html><meta name='viewport' content='width=device-width,initial-scale=1'>"
                        + "<body style='margin:0;background:#f8f8f4;font-family:sans-serif;color:#18211d;display:flex;"
                        + "align-items:center;justify-content:center;min-height:100vh;text-align:center'><main>"
                        + "<h1 style='font-size:24px'>暂时无法连接</h1><p style='color:#6b736d'>请检查网络连接后重试</p>"
                        + "<a style='display:inline-block;padding:12px 28px;border-radius:28px;background:#d5ef6a;color:#18211d;text-decoration:none' href='"
                        + serverUrl.replace("&", "&amp;").replace("'", "&#39;") + "'>重新加载</a></main></body>";
                    view.loadDataWithBaseURL(serverUrl, html, "text/html", "UTF-8", null);
                }
            }
        });
        webView.setWebChromeClient(new WebChromeClient() {
            @Override public boolean onShowFileChooser(WebView view, ValueCallback<Uri[]> callback, FileChooserParams params) {
                if (uploadCallback != null) uploadCallback.onReceiveValue(null);
                uploadCallback = callback;
                try {
                    Intent intent = params.createIntent();
                    intent.addCategory(Intent.CATEGORY_OPENABLE);
                    startActivityForResult(intent, FILE_REQUEST);
                } catch (ActivityNotFoundException error) {
                    uploadCallback.onReceiveValue(null);
                    uploadCallback = null;
                    Toast.makeText(MainActivity.this, "未找到文件选择器", Toast.LENGTH_SHORT).show();
                }
                return true;
            }
        });
        webView.setDownloadListener(new DownloadListener() {
            @Override public void onDownloadStart(String url, String userAgent, String disposition, String mimeType, long length) {
                if (!(url.startsWith("https://") || url.startsWith("http://"))) {
                    Toast.makeText(MainActivity.this, "请在浏览器中下载此文件", Toast.LENGTH_LONG).show();
                    return;
                }
                try {
                    String fileName = URLUtil.guessFileName(url, disposition, mimeType);
                    DownloadManager.Request request = new DownloadManager.Request(Uri.parse(url));
                    request.setTitle(fileName);
                    request.setDescription("AI人脉工具文件下载");
                    if (mimeType != null) request.setMimeType(mimeType);
                    request.addRequestHeader("User-Agent", userAgent);
                    if (isSameOrigin(Uri.parse(url))) {
                        String cookie = CookieManager.getInstance().getCookie(url);
                        if (cookie != null) request.addRequestHeader("Cookie", cookie);
                    }
                    request.setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED);
                    request.setDestinationInExternalFilesDir(MainActivity.this, Environment.DIRECTORY_DOWNLOADS, fileName);
                    ((DownloadManager) getSystemService(DOWNLOAD_SERVICE)).enqueue(request);
                    Toast.makeText(MainActivity.this, "已开始下载，请查看系统通知", Toast.LENGTH_LONG).show();
                } catch (Exception error) {
                    openExternal(Uri.parse(url));
                }
            }
        });
        if (state == null || webView.restoreState(state) == null) webView.loadUrl(serverUrl);
    }

    private boolean isSameOrigin(Uri uri) {
        return serverUri.getScheme().equalsIgnoreCase(uri.getScheme())
            && serverUri.getHost().equalsIgnoreCase(uri.getHost())
            && serverUri.getPort() == uri.getPort();
    }

    private boolean handleNavigation(String url) {
        Uri uri = Uri.parse(url);
        String scheme = uri.getScheme();
        if ("http".equalsIgnoreCase(scheme) || "https".equalsIgnoreCase(scheme)) {
            if (isSameOrigin(uri)) return false;
            openExternal(uri);
        } else if ("mailto".equalsIgnoreCase(scheme) || "tel".equalsIgnoreCase(scheme)) {
            openExternal(uri);
        }
        return true;
    }

    private void openExternal(Uri uri) {
        try {
            Intent intent = new Intent(Intent.ACTION_VIEW, uri);
            intent.addCategory(Intent.CATEGORY_BROWSABLE);
            startActivity(intent);
        } catch (ActivityNotFoundException error) {
            Toast.makeText(this, "没有可以打开此链接的应用", Toast.LENGTH_SHORT).show();
        }
    }

    @Override protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode == FILE_REQUEST && uploadCallback != null) {
            uploadCallback.onReceiveValue(WebChromeClient.FileChooserParams.parseResult(resultCode, data));
            uploadCallback = null;
        }
    }

    @Override protected void onSaveInstanceState(Bundle state) {
        webView.saveState(state);
        super.onSaveInstanceState(state);
    }

    @Override protected void onPause() {
        CookieManager.getInstance().flush();
        webView.onPause();
        super.onPause();
    }

    @Override protected void onResume() {
        super.onResume();
        if (webView != null) webView.onResume();
    }

    @Override public void onBackPressed() {
        if (webView.canGoBack()) webView.goBack();
        else super.onBackPressed();
    }

    @Override protected void onDestroy() {
        if (uploadCallback != null) uploadCallback.onReceiveValue(null);
        webView.destroy();
        super.onDestroy();
    }
}
