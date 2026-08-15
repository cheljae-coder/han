import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {JSDOM} from "jsdom";

const rootPath=path.resolve(import.meta.dirname,"..");
const script=fs.readFileSync(path.join(rootPath,"app/src/main/assets/smart-ui-v48.js"),"utf8");
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const dom=new JSDOM('<!doctype html><body><div id="root"></div></body>',{runScripts:"outside-only",pretendToBeVisual:true});
dom.window.requestAnimationFrame=callback=>dom.window.setTimeout(callback,0);
dom.window.SmartHanwooScheduler={getTasks:async()=>[],open:()=>{dom.window.lastTarget="할 일 예약"}};

function targetScreen(labels){
  const main=dom.window.document.querySelector("main");
  main.innerHTML=labels.map(label=>`<button type="button">${label}</button>`).join("");
  main.querySelectorAll("button").forEach(button=>button.addEventListener("click",()=>{dom.window.lastTarget=button.textContent.trim()}));
}

async function mountHome(){
  dom.window.lastTarget="";
  dom.window.document.getElementById("root").innerHTML='<div class="shell"><aside><nav><button id="go-cattle">개체관리</button><button id="go-breeding">번식관리</button><button id="go-menu">전체메뉴</button></nav></aside><main><header><div class="page-title-block"><div class="page-title-row"><h1>스마트 한우관리</h1></div></div></header><section class="dashboard-hero"><h2>한우농장 운영 현황</h2></section><section class="market-panel"></section><section class="operations-command"><button id="go-health"><b>건강관리</b><small>진료·투약·접종 기록</small></button></section></main></div>';
  dom.window.document.getElementById("go-cattle").addEventListener("click",()=>targetScreen(["개체 기본목록","새 개체 등록"]));
  dom.window.document.getElementById("go-breeding").addEventListener("click",()=>targetScreen(["번식현황 목록","분만결과 입력"]));
  dom.window.document.getElementById("go-health").addEventListener("click",()=>targetScreen(["진료기록 목록","접종·구충 일정"]));
  dom.window.document.getElementById("go-menu").addEventListener("click",()=>{
    targetScreen(["전문관리 전체보기"]);
    dom.window.document.querySelector("main button").addEventListener("click",()=>targetScreen(["오늘의 작업지시","번식 자동관리","송아지 집중관리","투약·휴약기간","출하수익 분석"]),{once:true});
  });
  await wait(40);
}

dom.window.eval(script);
const cases=[
  ["register","새 개체 등록"],
  ["cattle","개체 기본목록"],
  ["breeding","번식현황 목록"],
  ["calving","번식 자동관리"],
  ["calves","송아지 집중관리"],
  ["treatment","진료기록 목록"],
  ["vaccination","접종·구충 일정"],
  ["schedule","할 일 예약"],
  ["profit","출하수익 분석"]
];

for(const [route,expected] of cases){
  await mountHome();
  const button=dom.window.document.querySelector(`[data-route="${route}"]`);
  assert.ok(button,`${route} 빠른 메뉴가 있어야 합니다.`);
  button.click();
  await wait(140);
  assert.equal(dom.window.lastTarget,expected,`${route} 메뉴는 ${expected} 화면으로 이동해야 합니다.`);
}

for(const [tab,expected] of [["번식 자동관리","번식 자동관리"],["투약·휴약기간","투약·휴약기간"],["출하수익 분석","출하수익 분석"]]){
  await mountHome();
  const button=dom.window.document.querySelector(`.r48-smart [data-tab="${tab}"]`);
  assert.ok(button,`${tab} 스마트관리 메뉴가 있어야 합니다.`);
  button.click();
  await wait(190);
  assert.equal(dom.window.lastTarget,expected,`${tab} 스마트관리 메뉴가 실행되어야 합니다.`);
}

dom.window.close();
console.log("PASS: 홈 주요업무·스마트관리 12개 메뉴 직접이동 24항목");
