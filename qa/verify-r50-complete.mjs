import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { JSDOM } from "jsdom";
import { indexedDB } from "fake-indexeddb";

const root = path.resolve(import.meta.dirname, "..");
const read = file => fs.readFileSync(path.join(root, file), "utf8");
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
let checks = 0;
const check = (message, value) => { assert.ok(value, message); checks += 1; };

const html = read("app/src/main/assets/index.html");
const androidBridge = read("app/src/main/assets/android-bridge.js");
const build = read("scripts/build-customer-apk.sh");
const workflow = read(".github/workflows/build-customer-apk.yml");

check("R50 JavaScript asset", html.includes("complete-manager-v50.js"));
check("R50 CSS asset", html.includes("complete-manager-v50.css"));
check("R50 APK output", build.includes("SmartHanwooManager-R50.apk"));
check("R50 version code", build.includes("--version-code 50"));
check("workflow YAML separation", workflow.includes("\non:\n"));
check("workflow runs every QA test", workflow.includes("npm test --prefix qa"));
check("missing signing secrets have compatible fallback", build.includes('HANWOO_KEYSTORE_PASSWORD="R46HanwooUpdate2026"'));
check("signing variables are exported", build.includes("export HANWOO_KEYSTORE_PASSWORD HANWOO_KEY_PASSWORD"));
check("native bridge guard", androidBridge.includes("if (!window.AndroidBridge) return"));

const plainDom = new JSDOM("<!doctype html><body></body>", { runScripts: "outside-only" });
plainDom.window.eval(androidBridge);
check("browser preview has no false native bridge", plainDom.window.smartHanwooNative == null);
plainDom.window.close();

const dom = new JSDOM(`<!doctype html><body>
  <aside><small>버전 2026.08.12-R48-SMART-HOME-MARKET-MENU</small></aside>
  <main><div class="page-title-row"><h1>스마트 한우관리</h1></div><div class="market-panel"><span>Cannot read properties of undefined (reading 'fetchMarketXml')</span></div><div class="key-notice"><strong>Cannot read properties of undefined (reading 'fetchMarketXml')</strong></div><form id="cattle-form"><input placeholder="12자리 숫자" value="123456789012"><input id="birth-date" type="date" required><button>저장</button></form><div class="all-menu-grid"><article><h3>보고서·자료</h3><button>현황 보고서 ›</button></article></div></main>
</body>`, { runScripts: "outside-only", pretendToBeVisual: true });
Object.defineProperty(dom.window, "indexedDB", { value: indexedDB });
dom.window.requestAnimationFrame = callback => dom.window.setTimeout(callback, 0);

const open = indexedDB.open("smart-hanwoo-manager", 9);
open.onupgradeneeded = () => {
  const db = open.result;
  db.createObjectStore("cattle", { keyPath: "id", autoIncrement: true });
  db.createObjectStore("breeding", { keyPath: "id", autoIncrement: true });
  db.createObjectStore("treatments", { keyPath: "id", autoIncrement: true });
  db.createObjectStore("schedules", { keyPath: "id", autoIncrement: true });
};
await new Promise((resolve, reject) => { open.onsuccess = resolve; open.onerror = () => reject(open.error); });
const db = open.result;
const tx = db.transaction(["cattle", "schedules"], "readwrite");
tx.objectStore("cattle").add({ id: 1, name: "정상소", trace_number: "123456789012", sex: "암", birth_date: "2023-01-01" });
tx.objectStore("cattle").add({ id: 2, name: "확인소", trace_number: "123", sex: "", birth_date: "2999-01-01" });
tx.objectStore("schedules").add({ id: 1, cattle_id: 999, name: "", due_date: "" });
await new Promise((resolve, reject) => { tx.oncomplete = resolve; tx.onerror = () => reject(tx.error); });
db.close();

dom.window.eval(read("app/src/main/assets/complete-manager-v50.js"));
await wait(40);
check("document title repaired", dom.window.document.title === "스마트 한우관리 프로그램");
check("visible version repaired", dom.window.document.querySelector("aside small").textContent.includes("R50-COMPLETE"));
check("technical market error hidden", !dom.window.document.body.textContent.includes("Cannot read properties"));
check("page title has a single accessible name", dom.window.document.querySelector(".page-title-row h1")?.getAttribute("aria-label") === "스마트 한우관리");
const invalidSubmit = new dom.window.Event("submit", { bubbles: true, cancelable: true });
dom.window.document.getElementById("cattle-form").dispatchEvent(invalidSubmit);
check("missing cattle birth date blocked", invalidSubmit.defaultPrevented);
dom.window.document.getElementById("birth-date").value = "2999-01-01";
const futureSubmit = new dom.window.Event("submit", { bubbles: true, cancelable: true });
dom.window.document.getElementById("cattle-form").dispatchEvent(futureSubmit);
check("future cattle birth date blocked", futureSubmit.defaultPrevented);
dom.window.document.getElementById("birth-date").value = "2025-01-02";
const validSubmit = new dom.window.Event("submit", { bubbles: true, cancelable: true });
dom.window.document.getElementById("cattle-form").dispatchEvent(validSubmit);
check("valid cattle birth date accepted", !validSubmit.defaultPrevented);
check("audit menu installed", dom.window.document.querySelector(".r50-data-audit-button")?.textContent === "데이터 무결성 점검");
dom.window.document.querySelector(".r50-data-audit-button").click();
await wait(80);
check("audit dialog opens", !!dom.window.document.querySelector(".r50-audit-dialog"));
check("audit catches invalid trace", dom.window.document.body.textContent.includes("이력번호 확인"));
check("audit catches orphan record", dom.window.document.body.textContent.includes("연결되지 않은 기록"));
check("audit is explicitly read-only", dom.window.document.body.textContent.includes("변경하지 않고"));
dom.window.close();

console.log(`PASS: R50 완성도·데이터 점검·빌드 보안 ${checks}항목`);
