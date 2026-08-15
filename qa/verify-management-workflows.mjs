import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { JSDOM } from "jsdom";

const root = path.resolve(import.meta.dirname, "..");
const read = file => fs.readFileSync(path.join(root, file), "utf8");
const script = read("app/src/main/assets/screen-isolation-v49.js");
const css = read("app/src/main/assets/screen-isolation-v49.css");
const smartUi = read("app/src/main/assets/smart-ui-v48.js");
let checks = 0;
const check = (message, value) => { assert.ok(value, message); checks += 1; };
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

const dom = new JSDOM(`<!doctype html><body><div id="root"><div class="shell"><aside><nav>
  <button>전체메뉴</button><button>개체관리</button><button>번식관리</button>
</nav></aside><main><header><div class="page-title-block"><p class="page-kicker">HANWOO FARM MANAGEMENT</p><div class="page-title-row"><h1>전문 집중관리</h1></div></div><button class="logout-button">로그아웃</button></header>
  <section class="all-menu"><div class="all-menu-grid"><article><h3>전문 집중관리</h3><button>전문관리 전체보기</button></article></div></section>
  <section class="professional-page"><div class="professional-tabs"><button class="current">오늘의 작업지시</button><button>번식 자동관리</button><button>송아지 집중관리</button><button>사료·발정·건강</button></div>
  <section class="pro-card"><h2>번식 자동관리</h2><table><tbody><tr><td>꽃순이 · 1234</td><td>2026-08-01</td><td>1회</td></tr></tbody></table></section></section>
</main></div></div></body>`, { runScripts: "outside-only", pretendToBeVisual: true });
dom.window.requestAnimationFrame = callback => dom.window.setTimeout(callback, 0);
dom.window.document.querySelectorAll(".professional-tabs button").forEach(button => button.addEventListener("click", () => {
  dom.window.document.querySelectorAll(".professional-tabs button").forEach(item => item.classList.remove("current"));
  button.classList.add("current");
}));
dom.window.eval(script);
await wait(40);

check("관리 제목에 개체 선택 수정편집", !!dom.window.document.querySelector(".r50-management-edit"));
check("번식 자동관리 행 수정 버튼", dom.window.document.querySelector(".r50-breeding-edit")?.textContent.includes("수정편집"));
check("번식 목록 선택 버튼으로 수정 진입", script.includes('const selectButton=row.querySelector("button")') && script.includes("selectButton.click()"));
check("번식 자동관리 독립 전체메뉴", !!dom.window.document.querySelector('[data-independent-menu="번식 자동관리"]'));
check("송아지 집중관리 독립 전체메뉴", !!dom.window.document.querySelector('[data-independent-menu="송아지 집중관리"]'));

dom.window.document.querySelectorAll(".professional-tabs button")[1].click();
await wait(40);
check("번식 자동관리 독립 제목", dom.window.document.querySelector(".page-title-row h1")?.textContent === "번식 자동관리");
check("번식 자동관리 독립 화면 상태", dom.window.document.body.classList.contains("r50-independent-professional"));
check("전문 집중관리 돌아가기", !!dom.window.document.querySelector(".r50-independent-toolbar button"));
check("분리 화면에서 탭 숨김", css.includes("body.r50-independent-professional .professional-tabs{display:none!important}"));
check("전문 화면에서 두 독립 탭 숨김", css.includes(".professional-tabs button:nth-child(2),.professional-tabs button:nth-child(3){display:none!important}"));

dom.window.document.querySelector(".r50-independent-toolbar button").click();
await wait(40);
check("전문 집중관리로 복귀", dom.window.document.querySelector(".page-title-row h1")?.textContent === "전문 집중관리" && !dom.window.document.body.classList.contains("r50-independent-professional"));
check("홈 영문 제목 모바일 표시", css.includes("body.r48-home-screen header .page-kicker{display:block!important}"));
check("홈 로그아웃 모바일 표시", css.includes("body.r48-home-screen header .logout-button{display:inline-flex!important}"));
check("송아지 주요업무 단독 메뉴", smartUi.includes('data-route="calves"') && smartUi.includes("송아지 집중관리"));
check("송아지 독립 화면 경로", smartUi.includes('calves:["전체메뉴","전문관리 전체보기","송아지 집중관리"]'));

const managementTitle = dom.window.document.querySelector(".page-title-row h1");
const originalManagementTitle = managementTitle.textContent;
const professionalPage = dom.window.document.querySelector(".professional-page");
professionalPage.remove();
managementTitle.textContent = "NOT_A_MANAGEMENT_SCREEN";
await wait(40);
check("비관리 화면에서 수정편집 버튼 제거", !dom.window.document.querySelector(".r50-management-edit"));

dom.window.document.querySelector("main").appendChild(professionalPage);
managementTitle.textContent = originalManagementTitle;
await wait(40);
check("관리 화면 복귀 시 수정편집 버튼 재생성", !!dom.window.document.querySelector(".r50-management-edit"));

const detailPage = dom.window.document.createElement("section");
detailPage.className = "cattle-detail-page";
dom.window.document.querySelector("main").appendChild(detailPage);
await wait(40);
check("개체 상세 화면에서 중복 수정편집 버튼 제거", !dom.window.document.querySelector(".r50-management-edit"));

dom.window.close();
console.log(`PASS: 관리 수정편집·전문메뉴 분리·홈 타이틀·송아지 메뉴 ${checks}항목`);
