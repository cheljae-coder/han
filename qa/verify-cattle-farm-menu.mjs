import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {JSDOM} from "jsdom";

const rootPath=path.resolve(import.meta.dirname,"..");
const read=file=>fs.readFileSync(path.join(rootPath,file),"utf8");
const index=read("app/src/main/assets/index.html");
const ui=read("app/src/main/assets/smart-ui-v48.js");
const css=read("app/src/main/assets/smart-ui-v48.css");
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));

const bottomOrder='N0=[["home","홈",Ig],["menu","전체메뉴",Gd],["cattle","개체관리",Al],["breeding","번식관리",Pi],["operations","농장기록",Uu]]';
assert.ok(index.includes(bottomOrder),"하단 전체메뉴는 홈 바로 옆에 있어야 합니다.");

const cattleMenu=index.indexOf('aria-label":"개체관리 세부메뉴');
const cattleRegister=index.indexOf(' 새 개체 등록',cattleMenu);
assert.ok(cattleMenu>=0,"개체관리 세부메뉴가 있어야 합니다.");
assert.ok(cattleRegister>cattleMenu&&cattleRegister-cattleMenu<1800,"개체관리 세부메뉴에 새 개체 등록이 있어야 합니다.");
assert.match(ui,/data-r48-section="farm-status"/);
assert.match(css,/\[data-r48-section="farm-status"\]\{display:block!important;visibility:visible!important;opacity:1!important\}/);

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
  dom.window.document.getElementById("root").innerHTML='<div class="shell"><aside><nav><button id="go-home">홈</button><button id="go-menu">전체메뉴</button><button id="go-cattle">개체관리</button><button id="go-breeding">번식관리</button><button id="go-records">농장기록</button></nav></aside><main><header><h1>스마트 한우관리</h1></header><section class="dashboard-hero"><h2>한우농장 운영 현황</h2></section><section class="market-panel"></section><section class="metrics"><button><span>총 사육두수 · 전체보기</span><strong>10</strong></button><button><span>개체보기 · 전체</span><strong>10</strong></button><button><span>임신확정 · 번식보기</span><strong>3</strong></button><button><span>오늘의 농장 할 일 · 보기</span><strong>2</strong></button></section></main></div>';
  dom.window.document.getElementById("go-cattle").addEventListener("click",()=>targetScreen(["개체 기본목록"]));
  dom.window.document.getElementById("go-breeding").addEventListener("click",()=>targetScreen(["번식현황 목록"]));
  await wait(50);
  const section=dom.window.document.querySelector('[data-r48-section="farm-status"]');
  assert.ok(section,"홈 화면에 농장현황이 표시되어야 합니다.");
  assert.equal(section.querySelectorAll("[data-stat]").length,4,"농장현황 항목 4개가 표시되어야 합니다.");
}

dom.window.eval(ui);
for(const [indexNumber,expected] of [[0,"개체 기본목록"],[1,"개체 기본목록"],[2,"번식현황 목록"],[3,"할 일 예약"]]){
  await mountHome();
  dom.window.document.querySelector(`[data-stat="${indexNumber}"]`).click();
  await wait(160);
  assert.equal(dom.window.lastTarget,expected,`농장현황 ${indexNumber+1}번 항목은 ${expected}(으)로 이동해야 합니다.`);
}

dom.window.close();
console.log("PASS: 새개체 등록·하단 순서·농장현황 표시·항목 이동 13항목");
