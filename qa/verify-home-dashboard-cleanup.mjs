import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {JSDOM} from "jsdom";

const root=path.resolve(import.meta.dirname,"..");
const script=fs.readFileSync(path.join(root,"app/src/main/assets/smart-ui-v48.js"),"utf8");
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const dom=new JSDOM('<!doctype html><body><div id="root"><div class="shell"><aside><nav></nav></aside><main><header><div class="page-title-block"><div class="page-title-row"><h1>스마트 한우관리</h1></div></div></header><section class="dashboard-hero"><h2>한우농장 운영 현황</h2></section><section class="market-panel"></section><section class="operations-command"></section></main></div></div></body>',{runScripts:"outside-only",pretendToBeVisual:true});
dom.window.requestAnimationFrame=callback=>dom.window.setTimeout(callback,0);
dom.window.SmartHanwooScheduler={getTasks:async()=>[]};
dom.window.eval(script);
await wait(60);

const main=dom.window.document.querySelector("main");
assert.ok(main.querySelector(".r48-home-dashboard"),"홈에서는 맞춤 대시보드가 표시되어야 합니다.");
assert.ok(dom.window.document.body.classList.contains("r48-home-screen"),"홈 화면 상태가 적용되어야 합니다.");

main.querySelector(".dashboard-hero").remove();
main.querySelector(".market-panel").remove();
const breeding=dom.window.document.createElement("section");
breeding.className="breeding-page";
breeding.textContent="번식관리";
main.appendChild(breeding);
await wait(60);

assert.equal(main.querySelector(".r48-home-dashboard"),null,"번식관리에서는 홈 전용 대시보드가 남지 않아야 합니다.");
assert.equal(dom.window.document.body.classList.contains("r48-home-screen"),false,"홈 전용 화면 상태가 해제되어야 합니다.");
assert.equal(main.querySelectorAll(".r48-alert-section,.r48-quick,.r48-market,.r48-stats,.r48-smart").length,0,"번식관리에는 긴급관리·주요업무·시세·농장현황·스마트관리가 표시되지 않아야 합니다.");
assert.ok(main.querySelector(".breeding-page"),"번식관리 화면은 유지되어야 합니다.");

dom.window.close();
console.log("PASS: 홈 전용 대시보드의 다른 메뉴 잔류 방지 6항목");
