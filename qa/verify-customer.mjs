import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root=path.resolve(import.meta.dirname,"..");
const read=p=>fs.readFileSync(path.join(root,p),"utf8");
const exists=p=>fs.existsSync(path.join(root,p));
let n=0;
const check=(message,value)=>{assert.ok(value,message);n++;};

for(const file of [
  ".github/workflows/build-customer-apk.yml",
  "scripts/build-customer-apk.sh",
  "app/src/main/AndroidManifest.xml",
  "app/src/main/java/kr/co/hanwoo/smartmanager/MainActivity.java",
  "app/src/main/java/kr/co/hanwoo/smartmanager/FileChooserMime.java",
  "app/src/main/assets/index.html",
  "app/src/main/assets/cow-title.svg",
  "app/src/main/assets/license-file-parser-v49.js",
  "app/src/main/assets/license-client-v49.js",
  "app/src/main/assets/smart-ui-v48.js",
  "app/src/main/assets/smart-ui-v48.css",
  "app/src/main/assets/smart-scheduler-v48.js",
  "app/src/main/assets/smart-scheduler-v49.css",
  "app/src/main/assets/screen-isolation-v49.js",
  "app/src/main/assets/screen-isolation-v49.css",
  "app/src/main/assets/complete-manager-v50.js",
  "app/src/main/assets/complete-manager-v50.css",
  "qa/FileChooserMimeTest.java",
  "qa/verify-license-file-parser.mjs",
  "qa/verify-dashboard-routes.mjs",
  "qa/verify-menu-access.mjs",
  "qa/verify-home-dashboard-cleanup.mjs",
  "qa/verify-cattle-farm-menu.mjs",
  "app/r46-update-key.jks"
])check(`${file} 파일`,exists(file));

check("관리자 모듈 미포함",!exists("license-admin")&&!exists("license-admin-app"));
const workflow=read(".github/workflows/build-customer-apk.yml");
const build=read("scripts/build-customer-apk.sh");
const ui=read("app/src/main/assets/smart-ui-v48.js");
const css=read("app/src/main/assets/smart-ui-v48.css");
const scheduler=read("app/src/main/assets/smart-scheduler-v48.js");
const schedulerCss=read("app/src/main/assets/smart-scheduler-v49.css");
const isolation=read("app/src/main/assets/screen-isolation-v49.js");
const isolationCss=read("app/src/main/assets/screen-isolation-v49.css");
const html=read("app/src/main/assets/index.html");
const license=read("app/src/main/assets/license-client-v49.js");
const activity=read("app/src/main/java/kr/co/hanwoo/smartmanager/MainActivity.java");
const chooser=read("app/src/main/java/kr/co/hanwoo/smartmanager/FileChooserMime.java");

