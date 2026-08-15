import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { JSDOM } from "jsdom";

const root = path.resolve(import.meta.dirname, "..");
const read = file => fs.readFileSync(path.join(root, file), "utf8");
const ui = read("app/src/main/assets/smart-ui-v48.js");
const css = read("app/src/main/assets/smart-ui-v48.css");
const license = read("app/src/main/assets/license-client-v49.js");
let checks = 0;
const check = (message, value) => { assert.ok(value, message); checks += 1; };

check("홈 주요업무 신규개체 등록 버튼", ui.includes('data-route="register"') && ui.includes("신규개체 등록"));
check("신규개체 등록 실제 화면 경로", ui.includes('register:["개체관리","새 개체 등록"]'));
check("메뉴 제목 한 줄", css.includes("white-space:nowrap!important") && css.includes("-webkit-line-clamp:unset!important"));
check("빠른 메뉴 폭 확보", css.includes(".r48-quick button{flex-basis:94px}"));
check("중요알림·주요업무 데스크톱 글자크기 동일", css.includes(".r48-quick span") && css.includes("body.r48-home-screen .r48-alert-card h1{font-size:13px!important"));
check("중요알림·주요업무 모바일 글자크기 동일", css.includes("body.r48-home-screen .r48-alert-card h1{font-size:12px!important"));

const evaluateStart = license.indexOf("async function evaluate");
const evaluateEnd = license.indexOf("function markup", evaluateStart);
const refreshStart = license.indexOf("function refreshUi");
const refreshEnd = license.indexOf("function openDialog", refreshStart);
check("체험 상태 계산 함수 확인", evaluateStart >= 0 && evaluateEnd > evaluateStart);
check("체험 알림 표시 함수 확인", refreshStart >= 0 && refreshEnd > refreshStart);

const dom = new JSDOM(`<!doctype html><body>
  <button id="lic-status"></button>
  <div id="lic-banner" class="lic-banner"><span id="lic-banner-text"></span></div>
  <div id="lic-readonly"></div>
  <strong id="lic-state-label"></strong><strong id="lic-expiry"></strong>
  <strong id="lic-platform"></strong><strong id="lic-device"></strong>
</body>`, { runScripts: "outside-only" });
const fixedNow = Date.parse("2026-08-15T00:00:00.000Z");
dom.window.Date.now = () => fixedNow;
dom.window.eval(`
  var TRIAL_DAYS=14,WARNING_DAYS=3,CLOCK_TOLERANCE=300000;
  var state={},status=null,platform="BROWSER",deviceId="TEST";
  function dayDiff(ms){return Math.max(0,Math.ceil(ms/86400000))}
  function isoDate(value){return value?new Date(value).toLocaleDateString("ko-KR"):"없음"}
  async function saveState(){}
  async function verifyToken(){throw new Error("unused")}
  ${license.slice(evaluateStart, evaluateEnd)}
  ${license.slice(refreshStart, refreshEnd)}
  window.setTrialState=value=>{state=value};
  window.testEvaluate=evaluate;
  window.testRefresh=value=>{status=value;refreshUi()};
`);

const day = 86400000;
dom.window.setTrialState({ trialStartAt: new Date(fixedNow - 10 * day).toISOString() });
const fourDays = await dom.window.testEvaluate();
check("4일 남은 체험은 일반 상태", fourDays.kind === "trial" && fourDays.days === 4);
dom.window.testRefresh(fourDays);
check("4일 남으면 체험 알림 숨김", dom.window.document.getElementById("lic-status").classList.contains("lic-hidden") && dom.window.document.getElementById("lic-banner").classList.contains("lic-hidden"));

dom.window.setTrialState({ trialStartAt: new Date(fixedNow - 11 * day).toISOString() });
const threeDays = await dom.window.testEvaluate();
check("3일 남은 체험은 경고 상태", threeDays.kind === "warning" && threeDays.trial === true && threeDays.days === 3);
dom.window.testRefresh(threeDays);
check("3일 남으면 체험 알림 표시", !dom.window.document.getElementById("lic-status").classList.contains("lic-hidden") && !dom.window.document.getElementById("lic-banner").classList.contains("lic-hidden"));
check("체험 알림 문구", dom.window.document.getElementById("lic-banner-text").textContent.includes("체험기간이 3일 남았습니다"));

dom.window.close();
console.log(`PASS: 한줄 제목·신규등록·체험 3일 알림·글자크기 ${checks}항목`);
