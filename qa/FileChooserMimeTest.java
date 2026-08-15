import kr.co.hanwoo.smartmanager.FileChooserMime;

public final class FileChooserMimeTest {
    private static int checks = 0;

    private static void expect(String label, String actual, String expected) {
        if (!expected.equals(actual)) {
            throw new AssertionError(label + ": expected=" + expected + ", actual=" + actual);
        }
        checks++;
    }

    public static void main(String[] args) {
        expect("라이선스 복합 accept", FileChooserMime.resolve(new String[]{
                ".shmlic,text/plain,application/octet-stream"}), "*/*");
        expect("라이선스 분리 accept", FileChooserMime.resolve(new String[]{
                ".shmlic", "text/plain", "application/octet-stream"}), "*/*");
        expect("QR 이미지", FileChooserMime.resolve(new String[]{"image/*"}), "image/*");
        expect("accept 없음", FileChooserMime.resolve(null), "*/*");
        expect("빈 accept", FileChooserMime.resolve(new String[]{""}), "*/*");
        expect("텍스트 하나", FileChooserMime.resolve(new String[]{"text/plain"}), "text/plain");
        System.out.println("PASS: Android 파일 선택 형식 " + checks + "항목");
    }
}
