import java.lang.reflect.Method;
import java.net.URL;
import java.net.URLClassLoader;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import javax.tools.JavaCompiler;
import javax.tools.ToolProvider;

public final class JavaSourceTestRunner {
    public static void main(String[] args) throws Exception {
        if (args.length < 3) {
            throw new IllegalArgumentException("사용법: 출력폴더 실행클래스 소스파일...");
        }
        Path output = Path.of(args[0]);
        Files.createDirectories(output);
        JavaCompiler compiler = ToolProvider.getSystemJavaCompiler();
        if (compiler == null) {
            throw new IllegalStateException("Java 컴파일러를 찾을 수 없습니다.");
        }
        List<String> options = new ArrayList<>(List.of(
                "-encoding", "UTF-8", "--release", "17", "-d", output.toString()));
        options.addAll(Arrays.asList(args).subList(2, args.length));
        int result = compiler.run(null, System.out, System.err, options.toArray(new String[0]));
        if (result != 0) {
            throw new IllegalStateException("Java 소스 검사 실패: " + result);
        }
        try (URLClassLoader loader = new URLClassLoader(new URL[]{output.toUri().toURL()})) {
            Class<?> testClass = Class.forName(args[1], true, loader);
            Method main = testClass.getMethod("main", String[].class);
            main.invoke(null, (Object) new String[0]);
        }
    }
}
