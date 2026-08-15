package kr.co.hanwoo.smartmanager;

import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertTrue;

import java.io.File;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;

import org.junit.Test;

public final class ProjectContractTest {
    private static String read(String relativePath) throws Exception {
        File file = new File(relativePath);
        if (!file.isFile()) file = new File("app", relativePath);
        assertTrue("Required project file is missing: " + relativePath, file.isFile());
        return new String(Files.readAllBytes(file.toPath()), StandardCharsets.UTF_8);
    }

    @Test
    public void bundledAppHasRequiredNavigationAndR50Enhancements() throws Exception {
        String html = read("src/main/assets/index.html");
        String complete = read("src/main/assets/complete-manager-v50.js");
        assertTrue(html.contains("개체관리"));
        assertTrue(html.contains("번식관리"));
        assertTrue(html.contains("농장기록"));
        assertTrue(html.contains("전체메뉴"));
        assertTrue(html.contains("프로그램 종료"));
        assertTrue(html.contains("complete-manager-v50.js"));
        assertTrue(complete.contains("데이터 무결성 점검"));
        assertTrue(complete.contains("2026.08.14-R50-COMPLETE"));
    }

    @Test
    public void nativeBridgeIsSafeForBrowserPreview() throws Exception {
        String bridge = read("src/main/assets/android-bridge.js");
        assertTrue(bridge.contains("if (!window.AndroidBridge) return"));
        assertTrue(bridge.contains("HTMLAnchorElement.prototype.click"));
        assertTrue(bridge.contains("window.AndroidBridge.saveFile"));
    }

    @Test
    public void buildSupportsSecretsAndLegacyKeyFallback() throws Exception {
        String gradle = read("build.gradle");
        File scriptFile = new File("scripts/build-customer-apk.sh");
        if (!scriptFile.isFile()) scriptFile = new File("../scripts/build-customer-apk.sh");
        String script = new String(Files.readAllBytes(scriptFile.toPath()), StandardCharsets.UTF_8);
        assertFalse(gradle.contains("R46HanwooUpdate2026"));
        assertTrue(script.contains("HANWOO_KEYSTORE_PASSWORD"));
        assertTrue(script.contains("R46HanwooUpdate2026"));
        assertTrue(script.contains("export HANWOO_KEYSTORE_PASSWORD HANWOO_KEY_PASSWORD"));
    }
}
