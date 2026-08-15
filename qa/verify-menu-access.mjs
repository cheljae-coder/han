import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {JSDOM} from "jsdom";

const root=path.resolve(import.meta.dirname,"..");
const license=fs.readFileSync(path.join(root,"app/src/main/assets/license-client-v49.js"),"utf8");
const ui=fs.readFileSync(path.join(root,"app/src/main/assets/smart-ui-v48.js"),"utf8");
const css=fs.readFileSync(path.join(root,"app/src/main/assets/smart-ui-v48.css"),"utf8");
const schedulerCss=fs.readFileSync(path.join(root,"app/src/main/assets/smart-scheduler-v49.css"),"utf8");
const index=fs.readFileSync(path.join(root,"app/src/main/assets/index.html"),"utf8");

const dom=new JSDOM('<!doctype html><body><aside><nav><button id="home">홈</button><button id="cattle">개체관리</button><button id="breeding">번식관리</button><button id="records">농장기록</button><button id="menu">전체메뉴</button><button id="schedule">할 일 예약</button></nav></aside><div class="r48-home-dashboard"><button id="quick">분만관리</button></div><button id="delete">선택개체 삭제</button></body>',{runScripts:"outside-only"});
const helperStart=license.indexOf("function textOf");
const helperEnd=license.indexOf("function readOnlyActive");
assert.ok(helperStart>=0&&helperEnd>helperStart,"읽기 전용 메뉴 허용 함수를 찾을 수 있어야 합니다.");
dom.window.eval(license.slice(helperStart,helperEnd)+";window.testIsAllowed=isAllowed;");

for(const id of ["home","cattle","breeding","records","menu","schedule","quick"]){
  assert.equal(dom.window.testIsAllowed(dom.window.document.getElementById(id)),true,`${id} 메뉴는 읽기 전용 상태에서도 이동할 수 있어야 합니다.`);
}
assert.equal(dom.window.testIsAllowed(dom.window.document.getElementById("delete")),false,"삭제 작업은 읽기 전용 상태에서 계속 차단해야 합니다.");

let clicks=0;
dom.window.document.querySelectorAll("aside nav button").forEach(button=>button.addEventListener("click",()=>clicks++));
dom.window.document.addEventListener("click",event=>{if(!dom.window.testIsAllowed(event.target)){event.preventDefault();event.stopImmediatePropagation();}},{capture:true});
dom.window.document.querySelectorAll("aside nav button").forEach(button=>button.click());
assert.equal(clicks,6,"하단의 조회용 메뉴 6개가 모두 실행되어야 합니다.");

assert.doesNotMatch(ui, /<small>스마트 한우관리<\/small>/);
assert.match(css, /page-title-row h1\{font-size:0!important\}/);
assert.match(css, /page-title-row h1:after\{font-size:24px!important\}/);
assert.match(css, /body\.r48-home-screen \.r48-alert-card h1\{font-size:13px!important/);
assert.match(css, /-webkit-line-clamp:unset!important/);
assert.match(css, /aside nav\{grid-template-columns:repeat\(7,minmax\(0,1fr\)\)!important\}/);
assert.match(css, /\.professional-tabs\{[^}]*overflow-x:auto!important/);
assert.match(css, /\.professional-tabs button\{[^}]*min-width:max-content!important/);
assert.match(css, /\.professional-tabs button\{[^}]*white-space:nowrap!important/);
assert.match(css, /\.professional-tabs button\.current\{[^}]*background:#1f4e6d!important/);
assert.match(css, /\.professional-tabs button\.current:before\{content:"✓"/);
assert.match(css, /body\.r48-home-screen \.r48-alert-card h1\{font-size:12px!important/);
assert.match(schedulerCss, /aside nav \.nav-scheduler\{display:grid\}/);
for(const label of ["홈","개체관리","번식관리","농장기록","전체메뉴"])assert.ok(index.includes(`"${label}"`),`${label} 하단 메뉴가 있어야 합니다.`);

dom.window.close();
console.log("PASS: 제목·중요알림·한줄메뉴·하단메뉴·전문탭 29항목");
