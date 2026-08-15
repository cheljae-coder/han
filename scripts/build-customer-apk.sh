#!/usr/bin/env bash
set -Eeo pipefail
trap 'status=$?; echo "::error title=고객용 APK 빌드 실패::${LINENO}줄 명령: ${BASH_COMMAND}, 종료코드: ${status}"; exit "$status"' ERR

root="$PWD"
test -f "$root/app/src/main/AndroidManifest.xml"
cd "$root"

HANWOO_KEYSTORE_PASSWORD="$(printenv HANWOO_KEYSTORE_PASSWORD || true)"
HANWOO_KEY_PASSWORD="$(printenv HANWOO_KEY_PASSWORD || true)"
if [[ -z "$HANWOO_KEYSTORE_PASSWORD" ]]; then
  echo "::warning title=서명 비밀번호 기본값 사용::GitHub Secrets가 없어 기존 R46 업데이트 키의 호환 비밀번호를 사용합니다. 배포 저장소에서는 HANWOO_KEYSTORE_PASSWORD 등록을 권장합니다."
  HANWOO_KEYSTORE_PASSWORD="R46HanwooUpdate2026"
fi
if [[ -z "${HANWOO_KEY_PASSWORD:-}" ]]; then
  HANWOO_KEY_PASSWORD="$HANWOO_KEYSTORE_PASSWORD"
fi
export HANWOO_KEYSTORE_PASSWORD HANWOO_KEY_PASSWORD

sdk="$(printenv ANDROID_SDK_ROOT || true)"
if [[ -z "$sdk" ]]; then
  sdk="$(printenv ANDROID_HOME || true)"
fi
test -n "$sdk"
set -u
tools="$sdk/build-tools/35.0.0"
android_jar="$sdk/platforms/android-35/android.jar"
for file in "$android_jar" "$tools/aapt2" "$tools/d8" "$tools/zipalign" "$tools/apksigner"; do
  test -e "$file"
done

work="$root/app/build/direct-release"
mkdir -p "$work"
find "$work" -depth -mindepth 1 -delete
mkdir -p "$work/classes" "$work/dex" "$root/dist"

sed '0,/<manifest /s//<manifest package="kr.co.hanwoo.smartmanager" /' app/src/main/AndroidManifest.xml > "$work/AndroidManifest.xml"
"$tools/aapt2" compile --dir app/src/main/res -o "$work/resources.zip"
"$tools/aapt2" link -o "$work/resources.apk" -I "$android_jar" --manifest "$work/AndroidManifest.xml" -A app/src/main/assets --min-sdk-version 23 --target-sdk-version 35 --version-code 50 --version-name 50.0.0 "$work/resources.zip"
find app/src/main/java -name '*.java' -print | sort > "$work/java-sources.txt"
test -s "$work/java-sources.txt"
javac -encoding UTF-8 -source 17 -target 17 -classpath "$android_jar" -d "$work/classes" @"$work/java-sources.txt"
jar --create --file "$work/classes.jar" -C "$work/classes" .
"$tools/d8" --min-api 23 --lib "$android_jar" --output "$work/dex" "$work/classes.jar"
cp "$work/resources.apk" "$work/unsigned.apk"
(cd "$work/dex" && zip -q "$work/unsigned.apk" classes.dex)
"$tools/zipalign" -p -f 4 "$work/unsigned.apk" "$work/aligned.apk"
"$tools/zipalign" -c -p 4 "$work/aligned.apk"
"$tools/apksigner" sign \
  --ks app/r46-update-key.jks \
  --ks-key-alias smart-hanwoo-r46 \
  --ks-pass "env:HANWOO_KEYSTORE_PASSWORD" \
  --key-pass "env:HANWOO_KEY_PASSWORD" \
  --out dist/SmartHanwooManager-R50.apk \
  "$work/aligned.apk"
"$tools/apksigner" verify --verbose --print-certs dist/SmartHanwooManager-R50.apk
unzip -Z1 dist/SmartHanwooManager-R50.apk > "$work/files.txt"
for file in classes.dex assets/index.html assets/cow-title.svg assets/license-file-parser-v49.js assets/license-client-v49.js assets/smart-ui-v48.js assets/smart-ui-v48.css assets/smart-scheduler-v48.js assets/smart-scheduler-v49.css assets/screen-isolation-v49.js assets/screen-isolation-v49.css assets/complete-manager-v50.js assets/complete-manager-v50.css; do
  grep -Fxq "$file" "$work/files.txt"
done
sha256sum dist/SmartHanwooManager-R50.apk > dist/SHA256SUMS.txt
echo "PASS: 고객용 스마트 한우관리 R50 APK"