check("고객 작업 하나",workflow.includes("customer_android:")&&!workflow.includes("license-admin")&&!workflow.includes("windows-latest"));
check("고객 APK 하나",workflow.includes("SmartHanwooManager-R50.apk")&&!workflow.includes("SmartHanwooLicenseAdmin"));
check("직접 빌드",["aapt2","javac","d8","zipalign","apksigner"].every(tool=>build.includes(tool)));
check("작은 중복 제목 제거",!ui.includes("<small>스마트 한우관리</small>")&&css.includes('content:"스마트 한우관리"'));
check("한우 제목 이미지",css.includes('background:url("cow-title.svg")')&&build.includes("assets/cow-title.svg"));
check("모바일 제목 표시",css.includes("body.r48-home-screen header .page-title-block")&&css.includes("header .logout-button{display:none!important}"));
check("모바일 상단 운영박스 삭제",css.includes(".r48-farm-top{display:none!important}"));
check("중요알림·주요업무 동일 크기",css.includes("body.r48-home-screen .r48-alert-card h1{font-size:13px!important")&&css.includes(".r48-quick span")&&css.includes("body.r48-home-screen .r48-alert-card h1{font-size:12px!important"));
check("긴급관리 한줄",css.includes("white-space:nowrap!important"));
check("긴급관리 박스 축소",css.includes("min-height:56px;max-height:56px"));
check("긴급관리 표시선 제거",css.includes(".r48-alert-dots{display:none!important}"));
check("긴급관리 배경색",css.includes(".r48-alert-section{padding:8px 10px;background:#e7effb")&&css.includes("background:#e7effb!important"));
check("예약 독립 메뉴",scheduler.includes('className = "nav-scheduler"')&&scheduler.includes("smart-scheduler-menu-card"));
check("하단 예약 메뉴 표시",schedulerCss.includes('aside nav .nav-scheduler{display:grid}'));
check("예약 홈 상시표시 제거",scheduler.includes('document.querySelector(".smart-schedule-summary")?.remove()')&&!scheduler.includes("if (ensureHomeSummary(main)) renderAll()"));
check("예약 사각 카드",schedulerCss.includes("width:min(820px,100%)")&&schedulerCss.includes("max-height:86dvh")&&schedulerCss.includes("border-radius:18px"));
check("개체목록 단독화",isolationCss.includes("r49-cattle-list-only .cattle-page-nav"));
check("개체 기본정보 단독화",isolationCss.includes(".cattle-detail-page>:not(.cattle-resume-card)"));
check("기본정보 편집",isolation.includes("기본정보 수정·편집"));
check("선택개체 삭제 축소",isolation.includes("선택개체 삭제")&&isolationCss.includes("min-height:38px"));
check("새 스타일 연결",html.includes("smart-scheduler-v49.css")&&html.includes("screen-isolation-v49.css")&&html.includes("screen-isolation-v49.js"));
check("주요업무 9개 직접경로",["register","calves","cattle","breeding","calving","treatment","vaccination","schedule","profit"].every(route=>ui.includes(`data-route="${route}"`)));
check("모든 메뉴 한줄",css.includes("white-space:nowrap!important")&&css.includes("-webkit-line-clamp:unset!important"));
check("전문관리 가로 스크롤",css.includes(".professional-tabs{")&&css.includes("overflow-x:auto!important")&&css.includes("min-width:max-content!important"));
check("전문관리 선택 표시",css.includes(".professional-tabs button.current")&&css.includes('content:"✓"'));
check("홈 대시보드 메뉴 이탈 제거",ui.includes('main.querySelector(".r48-home-dashboard")?.remove()'));
check("읽기전용 메뉴 허용",license.includes("aside nav,.r48-home-dashboard,.all-menu-grid,.cattle-page-nav"));
check("파일선택 MIME 판정",activity.includes("FileChooserMime.resolve(accepts)")&&!activity.includes("setType(accepts[0])"));
check("확장자 전체파일 허용",chooser.includes("containsExtension || mimeCount != 1")&&chooser.includes('return "*/*"'));
check("QR 이미지 필터",read("qa/FileChooserMimeTest.java").includes('"QR 이미지"')&&read("qa/FileChooserMimeTest.java").includes('"image/*"'));
check("선택창 실패 복구",activity.includes("파일 선택창을 열지 못했습니다")&&activity.includes("fileCallback = null"));
check("CSV 파일 선택 허용",license.includes(".csv,text/plain,text/csv")&&license.includes("연장파일·CSV 불러오기"));
check("CSV 현재기기 코드 검색",license.includes("applyLicenseFile")&&license.includes("현재 기기용 유효한 연장코드"));
check("CSV 파서 연결",html.includes("license-file-parser-v49.js")&&build.includes("assets/license-file-parser-v49.js"));
check("개체관리 새개체 등록",html.includes('aria-label":"개체관리 세부메뉴')&&html.includes(" 새 개체 등록"));
check("하단 전체메뉴 홈 옆 배치",html.includes('N0=[["home","홈",Ig],["menu","전체메뉴",Gd]'));
check("농장현황 표시 보장",ui.includes('data-r48-section="farm-status"')&&css.includes('[data-r48-section="farm-status"]{display:block!important'));
check("농장현황 직접 이동",ui.includes('if(index===0||index===1)return openWorkList("cattle")')&&ui.includes('if(index===2)return openWorkList("breeding")')&&ui.includes('if(index===3)return window.SmartHanwooScheduler?.open?.()'));

console.log(`PASS: 고객용 완전분리·메뉴복구 ${n}항목`);
