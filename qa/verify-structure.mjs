import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { JSDOM } from "jsdom";
import { parse as parseCss } from "css-tree";
import { parseDocument } from "yaml";

const root = path.resolve(import.meta.dirname, "..");
const assets = path.join(root, "app/src/main/assets");
const read = file => fs.readFileSync(path.join(root, file), "utf8");
let checks = 0;
const check = (message, value) => { assert.ok(value, message); checks += 1; };

const workflowSource = read(".github/workflows/build-customer-apk.yml");
const workflow = parseDocument(workflowSource, { uniqueKeys: true });
check("workflow YAML syntax", workflow.errors.length === 0);
const workflowObject = workflow.toJS();
check("workflow has trigger", !!workflowObject.on);
check("workflow has Android job", !!workflowObject.jobs?.customer_android);
check("workflow performs shell syntax check", workflowSource.includes("bash -n scripts/build-customer-apk.sh"));

for (const file of fs.readdirSync(assets).filter(name => name.endsWith(".css"))) {
  parseCss(fs.readFileSync(path.join(assets, file), "utf8"), { positions: true });
  checks += 1;
}

for (const file of fs.readdirSync(assets).filter(name => name.endsWith(".js"))) {
  const result = spawnSync(process.execPath, ["--check", path.join(assets, file)], { encoding: "utf8" });
  check(`${file} JavaScript syntax`, result.status === 0);
}

const htmlSource = read("app/src/main/assets/index.html");
const htmlDom = new JSDOM(htmlSource);
check("HTML root exists", htmlDom.window.document.documentElement.lang === "ko");
check("HTML title exists", !!htmlDom.window.document.querySelector("title")?.textContent.trim());
for (const element of htmlDom.window.document.querySelectorAll("script[src],link[rel=stylesheet][href]")) {
  const reference = element.getAttribute("src") || element.getAttribute("href");
  const localName = reference.split("?")[0];
  check(`HTML asset exists: ${localName}`, fs.existsSync(path.join(assets, localName)));
}
const inlineModules = [...htmlDom.window.document.querySelectorAll('script[type="module"]')];
check("bundled module exists", inlineModules.length > 0);
const temporary = fs.mkdtempSync(path.join(os.tmpdir(), "hanwoo-qa-"));
try {
  for (let index = 0; index < inlineModules.length; index += 1) {
    const modulePath = path.join(temporary, `inline-${index}.mjs`);
    fs.writeFileSync(modulePath, inlineModules[index].textContent, "utf8");
    const result = spawnSync(process.execPath, ["--check", modulePath], { encoding: "utf8" });
    check(`inline module ${index} syntax`, result.status === 0);
  }
} finally {
  fs.rmSync(temporary, { recursive: true, force: true });
  htmlDom.window.close();
}

const xmlFiles = [
  "app/src/main/AndroidManifest.xml",
  "app/src/main/res/values/strings.xml",
  "app/src/main/res/values/styles.xml",
  "app/src/main/res/values/ic_launcher_background.xml",
  "app/src/main/res/xml/network_security_config.xml",
  "app/src/main/res/mipmap-anydpi-v26/ic_launcher.xml",
  "app/src/main/res/mipmap-anydpi-v26/ic_launcher_round.xml"
];
for (const file of xmlFiles) {
  const dom = new JSDOM(read(file), { contentType: "application/xml" });
  check(`${file} XML syntax`, !dom.window.document.querySelector("parsererror"));
  dom.window.close();
}

const utf8Files = [
  "README.md", "CHANGELOG-R50.md", ".github/workflows/build-customer-apk.yml",
  "scripts/build-customer-apk.sh", "app/src/main/java/kr/co/hanwoo/smartmanager/MainActivity.java",
  "app/src/main/java/kr/co/hanwoo/smartmanager/FileChooserMime.java",
  "qa/JavaSourceTestRunner.java", "qa/FileChooserMimeTest.java",
  "app/src/main/res/values/strings.xml", "app/src/main/assets/android-bridge.js",
  "app/src/main/assets/windows-bridge.js", "app/src/main/assets/complete-manager-v50.js"
];
const mojibake = /�|\?ㅻ|\?쒖|\?덉|\?섏|\?뒿|媛숈|紐⑤/;
for (const file of utf8Files) check(`${file} UTF-8 text`, !mojibake.test(read(file)));

console.log(`PASS: YAML·CSS·JS·HTML·XML·UTF-8 구조 검사 ${checks}항목`);
