import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import tls from "node:tls";

const root = path.resolve(import.meta.dirname, "..");
const keyPath = path.join(root, "app/r46-update-key.jks");
const build = fs.readFileSync(path.join(root, "scripts/build-customer-apk.sh"), "utf8");
const workflow = fs.readFileSync(path.join(root, ".github/workflows/build-customer-apk.yml"), "utf8");
let checks = 0;
const check = (message, value) => { assert.ok(value, message); checks += 1; };

check("signing key exists", fs.existsSync(keyPath));
const pfx = fs.readFileSync(keyPath);
check("signing key is not empty", pfx.length > 1000);
tls.createSecureContext({ pfx, passphrase: "R46HanwooUpdate2026" });
checks += 1;
check("build uses matching alias", build.includes("--ks-key-alias smart-hanwoo-r46"));
check("build uses environment password", build.includes('--ks-pass "env:HANWOO_KEYSTORE_PASSWORD"'));
check("workflow passes optional signing secrets", workflow.includes("HANWOO_KEYSTORE_PASSWORD") && workflow.includes("HANWOO_KEY_PASSWORD"));
check("signed APK is verified", build.includes("apksigner\" verify --verbose --print-certs"));

console.log(`PASS: APK 서명 키·비밀번호·별칭·검증 구성 ${checks}항목`);
