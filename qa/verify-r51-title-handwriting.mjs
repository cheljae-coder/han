import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { JSDOM } from "jsdom";

const root = path.resolve(import.meta.dirname, "..");
const read = file => fs.readFileSync(path.join(root, file), "utf8");
const script = read("app/src/main/assets/screen-isolation-v49.js");
const css = read("app/src/main/assets/screen-isolation-v49.css");
let checks = 0;
const check = (message, value) => { assert.ok(value, message); checks += 1; };
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

const dom = new JSDOM(`<!doctype html><body><div id="root"><main><header><div class="page-title-row"><h1>송아지 집중관리</h1></div></header>
  <section class="pro-card"><h2>송아지 육성기록 입력</h2></section>
  <section class="pro-card"><h2>개체별 생산원가 입력</h2></section>
  <div class="photo-registration-box"><div></div><div><label class="file-action handwritten">손글씨 등록표 촬영·자동입력<input type="file"></label></div></div>
</main></div></body>`, { runScripts: "outside-only", pretendToBeVisual: true });
dom.window.requestAnimationFrame = callback => dom.window.setTimeout(callback, 0);
dom.window.eval(script);
await wait(50);

check("송아지 집중관리 한 줄 축소 클래스", !!dom.window.document.querySelector(".r51-calf-page-title"));
check("송아지 육성기록 한 줄 축소 클래스", !!dom.window.document.querySelector(".r51-calf-record-title"));
check("개체별 생산원가 한 줄 축소 클래스", !!dom.window.document.querySelector(".r51-production-cost-title"));
check("세 제목 줄바꿈 금지", css.includes(".r51-calf-page-title") && css.includes(".r51-calf-record-title,.r51-production-cost-title") && css.includes("white-space:nowrap!important"));
check("모바일 제목 크기 축소", css.includes(".r51-calf-page-title{font-size:18px!important") && css.includes(".r51-calf-record-title,.r51-production-cost-title{font-size:16px!important"));
const guide = dom.window.document.querySelector(".r51-handwriting-guide");
check("손글씨 작성 안내 추가", !!guide && guide.textContent.includes("굵은 검정펜"));
check("OCR 고정 표제어 안내", guide.textContent.includes("개체번호") && guide.textContent.includes("모 개체번호") && guide.textContent.includes("신고일"));
check("고령 사용자 음성입력 대안 안내", guide.textContent.includes("키보드의 마이크"));
check("번호·날짜 확인 경고", guide.textContent.includes("12자리 번호와 날짜를 반드시 확인"));

dom.window.close();
console.log(`PASS: 송아지·생산원가 한줄 제목과 손글씨 OCR 안내 ${checks}항목`);
