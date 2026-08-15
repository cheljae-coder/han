package kr.co.hanwoo.smartmanager;

public final class FileChooserMime {
    private FileChooserMime() {}

    public static String resolve(String[] acceptTypes) {
        if (acceptTypes == null || acceptTypes.length == 0) return "*/*";
        String onlyMime = null;
        int mimeCount = 0;
        boolean containsExtension = false;
        for (String raw : acceptTypes) {
            if (raw == null) continue;
            for (String item : raw.split(",")) {
                String accept = item.trim().toLowerCase(java.util.Locale.ROOT);
                if (accept.isEmpty()) continue;
                if (accept.startsWith(".")) {
                    containsExtension = true;
                } else if (accept.indexOf('/') > 0 && accept.indexOf(' ') < 0) {
                    onlyMime = accept;
                    mimeCount += 1;
                }
            }
        }
        // Intent.setType()에는 .shmlic 같은 확장자를 넣을 수 없다.
        // 확장자가 있으면 모든 파일을 표시하고 선택한 파일의 서명을 앱에서 검증한다.
        if (containsExtension || mimeCount != 1) return "*/*";
        return onlyMime == null ? "*/*" : onlyMime;
    }
}
