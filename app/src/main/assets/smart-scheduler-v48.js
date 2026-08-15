(function () {
  "use strict";

  const DB_NAME = "smart_hanwoo_scheduler_v1";
  const STORE = "tasks";
  const session = { alerted: "", rendering: false };

  function openDb() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, 1);
      request.onupgradeneeded = () => {
        const db = request.result;
        const store = db.createObjectStore(STORE, { keyPath: "id", autoIncrement: true });
        store.createIndex("dueAt", "dueAt");
        store.createIndex("status", "status");
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error || new Error("예약 저장소를 열 수 없습니다."));
    });
  }

  async function transaction(mode, operation) {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, mode);
      const store = tx.objectStore(STORE);
      const request = operation(store);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
      tx.oncomplete = () => db.close();
    });
  }

  const getTasks = () => transaction("readonly", (store) => store.getAll());
  const saveTask = (task) => transaction("readwrite", (store) => store.put(task));
  const removeTask = (id) => transaction("readwrite", (store) => store.delete(id));

  function esc(value) {
    return String(value ?? "").replace(/[&<>"']/g, (character) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    })[character]);
  }

  function localDate(date = new Date()) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  function taskState(task) {
    if (task.status === "completed") return "completed";
    const now = new Date();
    const due = new Date(task.dueAt);
    if (due.getTime() <= now.getTime()) return "overdue";
    if (localDate(due) === localDate(now)) return "today";
    return "upcoming";
  }

  function formatDue(task) {
    return new Date(task.dueAt).toLocaleString("ko-KR", { month: "numeric", day: "numeric", weekday: "short", hour: "2-digit", minute: "2-digit" });
  }

  function ensureDialog() {
    let backdrop = document.querySelector(".smart-scheduler-backdrop");
    if (backdrop) return backdrop;
    backdrop = document.createElement("div");
    backdrop.className = "smart-scheduler-backdrop";
    backdrop.innerHTML = `
      <section class="smart-scheduler-dialog" role="dialog" aria-modal="true" aria-labelledby="smart-scheduler-title">
        <div class="smart-scheduler-title">
          <div><span>농장 일정관리</span><h2 id="smart-scheduler-title">다음 할 일 예약</h2><p>필요한 일정만 등록하고 예약된 작업을 한눈에 확인합니다.</p></div>
          <button type="button" class="smart-scheduler-close" aria-label="예약 화면 닫기">목록으로</button>
        </div>
        <form class="smart-scheduler-form">
          <input type="hidden" name="id">
          <label>할 일 제목<input name="title" required maxlength="80" placeholder="예: 120번 암소 임신감정"></label>
          <div class="two">
            <label>예약 날짜<input name="date" type="date" required></label>
            <label>예약 시간<input name="time" type="time" required value="08:00"></label>
          </div>
          <div class="two">
            <label>업무 분류<select name="category"><option>번식·분만</option><option>진료·투약</option><option>접종·구충</option><option>사료·사양</option><option>이동·출하</option><option>행정·기타</option></select></label>
            <label>우선순위<select name="priority"><option>보통</option><option>중요</option><option>긴급</option></select></label>
          </div>
          <label>대상 개체·우방<input name="animal" maxlength="60" placeholder="개체명, 이력번호 끝자리 또는 우방"></label>
          <label>상세 메모<textarea name="memo" maxlength="300" placeholder="준비물, 주의사항, 담당자 등을 입력하세요."></textarea></label>
          <div class="smart-scheduler-actions"><button type="button" class="secondary smart-scheduler-reset">새 예약</button><button type="submit">예약 저장</button></div>
        </form>
        <h3>예약된 일정</h3>
        <div class="smart-scheduler-manage-list"></div>
      </section>`;
    document.body.appendChild(backdrop);
    const form = backdrop.querySelector("form");
    form.elements.date.value = localDate();
    backdrop.querySelector(".smart-scheduler-close").addEventListener("click", closeScheduler);
    backdrop.querySelector(".smart-scheduler-reset").addEventListener("click", resetForm);
    form.addEventListener("submit", onSubmit);
    backdrop.querySelector(".smart-scheduler-manage-list").addEventListener("click", onManageAction);
    return backdrop;
  }

  function resetForm() {
    const form = ensureDialog().querySelector("form");
    form.reset();
    form.elements.id.value = "";
    form.elements.date.value = localDate();
    form.elements.time.value = "08:00";
    form.elements.title.focus();
  }

  async function openScheduler() {
    const backdrop = ensureDialog();
    backdrop.classList.add("open");
    document.body.classList.add("smart-scheduler-open");
    document.querySelector("aside .nav-scheduler")?.classList.add("active");
    await renderAll();
    backdrop.querySelector("[name=title]").focus({ preventScroll: true });
  }

  function closeScheduler() {
    document.querySelector(".smart-scheduler-backdrop")?.classList.remove("open");
    document.body.classList.remove("smart-scheduler-open");
    document.querySelector("aside .nav-scheduler")?.classList.remove("active");
  }

  async function onSubmit(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const values = Object.fromEntries(new FormData(form));
    const existingId = Number(values.id || 0);
    const task = {
      title: values.title.trim(), category: values.category, priority: values.priority,
      animal: values.animal.trim(), memo: values.memo.trim(),
      dueAt: new Date(`${values.date}T${values.time}:00`).toISOString(),
      status: "pending", updatedAt: new Date().toISOString()
    };
    if (existingId) {
      const existing = (await getTasks()).find((item) => item.id === existingId);
      Object.assign(task, { id: existingId, status: existing?.status || "pending", createdAt: existing?.createdAt });
    } else task.createdAt = new Date().toISOString();
    await saveTask(task);
    resetForm();
    await renderAll();
  }

  async function onManageAction(event) {
    const button = event.target.closest("button[data-action]");
    if (!button) return;
    const id = Number(button.dataset.id);
    const tasks = await getTasks();
    const task = tasks.find((item) => item.id === id);
    if (!task) return;
    if (button.dataset.action === "complete") await saveTask({ ...task, status: task.status === "completed" ? "pending" : "completed", updatedAt: new Date().toISOString() });
    if (button.dataset.action === "delete" && window.confirm("이 예약을 삭제하시겠습니까?")) await removeTask(id);
    if (button.dataset.action === "edit") {
      const form = ensureDialog().querySelector("form");
      const due = new Date(task.dueAt);
      form.elements.id.value = task.id;
      form.elements.title.value = task.title;
      form.elements.date.value = localDate(due);
      form.elements.time.value = `${String(due.getHours()).padStart(2, "0")}:${String(due.getMinutes()).padStart(2, "0")}`;
      form.elements.category.value = task.category;
      form.elements.priority.value = task.priority;
      form.elements.animal.value = task.animal || "";
      form.elements.memo.value = task.memo || "";
      form.scrollIntoView({ behavior: "smooth", block: "start" });
      form.elements.title.focus();
      return;
    }
    await renderAll();
  }

  function installAccessPoints(main) {
    const nav = document.querySelector("aside nav");
    if (nav && !nav.querySelector("[data-open-scheduler]")) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "nav-scheduler";
      button.dataset.openScheduler = "true";
      button.setAttribute("aria-label", "다음 할 일 예약");
      button.innerHTML = '<span class="scheduler-menu-icon" aria-hidden="true">▣</span><span class="nav-text">할 일 예약</span>';
      button.addEventListener("click", openScheduler);
      nav.querySelector(".nav-exit")?.before(button);
    }
    const grid = main.querySelector(".smart-command-grid");
    if (grid && !grid.querySelector("[data-open-scheduler]")) {
      const button = document.createElement("button");
      button.type = "button";
      button.dataset.openScheduler = "true";
      button.innerHTML = "<i>5</i><b>다음 할 일 예약</b><small>날짜·시간에 맞춰 농장 일정을 자동 표시</small>";
      button.addEventListener("click", openScheduler);
      grid.appendChild(button);
    }
    const articles = Array.from(main.querySelectorAll(".all-menu-grid article"));
    const professional = articles.find((article) => article.querySelector("h3")?.textContent.trim() === "전문 집중관리");
    if (professional && !professional.querySelector("[data-open-scheduler]")) {
      const button = document.createElement("button");
      button.type = "button";
      button.dataset.openScheduler = "true";
      button.textContent = "다음 할 일 예약·일정관리";
      button.addEventListener("click", openScheduler);
      professional.appendChild(button);
    }
    const allMenuGrid = main.querySelector(".all-menu-grid");
    if (allMenuGrid && !allMenuGrid.querySelector(".smart-scheduler-menu-card")) {
      const article = document.createElement("article");
      article.className = "smart-scheduler-menu-card";
      article.innerHTML = '<span class="scheduler-card-icon" aria-hidden="true">▣</span><h3>다음 할 일 예약</h3><p>날짜와 시간에 맞춰 농장업무를 예약하고 관리합니다.</p><button type="button" data-open-scheduler>예약 화면 열기</button>';
      article.querySelector("button").addEventListener("click", openScheduler);
      allMenuGrid.appendChild(article);
    }
  }

  function ensureHomeSummary(main) {
    const center = main.querySelector(".smart-command-center");
    if (!center) return null;
    let summary = main.querySelector(".smart-schedule-summary");
    if (!summary) {
      summary = document.createElement("section");
      summary.className = "smart-schedule-summary";
      summary.innerHTML = `
        <div class="smart-schedule-summary-head"><div><span>SCHEDULED FARM WORK</span><h2>예약 일정</h2></div><button type="button">일정 예약·관리</button></div>
        <div class="smart-schedule-counts"></div><div class="smart-schedule-list"></div>`;
      summary.querySelector("button").addEventListener("click", openScheduler);
      center.insertAdjacentElement("afterend", summary);
    }
    return summary;
  }

  async function markComplete(id) {
    const task = (await getTasks()).find((item) => item.id === id);
    if (task) await saveTask({ ...task, status: "completed", updatedAt: new Date().toISOString() });
    await renderAll();
  }

  function maybeAlert(tasks) {
    const due = tasks.filter((task) => task.status !== "completed" && new Date(task.dueAt) <= new Date());
    const signature = due.map((task) => task.id).join(",");
    if (!due.length || signature === session.alerted || document.querySelector(".smart-due-alert")) return;
    session.alerted = signature;
    const alert = document.createElement("div");
    alert.className = "smart-due-alert";
    alert.setAttribute("role", "alert");
    alert.innerHTML = `<strong>예약시간이 된 농장업무 ${due.length}건</strong><span>${esc(due[0].title)}${due.length > 1 ? ` 외 ${due.length - 1}건` : ""}</span><div><button type="button" data-dismiss>닫기</button><button type="button" data-open>일정 확인</button></div>`;
    alert.querySelector("[data-dismiss]").addEventListener("click", () => alert.remove());
    alert.querySelector("[data-open]").addEventListener("click", () => { alert.remove(); openScheduler(); });
    document.body.appendChild(alert);
  }

  async function renderAll() {
    if (session.rendering) return;
    session.rendering = true;
    try {
      const tasks = (await getTasks()).sort((a, b) => new Date(a.dueAt) - new Date(b.dueAt));
      const pending = tasks.filter((task) => task.status !== "completed");
      const now = new Date();
      const today = pending.filter((task) => localDate(new Date(task.dueAt)) === localDate(now));
      const overdue = pending.filter((task) => new Date(task.dueAt) < now);
      const upcoming = pending.filter((task) => new Date(task.dueAt) > now && localDate(new Date(task.dueAt)) !== localDate(now));
      const summary = document.querySelector(".smart-schedule-summary");
      if (summary) {
        const countsHtml = `<span>지연<b>${overdue.length}건</b></span><span>오늘<b>${today.length}건</b></span><span>예정<b>${upcoming.length}건</b></span>`;
        const counts = summary.querySelector(".smart-schedule-counts");
        if (counts.innerHTML !== countsHtml) counts.innerHTML = countsHtml;
        const listHtml = pending.length ? pending.slice(0, 5).map((task) => `
          <article class="smart-schedule-row ${taskState(task)}"><time>${esc(formatDue(task))}</time><div><strong>${esc(task.title)}</strong><small>${esc(task.category)}${task.animal ? ` · ${esc(task.animal)}` : ""} · ${esc(task.priority)}</small></div><button type="button" data-complete-id="${task.id}">완료</button></article>`).join("") : "<p class=\"smart-schedule-empty\">예약된 다음 할 일이 없습니다.</p>";
        const list = summary.querySelector(".smart-schedule-list");
        if (list.innerHTML !== listHtml) {
          list.innerHTML = listHtml;
          list.querySelectorAll("[data-complete-id]").forEach((button) => button.addEventListener("click", () => markComplete(Number(button.dataset.completeId))));
        }
      }
      const manage = document.querySelector(".smart-scheduler-manage-list");
      const manageHtml = tasks.length ? tasks.map((task) => `
        <article class="smart-scheduler-manage-row ${task.status === "completed" ? "completed" : ""}"><div><strong>${esc(task.title)}</strong><small>${esc(formatDue(task))} · ${esc(task.category)} · ${esc(task.priority)}${task.animal ? ` · ${esc(task.animal)}` : ""}</small></div><div><button type="button" data-action="complete" data-id="${task.id}">${task.status === "completed" ? "되돌리기" : "완료"}</button><button type="button" data-action="edit" data-id="${task.id}">수정</button><button type="button" class="danger" data-action="delete" data-id="${task.id}">삭제</button></div></article>`).join("") : "<p class=\"smart-schedule-empty\">예약된 일정이 없습니다.</p>";
      if (manage && manage.innerHTML !== manageHtml) manage.innerHTML = manageHtml;
      maybeAlert(tasks);
      document.dispatchEvent(new CustomEvent("smart-hanwoo-schedule-changed", { detail: { count: tasks.length } }));
    } catch (error) {
      console.error("예약 일정 표시 오류", error);
    } finally { session.rendering = false; }
  }

  function enhance() {
    const main = document.querySelector(".shell main");
    if (!main) return;
    installAccessPoints(main);
    document.querySelector(".smart-schedule-summary")?.remove();
    if (document.querySelector(".smart-scheduler-backdrop.open")) renderAll();
  }

  window.SmartHanwooScheduler = Object.freeze({
    open: openScheduler,
    close: closeScheduler,
    getTasks
  });

  document.addEventListener("keydown", (event) => { if (event.key === "Escape") closeScheduler(); });
  const root = document.getElementById("root");
  if (root) new MutationObserver(() => window.requestAnimationFrame(enhance)).observe(root, { childList: true, subtree: true });
  ensureDialog();
  enhance();
  window.setInterval(renderAll, 60000);
})();
