import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const css = fs.readFileSync(path.join(root, "app/src/main/assets/smart-ui-v48.css"), "utf8");

assert.match(css, /body\.r48-home-screen header \.page-title-block\{display:block!important/);
assert.doesNotMatch(css, /body\.r48-home-screen header \.page-title-block,body\.r48-home-screen header \.logout-button\{display:none!important/);
assert.match(css, /body\.r48-home-screen header \.page-title-row h1\{[^}]*font-size:18px/);
assert.match(css, /body\.r48-home-screen \.r48-alert-card h1\{[^}]*font-size:13px/);
assert.match(css, /\.r48-alert-card h1\{[^}]*white-space:nowrap/);
assert.match(css, /\.r48-alert-card h1\{[^}]*overflow:visible/);
assert.match(css, /background:url\("cow-title\.svg"\)/);
assert.match(css, /content:"스마트 한우관리"/);
assert.match(css, /body\.r48-home-screen header \.page-title-row h1\{font-size:0\}/);
assert.match(css, /body\.r48-home-screen \.r48-alert-card h1\{font-size:12px/);
assert.match(css, /body\.r48-home-screen \.r48-alert-dots\{display:none!important/);
assert.ok(fs.existsSync(path.join(root, "app/src/main/assets/cow-title.svg")));

console.log("PASS: 한우 이미지 제목·중요알림 크기·표시선 제거 12항목");
