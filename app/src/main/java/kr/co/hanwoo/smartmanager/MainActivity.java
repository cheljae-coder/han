package kr.co.hanwoo.smartmanager;

import android.app.Activity;
import android.content.ContentValues;
import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.provider.MediaStore;
import android.provider.Settings;
import android.util.Base64;
import android.view.ViewGroup;
import android.webkit.JavascriptInterface;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Toast;

import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;

public final class MainActivity extends Activity {
    private static final int OPEN_FILE_REQUEST = 1001;
    private static final int SAVE_FILE_REQUEST = 1002;
    private WebView webView;
    private ValueCallback<Uri[]> fileCallback;
    private Uri cameraImageUri;
    private byte[] pendingFileBytes;
    private String pendingFileMime;
    private String pendingIncomingLicense;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        webView = new WebView(this);
        webView.setLayoutParams(new ViewGroup.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.MATCH_PARENT));
        setContentView(webView);

        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setAllowFileAccess(true);
        settings.setAllowContentAccess(true);
        settings.setAllowFileAccessFromFileURLs(true);
        settings.setAllowUniversalAccessFromFileURLs(true);
        settings.setMediaPlaybackRequiresUserGesture(false);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_COMPATIBILITY_MODE);
        settings.setUserAgentString(settings.getUserAgentString() + " SmartHanwooManager-R50-Android");

        webView.addJavascriptInterface(new AndroidBridge(), "AndroidBridge");
        webView.setWebViewClient(new WebViewClient() {
            @Override
            public void onPageFinished(WebView view, String url) {
                deliverIncomingLicense();
            }

            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                return request != null && request.isForMainFrame() && openExternalLink(request.getUrl());
            }

            @SuppressWarnings("deprecation")
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, String url) {
                return url != null && openExternalLink(Uri.parse(url));
            }
        });
        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public boolean onShowFileChooser(
                    WebView view,
                    ValueCallback<Uri[]> callback,
                    FileChooserParams params) {
                if (fileCallback != null) fileCallback.onReceiveValue(null);
                fileCallback = callback;
                String[] accepts = params == null ? null : params.getAcceptTypes();
                String mime = FileChooserMime.resolve(accepts);

                Intent files = new Intent(Intent.ACTION_OPEN_DOCUMENT);
                files.addCategory(Intent.CATEGORY_OPENABLE);
                files.setType(mime);
                files.putExtra(Intent.EXTRA_ALLOW_MULTIPLE, false);

                Intent chooser = Intent.createChooser(files, "파일 선택");
                boolean cameraRequested = params != null && params.isCaptureEnabled();
                if (mime.startsWith("image/") && cameraRequested) {
                    Intent camera = new Intent(MediaStore.ACTION_IMAGE_CAPTURE);
                    cameraImageUri = createCameraImageUri();
                    if (cameraImageUri != null) {
                        camera.putExtra(MediaStore.EXTRA_OUTPUT, cameraImageUri);
                        camera.addFlags(Intent.FLAG_GRANT_WRITE_URI_PERMISSION | Intent.FLAG_GRANT_READ_URI_PERMISSION);
                        chooser.putExtra(Intent.EXTRA_INITIAL_INTENTS, new Intent[]{camera});
                    }
                }
                try {
                    startActivityForResult(chooser, OPEN_FILE_REQUEST);
                } catch (Exception error) {
                    if (fileCallback != null) fileCallback.onReceiveValue(null);
                    fileCallback = null;
                    deleteTemporaryCameraImage();
                    Toast.makeText(MainActivity.this,
                            "파일 선택창을 열지 못했습니다: " + error.getMessage(),
                            Toast.LENGTH_LONG).show();
                }
                return true;
            }

            @Override
            public void onCloseWindow(WebView window) {
                finishAndRemoveTask();
            }
        });

        if (savedInstanceState == null) webView.loadUrl("file:///android_asset/index.html");
        else webView.restoreState(savedInstanceState);
        readIncomingLicense(getIntent());
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        readIncomingLicense(intent);
        deliverIncomingLicense();
    }

    private void readIncomingLicense(Intent intent) {
        if (intent == null || !Intent.ACTION_VIEW.equals(intent.getAction()) || intent.getData() == null) return;
        try (InputStream input = getContentResolver().openInputStream(intent.getData())) {
            if (input == null) return;
            String token = new String(readAll(input), StandardCharsets.UTF_8).trim();
            if (token.startsWith("SHM1.") && token.length() < 20000) pendingIncomingLicense = token;
            else Toast.makeText(this, "올바른 한우관리 연장파일이 아닙니다.", Toast.LENGTH_LONG).show();
        } catch (Exception error) {
            Toast.makeText(this, "연장파일을 읽지 못했습니다: " + error.getMessage(), Toast.LENGTH_LONG).show();
        }
    }

    private void deliverIncomingLicense() {
        if (webView == null || pendingIncomingLicense == null) return;
        String encoded = Base64.encodeToString(
                pendingIncomingLicense.getBytes(StandardCharsets.UTF_8), Base64.NO_WRAP);
        pendingIncomingLicense = null;
        webView.evaluateJavascript(
                "window.smartHanwooApplyIncomingLicense && window.smartHanwooApplyIncomingLicense(atob('" + encoded + "'))",
                null);
    }

    private Uri createCameraImageUri() {
        try {
            ContentValues values = new ContentValues();
            values.put(MediaStore.Images.Media.DISPLAY_NAME, "hanwoo_" + System.currentTimeMillis() + ".jpg");
            values.put(MediaStore.Images.Media.MIME_TYPE, "image/jpeg");
            return getContentResolver().insert(MediaStore.Images.Media.EXTERNAL_CONTENT_URI, values);
        } catch (Exception ignored) {
            return null;
        }
    }

    private void deleteTemporaryCameraImage() {
        if (cameraImageUri == null) return;
        try {
            getContentResolver().delete(cameraImageUri, null, null);
        } catch (Exception ignored) {
            // The media provider may already have removed an incomplete item.
        }
        cameraImageUri = null;
    }

    @Override
    protected void onSaveInstanceState(Bundle outState) {
        webView.saveState(outState);
        super.onSaveInstanceState(outState);
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode == OPEN_FILE_REQUEST) {
            Uri[] result = null;
            if (resultCode == RESULT_OK) {
                if (data != null && data.getData() != null) result = new Uri[]{data.getData()};
                else if (cameraImageUri != null) result = new Uri[]{cameraImageUri};
            }
            if (cameraImageUri != null
                    && (result == null || result.length == 0 || !cameraImageUri.equals(result[0]))) {
                deleteTemporaryCameraImage();
            }
            if (fileCallback != null) fileCallback.onReceiveValue(result);
            fileCallback = null;
            cameraImageUri = null;
        } else if (requestCode == SAVE_FILE_REQUEST) {
            if (resultCode == RESULT_OK && data != null && data.getData() != null && pendingFileBytes != null) {
                try (OutputStream stream = getContentResolver().openOutputStream(data.getData())) {
                    if (stream == null) throw new IllegalStateException("저장 위치를 열 수 없습니다.");
                    stream.write(pendingFileBytes);
                    Toast.makeText(this, "파일을 저장했습니다.", Toast.LENGTH_SHORT).show();
                } catch (Exception error) {
                    Toast.makeText(this, "파일 저장 실패: " + error.getMessage(), Toast.LENGTH_LONG).show();
                }
            }
            pendingFileBytes = null;
            pendingFileMime = null;
        }
    }

    @Override
    public void onBackPressed() {
        if (webView != null && webView.canGoBack()) webView.goBack();
        else Toast.makeText(this, "프로그램을 끝내려면 종료 메뉴를 이용해 주세요.", Toast.LENGTH_SHORT).show();
    }

    @Override
    protected void onDestroy() {
        if (fileCallback != null) fileCallback.onReceiveValue(null);
        fileCallback = null;
        if (webView != null) {
            webView.removeJavascriptInterface("AndroidBridge");
            webView.destroy();
            webView = null;
        }
        super.onDestroy();
    }

    public final class AndroidBridge {
        @JavascriptInterface
        public String getDeviceId() {
            String androidId = Settings.Secure.getString(getContentResolver(), Settings.Secure.ANDROID_ID);
            return "ANDROID-" + shortHash(getPackageName() + ":" + (androidId == null ? "unknown" : androidId));
        }

        @JavascriptInterface
        public String getLicenseState() {
            return getSharedPreferences("smart_hanwoo_license", MODE_PRIVATE).getString("state", "{}");
        }

        @JavascriptInterface
        public void setLicenseState(String json) {
            getSharedPreferences("smart_hanwoo_license", MODE_PRIVATE)
                    .edit().putString("state", json == null ? "{}" : json).apply();
        }

        @JavascriptInterface
        public String fetchMarketXml(String requestUrl) {
            HttpURLConnection connection = null;
            try {
                URL url = new URL(requestUrl);
                if (!"data.ekape.or.kr".equalsIgnoreCase(url.getHost())) {
                    return "ERROR:허용되지 않은 시세 조회 주소입니다.";
                }
                connection = (HttpURLConnection) url.openConnection();
                connection.setConnectTimeout(10000);
                connection.setReadTimeout(10000);
                connection.setRequestMethod("GET");
                connection.setRequestProperty("Accept", "application/xml,text/xml,*/*");
                connection.setRequestProperty("User-Agent", "SmartHanwooManager-R50-Android");
                int status = connection.getResponseCode();
                InputStream input = status >= 200 && status < 400
                        ? connection.getInputStream() : connection.getErrorStream();
                if (input == null) return "ERROR:시세 서버 응답 오류 " + status;
                byte[] bytes = readAll(input);
                if (status < 200 || status >= 400) {
                    String message = new String(bytes, StandardCharsets.UTF_8).trim();
                    return "ERROR:시세 서버 응답 오류 " + status + (message.isEmpty() ? "" : " - " + message);
                }
                return Base64.encodeToString(bytes, Base64.NO_WRAP);
            } catch (Exception error) {
                String message = error.getMessage();
                return "ERROR:" + (message == null || message.isEmpty()
                        ? "시세 서버에 연결하지 못했습니다." : message);
            } finally {
                if (connection != null) connection.disconnect();
            }
        }

        @JavascriptInterface
        public void saveFile(String base64, String fileName, String mimeType) {
            try {
                pendingFileBytes = Base64.decode(base64, Base64.DEFAULT);
                pendingFileMime = mimeType == null || mimeType.isEmpty()
                        ? "application/octet-stream" : mimeType;
                runOnUiThread(() -> {
                    Intent intent = new Intent(Intent.ACTION_CREATE_DOCUMENT);
                    intent.addCategory(Intent.CATEGORY_OPENABLE);
                    intent.setType(pendingFileMime);
                    intent.putExtra(Intent.EXTRA_TITLE, safeFileName(fileName));
                    startActivityForResult(intent, SAVE_FILE_REQUEST);
                });
            } catch (Exception error) {
                runOnUiThread(() -> Toast.makeText(
                        MainActivity.this,
                        "파일 저장 준비 실패: " + error.getMessage(),
                        Toast.LENGTH_LONG).show());
            }
        }

        @JavascriptInterface
        public void exitApp() {
            runOnUiThread(MainActivity.this::finishAndRemoveTask);
        }
    }

    private boolean openExternalLink(Uri uri) {
        if (uri == null) return false;
        String scheme = uri.getScheme();
        if (!"http".equalsIgnoreCase(scheme) && !"https".equalsIgnoreCase(scheme)) return false;
        try {
            startActivity(new Intent(Intent.ACTION_VIEW, uri));
        } catch (Exception error) {
            Toast.makeText(this, "연결할 웹 브라우저를 찾지 못했습니다.", Toast.LENGTH_LONG).show();
        }
        return true;
    }

    private static String safeFileName(String value) {
        if (value == null || value.trim().isEmpty()) return "smart-hanwoo-backup.json";
        return value.replaceAll("[\\\\/:*?\"<>|]", "_");
    }

    private static byte[] readAll(InputStream input) throws Exception {
        try (InputStream stream = input; ByteArrayOutputStream output = new ByteArrayOutputStream()) {
            byte[] buffer = new byte[8192];
            int count;
            while ((count = stream.read(buffer)) != -1) output.write(buffer, 0, count);
            return output.toByteArray();
        }
    }

    private static String shortHash(String value) {
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256")
                    .digest(value.getBytes(StandardCharsets.UTF_8));
            StringBuilder result = new StringBuilder();
            for (int index = 0; index < 10; index++) result.append(String.format("%02X", digest[index]));
            return result.toString();
        } catch (Exception error) {
            return Integer.toHexString(value.hashCode()).toUpperCase();
        }
    }
}
