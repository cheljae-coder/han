(function () {
  "use strict";

  var VERSION = "2026.08.14-R50-COMPLETE";
  var DB_NAME = "smart-hanwoo-manager";
  var RELATION_STORES = [
    "breeding", "treatments", "schedules", "weights", "movements",
    "shipments", "calf_care", "task_completions", "cattle_costs",
    "feed_records", "heat_observations", "health_observations"
  ];
  var scheduled = false;

  function requestValue(request) {
    return new Promise(function (resolve, reject) {
      request.onsuccess = function () { resolve(request.result); };
      request.onerror = function () { reject(request.error || new Error("저장소 요청 실패")); };
    });
  }

  function openDatabase() {
    return new Promise(function (resolve, reject) {
      if (!window.indexedDB) {
        reject(new Error("이 실행환경에서는 기기 저장소를 사용할 수 없습니다."));
        return;
      }
      var request = indexedDB.open(DB_NAME);
      request.onsuccess = function () { resolve(request.result); };
      request.onerror = function () { reject(request.error || new Error("기기 저장소를 열지 못했습니다.")); };
    });
  }

  async function getAll(db, storeName) {
    if (!db.objectStoreNames.contains(storeName)) return [];
    var transaction = db.transaction(storeName, "readonly");
    return requestValue(transaction.objectStore(storeName).getAll());
  }

  function addIssue(issues, level, title, detail) {
    issues.push({ level: level, title: title, detail: detail });
  }

  async function auditData() {
    var db = await openDatabase();
    try {
      var cattle = await getAll(db, "cattle");
      var cattleIds = new Set(cattle.map(function (item) { return String(item.id); }));
      var issues = [];
      var traces = new Map();
      var today = new Date().toISOString().slice(0, 10);

      cattle.forEach(function (item) {
        var label = item.name || item.trace_number || ("ID " + item.id);
        var trace = String(item.trace_number || "").replace(/\D/g, "");
        if (trace.length !== 12) addIssue(issues, "error", "이력번호 확인", label + "의 이력번호가 12자리가 아닙니다.");
        if (trace) {
          if (traces.has(trace)) addIssue(issues, "error", "이력번호 중복", label + "과 " + traces.get(trace) + "의 이력번호가 같습니다.");
          else traces.set(trace, label);
        }
        if (!item.sex) addIssue(issues, "warning", "성별 누락", label + "의 성별이 입력되지 않았습니다.");
        if (!item.birth_date) addIssue(issues, "error", "출생일 누락", label + "의 출생일이 입력되지 않았습니다.");
        if (item.birth_date && item.birth_date > today) addIssue(issues, "error", "출생일 확인", label + "의 출생일이 미래 날짜입니다.");
      });

      for (var index = 0; index < RELATION_STORES.length; index += 1) {
        var storeName = RELATION_STORES[index];
        var records = await getAll(db, storeName);
        records.forEach(function (record) {
          if (record.cattle_id != null && !cattleIds.has(String(record.cattle_id))) {
            addIssue(issues, "error", "연결되지 않은 기록", storeName + " 기록 ID " + record.id + "에 해당하는 개체가 없습니다.");
          }
          if (storeName === "breeding" && record.service_date && record.expected_calving && record.expected_calving < record.service_date) {
            addIssue(issues, "error", "번식 날짜 확인", "번식 기록 ID " + record.id + "의 분만예정일이 수정일보다 빠릅니다.");
          }
          if (storeName === "treatments" && record.treatment_date && record.withdrawal_end && record.withdrawal_end < record.treatment_date) {
            addIssue(issues, "error", "휴약기간 확인", "진료 기록 ID " + record.id + "의 휴약종료일이 진료일보다 빠릅니다.");
          }
          if (storeName === "schedules" && (!record.due_date || !record.name)) {
            addIssue(issues, "warning", "일정 정보 누락", "일정 기록 ID " + record.id + "의 날짜 또는 작업명이 비어 있습니다.");
          }
        });
      }
      return { cattleCount: cattle.length, issues: issues };
    } finally {
      db.close();
    }
  }

  function closeDialog() {
    var backdrop = document.querySelector(".r50-audit-backdrop");
    if (backdrop) backdrop.remove();
    document.body.classList.remove("r50-audit-open");
  }

  function resultNode(result) {
    var container = document.createElement("div");
    container.className = "r50-audit-results";
    var summary = document.createElement("p");
    var errors = result.issues.filter(function (issue) { return issue.level === "error"; }).length;
    var warnings = result.issues.length - errors;
    summary.className = result.issues.length ? "has-issues" : "clean";
    summary.textContent = result.issues.length
      ? "개체 " + result.cattleCount + "두에서 오류 " + errors + "건, 확인 필요 " + warnings + "건을 찾았습니다."
      : "개체 " + result.cattleCount + "두의 데이터 연결과 주요 날짜가 정상입니다.";
    container.appendChild(summary);
    if (!result.issues.length) return container;
    var list = document.createElement("ul");
    result.issues.forEach(function (issue) {
      var item = document.createElement("li");
      item.className = issue.level;
      var strong = document.createElement("strong");
      strong.textContent = issue.title;
      var detail = document.createElement("span");
      detail.textContent = issue.detail;
      item.appendChild(strong);
      item.appendChild(detail);
      list.appendChild(item);
    });
    container.appendChild(list);
    return container;
  }

  async function runAudit() {
    closeDialog();
    var backdrop = document.createElement("div");
    backdrop.className = "r50-audit-backdrop";
    backdrop.innerHTML = '<section class="r50-audit-dialog" role="dialog" aria-modal="true" aria-labelledby="r50-audit-title">' +
      '<header><div><small>DATA SAFETY CHECK</small><h2 id="r50-audit-title">데이터 무결성 점검</h2></div><button type="button" class="r50-audit-close" aria-label="닫기">×</button></header>' +
      '<p class="r50-audit-help">저장된 자료를 변경하지 않고 이력번호, 개체 연결, 주요 날짜 오류를 검사합니다.</p>' +
      '<div class="r50-audit-progress" role="status">기기 저장소를 점검하고 있습니다…</div>' +
      '<footer><button type="button" class="r50-audit-rerun">다시 점검</button><button type="button" class="r50-audit-done">확인</button></footer>' +
      '</section>';
    document.body.appendChild(backdrop);
    document.body.classList.add("r50-audit-open");
    backdrop.querySelector(".r50-audit-close").addEventListener("click", closeDialog);
    backdrop.querySelector(".r50-audit-done").addEventListener("click", closeDialog);
    backdrop.querySelector(".r50-audit-rerun").addEventListener("click", runAudit);
    backdrop.addEventListener("click", function (event) { if (event.target === backdrop) closeDialog(); });
    backdrop.querySelector(".r50-audit-close").focus();
    try {
      var result = await auditData();
      var progress = backdrop.querySelector(".r50-audit-progress");
      if (progress) progress.replaceWith(resultNode(result));
    } catch (error) {
      var failed = backdrop.querySelector(".r50-audit-progress");
      if (failed) {
        failed.className = "r50-audit-results failed";
        failed.textContent = error && error.message ? error.message : "데이터 점검을 완료하지 못했습니다.";
      }
    }
  }

  function installAuditMenu() {
    var cards = Array.from(document.querySelectorAll(".all-menu-grid article"));
    var reportCard = cards.find(function (card) {
      var heading = card.querySelector("h3");
      return heading && heading.textContent.trim() === "보고서·자료";
    });
    if (!reportCard || reportCard.querySelector(".r50-data-audit-button")) return;
    var button = document.createElement("button");
    button.type = "button";
    button.className = "r50-data-audit-button";
    button.textContent = "데이터 무결성 점검";
    button.addEventListener("click", runAudit);
    reportCard.appendChild(button);
  }

  function sanitizeRuntimeMessages() {
    document.querySelectorAll(".market-panel span, .r48-market span, .key-notice strong").forEach(function (node) {
      var message = node.textContent || "";
      if (message.indexOf("fetchMarketXml") >= 0 || message.indexOf("Cannot read properties") >= 0) {
        node.textContent = "웹 미리보기에서는 시세 통신을 사용할 수 없습니다. Android 앱에서 다시 조회해 주세요.";
      }
    });
  }

  function enhance() {
    scheduled = false;
    document.title = "스마트 한우관리 프로그램";
    document.querySelectorAll("aside small").forEach(function (node) {
      if (node.textContent.trim().indexOf("버전 ") === 0) node.textContent = "버전 " + VERSION;
    });
    document.querySelectorAll(".page-title-row h1").forEach(function (heading) {
      heading.setAttribute("aria-label", heading.textContent.trim() || "스마트 한우관리");
    });
    sanitizeRuntimeMessages();
    installAuditMenu();
  }

  function scheduleEnhance() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(enhance);
  }

  function validateCattleRegistration(event) {
    var form = event.target;
    if (!(form instanceof HTMLFormElement)) return;
    var trace = form.querySelector('input[placeholder="12자리 숫자"]');
    if (!trace) return;
    var birthDate = form.querySelector('input[type="date"][required]');
    if (!birthDate) return;
    birthDate.setCustomValidity("");
    var today = new Date().toISOString().slice(0, 10);
    if (!birthDate.value) birthDate.setCustomValidity("출생일자를 입력해 주세요.");
    else if (birthDate.value > today) birthDate.setCustomValidity("출생일자는 오늘 이후 날짜로 입력할 수 없습니다.");
    if (!birthDate.checkValidity()) {
      event.preventDefault();
      event.stopImmediatePropagation();
      birthDate.reportValidity();
      birthDate.focus();
    }
  }

  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape" && document.querySelector(".r50-audit-backdrop")) closeDialog();
  });
  document.addEventListener("submit", validateCattleRegistration, true);
  document.addEventListener("input", function (event) {
    if (event.target instanceof HTMLInputElement && event.target.type === "date") {
      event.target.setCustomValidity("");
    }
  }, true);
  new MutationObserver(scheduleEnhance).observe(document.documentElement, {
    childList: true,
    characterData: true,
    subtree: true
  });
  // The legacy dashboard may repaint an asynchronous market error without
  // replacing its surrounding element, so keep the user-facing message clean.
  if (!window.AndroidBridge && !(window.chrome && window.chrome.webview)) {
    window.setInterval(sanitizeRuntimeMessages, 500);
  }
  scheduleEnhance();
  window.SmartHanwooDataAudit = { run: runAudit, inspect: auditData, version: VERSION };
})();
