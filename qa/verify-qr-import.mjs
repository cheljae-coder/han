import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const licenseClient = fs.readFileSync(
  path.join(root, "app/src/main/assets/license-client-v49.js"),
  "utf8"
);
const mainActivity = fs.readFileSync(
  path.join(root, "app/src/main/java/kr/co/hanwoo/smartmanager/MainActivity.java"),
  "utf8"
);

assert.match(licenseClient, /저장된 QR 이미지 선택/);
assert.match(licenseClient, /id="lic-qr-input"[^>]*accept="image\/\*"/);
assert.doesNotMatch(licenseClient, /id="lic-qr-input"[^>]*capture=/);
assert.match(licenseClient, /id="lic-qr-camera-input"[^>]*capture="environment"/);
assert.match(licenseClient, /loadQrImage/);
assert.match(licenseClient, /createImageBitmap/);
assert.match(licenseClient, /inversionAttempts:"attemptBoth"/);
assert.match(mainActivity, /params\.isCaptureEnabled\(\)/);
assert.match(mainActivity, /mime\.startsWith\("image\/"\) && cameraRequested/);

console.log("PASS: 저장 QR 선택과 카메라 촬영 분리 9항목");
