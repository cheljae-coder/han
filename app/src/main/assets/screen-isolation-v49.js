(function(){
  "use strict";
  let scheduled=false;
  function compact(value){return String(value||"").replace(/\s+/g," ").trim()}
  function updateDeleteButton(){
    const button=document.querySelector(".bulk-selection-toolbar .bulk-delete-button");
    if(button&&compact(button.textContent)!=="선택개체 삭제")button.textContent="선택개체 삭제";
  }
  function updateEditButton(){
    const button=document.querySelector(".header-cattle-edit");
    if(button&&compact(button.textContent)!=="기본정보 수정·편집")button.textContent="기본정보 수정·편집";
  }
  function updateCompactHeadings(){
    document.querySelectorAll(".page-title-row h1").forEach(heading=>heading.classList.toggle("r51-calf-page-title",compact(heading.textContent)==="송아지 집중관리"));
    document.querySelectorAll(".pro-card h2").forEach(heading=>{
      const text=compact(heading.textContent);
      heading.classList.toggle("r51-calf-record-title",text==="송아지 육성기록 입력");
      heading.classList.toggle("r51-production-cost-title",text==="개체별 생산원가 입력");
    });
  }
  function ensureHandwritingGuide(){
    const action=Array.from(document.querySelectorAll(".file-action.handwritten")).find(label=>compact(label.textContent).includes("손글씨 등록표"));
    const container=action?.parentElement;
    if(!action||!container||container.querySelector(".r51-handwriting-guide"))return;
    const guide=document.createElement("details");
    guide.className="r51-handwriting-guide";
    guide.innerHTML=`<summary>손글씨가 잘 인식되는 작성·촬영 방법</summary>
      <div class="r51-handwriting-help">
        <strong>흰 종이에 아래 항목명을 인쇄하거나 자로 먼저 적고, 값만 굵은 검정펜으로 쓰세요.</strong>
        <pre>개체번호: 12자리 숫자
관리명: 한글 이름
출생일: 2026-08-15
성별: 암
모 개체번호: 12자리 숫자
축사: 1번 우방
상태: 사육
신고일: 2026-08-15</pre>
        <ol>
          <li>숫자와 글자를 이어 쓰지 말고 한 칸에 한 글자처럼 띄워 씁니다.</li>
          <li>0·6·8·9, 1·7이 서로 다르게 보이도록 획을 닫고 또박또박 씁니다.</li>
          <li>종이를 밝은 곳에 평평하게 놓고 그림자 없이 정면에서 촬영합니다.</li>
          <li>종이 네 모서리가 사진 안에 모두 들어오게 하고 흔들리지 않게 촬영합니다.</li>
          <li>자동입력 뒤에는 특히 12자리 번호와 날짜를 반드시 확인합니다.</li>
        </ol>
        <p>자유로운 한글 필기체는 사진 OCR의 한계가 있습니다. 관리명은 비워 두었다가 입력칸을 누르고 휴대전화 키보드의 마이크로 말해 입력하는 방법이 가장 쉽습니다.</p>
      </div>`;
    action.after(guide);
  }
  function appButton(text){
    return Array.from(document.querySelectorAll("button")).find(button=>!button.closest(".r48-home-dashboard,.r50-independent-menu-card,.r50-independent-toolbar")&&compact(button.textContent)===text);
  }
  function clickSteps(steps,index=0,attempt=0,done){
    const button=appButton(steps[index]);
    if(button){button.click();if(index+1<steps.length)setTimeout(()=>clickSteps(steps,index+1,0,done),70);else if(done)setTimeout(done,100);return}
    if(attempt<30)setTimeout(()=>clickSteps(steps,index,attempt+1,done),60);
  }
  function matchCattleOption(select,label){
    const source=compact(label),digits=(source.match(/\d+/g)||[]).join("").slice(-4),words=source.split(/[^가-힣A-Za-z0-9]+/).filter(word=>word.length>=2);
    return Array.from(select.options).find(option=>{const text=compact(option.textContent);return digits&&text.includes(digits)||words.some(word=>text.includes(word))});
  }
  function openCattleSelection(){clickSteps(["개체관리","개체 기본목록"])}
  function openBreedingEdit(label,hasRecord){
    if(!hasRecord){clickSteps(["번식관리","새 번식기록"],0,0,()=>{const select=document.querySelector('form select[required]'),option=select&&matchCattleOption(select,label);if(option){select.value=option.value;select.dispatchEvent(new Event("change",{bubbles:true}))}});return}
    clickSteps(["번식관리","번식현황 목록"],0,0,()=>{
      const rows=Array.from(document.querySelectorAll(".data-table tbody tr")),source=compact(label),digits=(source.match(/\d+/g)||[]).join("").slice(-4),words=source.split(/[^가-힣A-Za-z0-9]+/).filter(word=>word.length>=2),row=rows.find(item=>{const text=compact(item.textContent);return digits&&text.includes(digits)||words.some(word=>text.includes(word))});
      if(row){const selectButton=row.querySelector("button");if(selectButton){selectButton.click();setTimeout(()=>document.querySelector(".breeding-detail-actions .detail-edit")?.click(),180)}}
    })
  }
  function ensureManagementEditButton(){
    const row=document.querySelector(".page-title-row"),title=row?.querySelector("h1"),name=compact(title?.textContent),allowed=["개체관리","번식관리","전문 집중관리","번식 자동관리","송아지 집중관리","사양·경영관리"];
    const existing=row?.querySelector(".r50-management-edit"),detail=document.querySelector(".cattle-detail-page");
    if(!row||!allowed.includes(name)||detail){existing?.remove();return}
    if(existing)return;
    const button=document.createElement("button");button.type="button";button.className="r50-management-edit";button.textContent="개체 선택·수정편집";button.addEventListener("click",openCattleSelection);row.appendChild(button);
  }
  function ensureBreedingRowActions(){
    const card=Array.from(document.querySelectorAll(".pro-card")).find(section=>compact(section.querySelector("h2")?.textContent)==="번식 자동관리");
    if(!card)return;
    card.querySelectorAll("tbody tr").forEach(row=>{if(row.querySelector(".r50-breeding-edit"))return;const cells=row.querySelectorAll("td");if(!cells.length)return;const button=document.createElement("button");button.type="button";button.className="r50-breeding-edit";button.textContent=cells[1]&&compact(cells[1].textContent)!=="-"?"선택·번식 수정편집":"선택·새 번식기록";button.addEventListener("click",event=>{event.stopPropagation();openBreedingEdit(cells[0].textContent,button.textContent.includes("수정"))});cells[0].appendChild(button)})
  }
  function openProfessionalSection(label){clickSteps(["전체메뉴","전문관리 전체보기",label])}
  function ensureIndependentMenuCards(){
    const grid=document.querySelector(".all-menu-grid");if(!grid)return;
    [["번식 자동관리","수정·임신·분만 예측을 독립 화면에서 관리"],["송아지 집중관리","생후 90일 송아지 건강·성장 집중관리"]].forEach(([title,description])=>{if(grid.querySelector(`[data-independent-menu="${title}"]`))return;const article=document.createElement("article");article.className="r50-independent-menu-card";article.dataset.independentMenu=title;article.innerHTML=`<span class="menu-icon">◎</span><h3>${title}</h3><p>${description}</p><button type="button">${title} 열기</button>`;article.querySelector("button").addEventListener("click",()=>openProfessionalSection(title));grid.appendChild(article)})
  }
  function updateProfessionalMode(){
    const tabs=document.querySelector(".professional-tabs"),current=tabs?.querySelector("button.current"),label=compact(current?.textContent),independent=["번식 자동관리","송아지 집중관리"].includes(label),title=document.querySelector(".page-title-row h1");
    document.body.classList.toggle("r50-independent-professional",independent);
    if(!tabs||!title)return;
    const wantedTitle=independent?label:"전문 집중관리";if(compact(title.textContent)!==wantedTitle)title.textContent=wantedTitle;
    let toolbar=document.querySelector(".r50-independent-toolbar");
    if(!independent){toolbar?.remove();return}
    if(!toolbar){toolbar=document.createElement("div");toolbar.className="r50-independent-toolbar";toolbar.innerHTML='<strong></strong><button type="button">전문 집중관리로 돌아가기</button>';toolbar.querySelector("button").addEventListener("click",()=>tabs.querySelector("button")?.click());tabs.after(toolbar)}
    const strong=toolbar.querySelector("strong"),text=label+" 독립 관리화면";if(strong.textContent!==text)strong.textContent=text;
  }
  function updateScreenState(){
    scheduled=false;
    const detail=document.querySelector(".cattle-detail-page");
    const listToolbar=document.querySelector(".bulk-selection-toolbar");
    document.body.classList.toggle("r49-cattle-detail-only",!!detail);
    document.body.classList.toggle("r49-cattle-list-only",!detail&&!!listToolbar);
    updateDeleteButton();
    updateEditButton();
    updateCompactHeadings();
    ensureHandwritingGuide();
    updateProfessionalMode();
    ensureManagementEditButton();
    ensureBreedingRowActions();
    ensureIndependentMenuCards();
  }
  function scheduleUpdate(){if(scheduled)return;scheduled=true;requestAnimationFrame(updateScreenState)}
  const root=document.getElementById("root");
  if(root)new MutationObserver(scheduleUpdate).observe(root,{childList:true,subtree:true});
  document.addEventListener("click",scheduleUpdate,true);
  scheduleUpdate();
})();
