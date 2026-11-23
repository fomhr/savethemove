(function surveyApp(){
  'use strict';
  const role=document.body.dataset.role;
  const QUESTIONS=window.SURVEY_DATA?.[role]||[];
  const answers={};
  let pageIndex=0;
  let review=false;
  let intro=true;
  const countModes={};
  const $=id=>document.getElementById(id);
  const esc=value=>String(value??"").replace(/[&<>"']/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[char]));
  const isMulti=q=>/복수선택|중복선택/.test(q.type);
  const isNumeric=q=>/숫자|정수/.test(q.type);
  const isBundle=q=>q.type==="복합 집계"&&Array.isArray(q.fields);
  const fieldQuestion=id=>QUESTIONS.find(q=>q.id===id||(q.fields||[]).some(f=>f.key===id));
  const isLong=q=>/서술|장문/.test(q.type);
  const maxChoices=q=>Number((q.type.match(/최대\s*(\d+)/)||[])[1]||999);
  const noneOption=s=>["없음","경험 없음","참여한 적 없음","별도 운영 없음","어려움 없음"].includes(s);
  const hasOther=q=>(q.choices||[]).includes("기타");
  const selectedOther=q=>isMulti(q)?(Array.isArray(answers[q.id])&&answers[q.id].includes("기타")):answers[q.id]==="기타";
  function eligible(q){
    if(role==="팀장"){
      const familyTracks=["실적 관리","둘 다"].includes(answers.M05);
      const gasTracks=["실적 관리","둘 다"].includes(answers["M19-METHOD"]);
      if(q.id==="M05-F1")return familyTracks;
      if(q.id==="M19"||q.id==="M19-FREQ")return gasTracks;
      return true;
    }
    const c=q.condition||"";
    const familyEdu=Array.isArray(answers.C03)&&answers.C03.some(x=>/^202[3-6]년$/.test(x));
    const familyApplied=Number(answers.C06)>0;
    const gasApplied=Number(answers.C27)>0;
    const internal=Array.isArray(answers.C25)&&answers.C25.some(x=>!noneOption(x));
    if(c.includes("법인 교육 참여")&&!familyEdu)return false;
    if((c.includes("적용 사례 1 이상")||c.includes("적용 가정 1 이상"))&&!familyApplied)return false;
    if(c.includes("GAS 적용 1사례 이상")&&!gasApplied)return false;
    if(c.includes("팀장 슈퍼비전 경험자")&&!(Array.isArray(answers.C25)&&answers.C25.includes("팀장 슈퍼비전")))return false;
    if(c.includes("법인 교육 또는 내부 학습 경험자")&&answers.C24!=="예"&&!internal)return false;
    return true;
  }
  function visible(){return QUESTIONS.filter(eligible);}
  function groups(){
    const out=[];
    for(const q of visible()){
      const key=q.area+"|||"+q.section;
      const tail=out[out.length-1];
      if(!tail||tail.key!==key)out.push({key,area:q.area,section:q.section,questions:[q]});
      else tail.questions.push(q);
    }
    return out;
  }
  function locatePrevious(key){
    const arr=groups();
    const i=arr.findIndex(s=>s.key===key);
    pageIndex=Math.max(0,i<0?Math.min(pageIndex,arr.length-1):i);
  }
  function questionNo(q){
    return visible().findIndex(x=>x.id===q.id)+1;
  }
  function answerLabel(q){
    const a=answers[q.id];
    if(Array.isArray(a))return a.join(", ");
    return a==null?"":String(a);
  }

  function countHtml(id,label,unit,question){
    const textVal=String(answers[id]??"");
    const manual=countModes[id]==="over"||(/^\d+$/.test(textVal)&&Number(textVal)>10);
    const selected=manual?"over":textVal;
    const maxLabel=unit==="회"?"회":"사례";
    const start=id==="C07-MAX"?1:0;
    const opts=[["","선택해 주세요"]];
    if(start===0)opts.push(["0","없음"]);
    for(let i=Math.max(1,start);i<=10;i++)opts.push([String(i),i+" "+maxLabel]);
    opts.push(["over","10 "+maxLabel+" 초과(직접 입력)"]);
    const input=opts.map(([v,n])=>`<option value="${esc(v)}" ${selected===v?"selected":""}>${esc(n)}</option>`).join("");
    const manualInput=manual?`<div class="count-manual"><input class="textinput" type="number" min="11" step="1" inputmode="numeric" data-count-input="${esc(id)}" value="${esc(Number(textVal)>10?textVal:"")}" placeholder="11 이상 직접 입력" aria-label="${esc(label)} 10 초과 입력"></div>`:"";
    return `<div class="count-field">${label?`<label class="count-label" for="count-${esc(id)}">${esc(label)}</label>`:""}<select class="textinput count-select" id="count-${esc(id)}" data-count-select="${esc(id)}" aria-label="${esc(question||label)}">${input}</select>${manualInput}</div>`;
  }
  const requiredWriting = ' <span style="color:var(--red-dark);font-weight:700">필수작성</span>';
  function questionHtml(q){
    const multi=isMulti(q),num=isNumeric(q),long=isLong(q),opts=q.choices||[];
    const val=answers[q.id],selection=Array.isArray(val)?val:val==null?[]:[val];
    const note=multi?` <span class="multi-note">(${maxChoices(q)===999?"복수선택":"복수선택 · 최대 "+maxChoices(q)+"개"})</span>`:"";
    let html=`<section class="question" id="question-${esc(q.id)}"><h3 class="question-title"><span class="qnum">${questionNo(q)}.</span>${esc(q.question)}${note}</h3>`;
    if(isBundle(q)){
      if(q.note)html+=`<p class="field-note">${esc(q.note)}</p>`;
      if(q.fields.some(f=>f.group)){
        const labels={total:"전체 적용",deep:"심층사례관리강화사업",general:"일반 사례관리"};
        const groupIds=[...new Set(q.fields.map(f=>f.group))];
        html+=`<div class="count-groups">${groupIds.map(group=>`<div class="count-pair-group"><div class="count-pair-heading">${esc(labels[group]||group)}</div><div class="count-pair-grid">${q.fields.filter(f=>f.group===group).map(f=>countHtml(f.key,f.label,f.unit,f.label)).join("")}</div></div>`).join("")}</div>`;
      }else html+=`<div class="count-fields">${q.fields.map(f=>countHtml(f.key,f.label,f.unit,f.label)).join("")}</div>`;
    }else if(num){
      const unit=/회|횟수/.test(q.question)?"회":"사례";
      html+=countHtml(q.id,"",unit,q.question);
    }
    else if(long||opts.length===0)html+=`<label for="written-${esc(q.id)}">${requiredWriting}</label><textarea required id="written-${esc(q.id)}" class="textinput" rows="4" data-entry="${esc(q.id)}" aria-label="${esc(q.question)}">${esc(val??"")}</textarea>`;
    else {
      const scale=/5점/.test(q.type);
      html+=`<div class="${scale?"scale":"options"}">`;
      opts.forEach((opt,i)=>{
        const checked=selection.includes(opt)?"checked":"";
        html+=`<label class="option"><input type="${multi?"checkbox":"radio"}" name="${esc(q.id)}" data-choice="${esc(q.id)}" data-index="${i}" ${checked}><span>${esc(opt)}</span></label>`;
      });
      html+="</div>";
    }
    if(hasOther(q)&&selectedOther(q)){
      html+=`<div class="followup"><label for="other-${esc(q.id)}">기타 내용을 작성해 주세요.${requiredWriting}</label><textarea required id="other-${esc(q.id)}" class="textinput" rows="2" data-extra="${esc(q.id)}" placeholder="구체적인 내용을 입력해 주세요">${esc(answers[q.id+"__other"]??"")}</textarea></div>`;
    }
    if(multi&&q.reason&&!(selection.length===1&&selection.every(noneOption))){
      html+=`<div class="followup"><label for="reason-${esc(q.id)}">${esc(q.reasonLabel||"선택한 항목의 구체적인 사유를 작성해 주세요.")}${requiredWriting}</label><textarea required id="reason-${esc(q.id)}" class="textinput" rows="3" data-reason="${esc(q.id)}" placeholder="선택한 이유나 관련 경험을 구체적으로 입력해 주세요">${esc(answers[q.id+"__reason"]??"")}</textarea></div>`;
    }
    html+=`<div class="error hidden" id="error-${esc(q.id)}" role="alert"></div></section>`;
    return html;
  }
  function setError(id,msg){
    const box=$("question-"+id);
    const el=$("error-"+id);
    if(!box||!el)return;
    box.classList.toggle("invalid",Boolean(msg));
    el.textContent=msg||"";
    el.classList.toggle("hidden",!msg);
  }
  function check(q){
    const a=answers[q.id];
    if(isBundle(q)){
      for(const field of q.fields){
        const value=answers[field.key];
        if(value==null||String(value).trim()==="")return "필수 응답입니다. '"+field.label+"' 항목을 선택해 주세요.";
        if(!/^\d+$/.test(String(value))||!Number.isSafeInteger(Number(value)))return "'"+field.label+"' 항목에 0 이상의 정수를 입력해 주세요.";
        if(countModes[field.key]==="over"&&Number(value)<=10)return "'"+field.label+"' 항목은 11 이상 입력해 주세요.";
      }
    }else if(isNumeric(q)){
      if(a==null||String(a).trim()==="")return "필수 응답입니다. 해당 실적이 없으면 '없음'을 선택해 주세요.";
      if(!/^\d+$/.test(String(a))||!Number.isSafeInteger(Number(a)))return "0 이상의 정수를 입력해 주세요.";
      if(countModes[q.id]==="over"&&Number(a)<=10)return "11 이상 입력해 주세요.";
      if(q.id==="C07-MAX"&&Number(a)<1)return "가족팀회의를 적용한 경우 최소 1회 이상을 선택해 주세요.";
    }else if(isMulti(q)){
      if(!Array.isArray(a)||a.length===0)return "필수 응답입니다. 항목을 선택해 주세요.";
      if(a.length>maxChoices(q))return "최대 "+maxChoices(q)+"개까지 선택할 수 있습니다.";
    }else if(isLong(q)||!(q.choices||[]).length){
      if(!String(a??"").trim())return "필수 응답입니다. 내용을 입력해 주세요.";
    }else if(!String(a??"").trim())return "필수 응답입니다. 항목을 선택해 주세요.";
    if(hasOther(q)&&selectedOther(q)&&!String(answers[q.id+"__other"]??"").trim())return "기타 내용을 입력해 주세요.";
    if(isMulti(q)&&q.reason&&!(Array.isArray(a)&&a.length===1&&a.every(noneOption))&&!String(answers[q.id+"__reason"]??"").trim())return "선택한 사유를 입력해 주세요.";
    if(q.id==="C05-C07"){
      const meetings=Number(answers.C05),cases=Number(answers.C06),repeat=Number(answers.C07);
      if(repeat>cases)return "2회 이상 진행한 사례 수가 전체 진행 사례 수를 초과할 수 없습니다.";
      if(meetings<cases)return "총 진행 횟수는 진행 사례 수보다 적을 수 없습니다.";
      if(meetings<cases+repeat)return "반복 진행 사례 수를 고려할 때 총 진행 횟수가 부족합니다.";
    }
    if(q.id==="C07-MAX"){
      if(Number(a)>Number(answers.C05))return "한 사례의 최대 회의 횟수는 전체 진행 횟수를 초과할 수 없습니다.";
      if(Number(answers.C07)>0&&Number(a)<2)return "2회 이상 반복 진행 사례가 있으므로 최소 2회 이상이어야 합니다.";
      if(Number(answers.C07)===0&&Number(a)>1)return "2회 이상 반복 진행 사례가 없는 경우 최대 진행 횟수는 1회입니다.";
    }
    if(q.id==="C27-C30"){
      const totalCases=Number(answers.C27),totalTimes=Number(answers.C28);
      const deepCases=Number(answers["C29-CASE"]),deepTimes=Number(answers.C29);
      const generalCases=Number(answers["C30-CASE"]),generalTimes=Number(answers.C30);
      if(totalTimes<totalCases)return "전체 적용 횟수는 전체 적용 사례 수보다 적을 수 없습니다.";
      if(deepTimes<deepCases)return "심층사례관리강화사업의 적용 횟수는 적용 사례 수보다 적을 수 없습니다.";
      if(generalTimes<generalCases)return "일반 사례관리의 적용 횟수는 적용 사례 수보다 적을 수 없습니다.";
      if(deepCases>totalCases||generalCases>totalCases)return "각 과정의 적용 사례 수는 전체 적용 사례 수를 초과할 수 없습니다.";
      if(deepTimes+generalTimes!==totalTimes)return "심층사업과 일반 사례관리 적용 횟수의 합계가 전체 적용 횟수와 일치해야 합니다.";
    }
    return "";
  }
  function validateCurrent(){
    const current=groups()[pageIndex];
    if(!current)return false;
    let first="";
    for(const q of current.questions){
      const err=check(q);
      setError(q.id,err);
      if(!first&&err)first=q.id;
    }
    if(first){
      $("status").textContent="필수 응답 또는 입력 내용을 확인해 주세요.";
      $("question-"+first)?.scrollIntoView({behavior:"smooth",block:"center"});
      return false;
    }
    $("status").textContent="";
    return true;
  }
  function progress(){
    const arr=groups();
    const total=arr.length+2;
    const current=intro?1:review?total:Math.min(pageIndex+2,total);
    $("stepCounter").textContent=`${current} / ${total} 단계`;
    $("percent").textContent=Math.round(current/total*100)+"%";
    $("progress").style.width=current/total*100+"%";
  }
  function renderIntro(){
    $("content").innerHTML=`
      <h2 class="area">설문 안내</h2>
      <div class="guide-section">
        <h3 class="guide-title">설문조사 기간</h3>
        <p class="guide-date">2026년 11월 23일(월) ~ 12월 4일(금)</p>
      </div>
      <div class="guide-section">
        <h3 class="guide-title">응답 안내</h3>
        <ul class="guide-list">
          <li>필수 항목은 모두 응답해야 다음 페이지로 이동할 수 있습니다.</li>
          <li>이전 버튼을 눌러 응답을 수정할 수 있습니다.</li>
          <li>적용 경험이 없는 경우 효과성 관련 문항은 자동으로 제외됩니다.</li>
          <li>응답은 익명으로 수집합니다.</li>
        </ul>
      </div>
      <div class="note">본 조사는 총 <strong>${QUESTIONS.length}문항</strong>입니다. 실제 응답 문항 수는 교육·적용 경험에 따라 달라질 수 있습니다. 응답에 다소 시간이 걸리더라도 향후 법인 지원과 기관별 자체 운영 방향을 구체화하는 데 도움이 되도록 최대한 상세히 답변해 주시기 바랍니다.</div>
    `;
    $("previous").disabled=true;
    $("next").textContent="설문 시작";
    $("status").textContent="";
    progress();
  }
  function renderReview(){
    const qs=visible();
    let out=`<h2 class="area">응답 확인</h2><h3 class="section">작성한 내용을 확인해 주세요.</h3><p class="description">이전 버튼으로 수정할 수 있습니다. 아래 버튼은 응답 파일을 내려받으며, 온라인 서버로 전송하지 않습니다.</p>`;
    out+=`<div class="summary">`;
    qs.forEach(q=>{
      let value=isBundle(q)?q.fields.map(f=>f.label+": "+(answers[f.key]??"")+" "+f.unit).join("\n"):answerLabel(q);
      if(hasOther(q)&&selectedOther(q))value+="\n기타: "+(answers[q.id+"__other"]||"");
      if(isMulti(q)&&q.reason)value+="\n선택 사유: "+(answers[q.id+"__reason"]||"");
      out+=`<div class="summary-row"><div class="summary-title">${questionNo(q)}. ${esc(q.question)}</div><div class="summary-answer">${esc(value)}</div></div>`;
    });
    out+="</div>";
    $("content").innerHTML=out;
    $("previous").disabled=false;
    $("next").textContent="응답 제출";
    progress();
  }
  function render(){
    if(intro){renderIntro();return;}
    const arr=groups();
    if(!arr.length){$("content").textContent="설문을 표시할 수 없습니다.";return;}
    if(review){renderReview();return;}
    pageIndex=Math.min(pageIndex,arr.length-1);
    const p=arr[pageIndex];
    $("content").innerHTML=`<h2 class="area">${esc(p.area)}</h2><h3 class="section">${esc(p.section)}</h3><p class="description">각 문항에 응답한 후 다음 단계로 이동해 주세요.</p>${p.questions.map(questionHtml).join("")}`;
    $("previous").disabled=false;
    $("next").textContent=pageIndex===arr.length-1?"응답 확인":"다음";
    $("status").textContent="";
    progress();
  }
  function moveTop(){window.scrollTo({top:0,behavior:"smooth"});}
  let submissionId;
  async function submitResponse(){
    const missing=visible().filter(q=>check(q));
    if(missing.length){
      review=false;
      const i=groups().findIndex(g=>g.questions.some(q=>q.id===missing[0].id));
      pageIndex=Math.max(0,i);
      render();
      validateCurrent();
      return;
    }
    const data={schema:"FAMILY_GAS_2026_v3",role,id:submissionId??=crypto.randomUUID(),answers:{}};
    for(const q of visible()){
      if(isBundle(q)){for(const field of q.fields)data.answers[field.key]=answers[field.key];}else data.answers[q.id]=answers[q.id];
      if(hasOther(q)&&selectedOther(q))data.answers[q.id+"__other"]=answers[q.id+"__other"];
      if(isMulti(q)&&q.reason&&!(answers[q.id].length===1&&answers[q.id].every(noneOption)))data.answers[q.id+"__reason"]=answers[q.id+"__reason"];
    }
    const next=$("next");
    const previous=$("previous");
    next.disabled=true;
    previous.disabled=true;
    $("status").textContent="응답을 제출하고 있습니다.";
    try {
      const response=await fetch("https://script.google.com/macros/s/AKfycbwLfMZYIszR9p2ZTo75O-hmUmE7dQZTYrME1kTBQwiGQgiPe9jg6xGAStNDYfG-Dk2c/exec",{
        method:"POST",
        credentials:"omit",
        headers:{"Content-Type":"text/plain;charset=UTF-8"},
        body:JSON.stringify(data),
        signal:AbortSignal.timeout(25000)
      });
      const receipt=await response.json();
      if(!response.ok||receipt.ok!==true||receipt.id!==data.id)throw new Error("Receipt unavailable");
      const completion=document.createElement("main");
      completion.style.cssText="min-height:100vh;display:grid;place-items:center;padding:24px;text-align:center";
      const message=document.createElement("h1");
      message.tabIndex=-1;
      message.style.cssText="margin:0;font-size:clamp(1.25rem,4vw,2rem);line-height:1.5;word-break:keep-all";
      message.textContent="응답이 제출되었습니다. 참여해 주셔서 감사합니다.";
      completion.append(message);
      document.body.replaceChildren(completion);
      window.scrollTo(0,0);
      message.focus();
    } catch {
      $("status").textContent="제출 결과를 확인하지 못했습니다. 다시 제출해 주세요.";
      next.disabled=false;
      previous.disabled=false;
    }
  }
  document.addEventListener("input",e=>{
    const t=e.target;
    const id=t.dataset.entry||t.dataset.countInput||t.dataset.extra||t.dataset.reason;
    if(!id)return;
    if(t.dataset.entry||t.dataset.countInput)answers[id]=t.value;
    if(t.dataset.extra)answers[id+"__other"]=t.value;
    if(t.dataset.reason)answers[id+"__reason"]=t.value;
    const parent=fieldQuestion(id);
    setError(parent?.id||id,"");
  });
  document.addEventListener("change",e=>{
    const t=e.target;
    if(t.dataset.countSelect){
      const id=t.dataset.countSelect;
      const key=groups()[pageIndex]?.key||"";
      if(t.value==="over"){
        countModes[id]="over";
        if(!(Number(answers[id])>10))answers[id]="";
      }else{
        countModes[id]="fixed";
        answers[id]=t.value;
      }
      locatePrevious(key);
      render();
      return;
    }
    if(!t.dataset.choice)return;
    const id=t.dataset.choice;
    const q=QUESTIONS.find(item=>item.id===id);
    if(!q)return;
    const option=q.choices[Number(t.dataset.index)];
    if(isMulti(q)){
      let vals=Array.isArray(answers[id])?answers[id].slice():[];
      if(t.checked){
        if(noneOption(option))vals=[option];
        else vals=vals.filter(v=>!noneOption(v)).concat(option);
      }else vals=vals.filter(v=>v!==option);
      vals=[...new Set(vals)];
      if(vals.length>maxChoices(q)){
        t.checked=false;
        $("status").textContent=`최대 ${maxChoices(q)}개까지 선택할 수 있습니다.`;
        return;
      }
      answers[id]=vals;
    }else answers[id]=option;
    const key=groups()[pageIndex]?.key||"";
    locatePrevious(key);
    render();
  });
  $("previous").addEventListener("click",()=>{
    if(review){review=false;pageIndex=groups().length-1;}
    else if(pageIndex===0)intro=true;
    else pageIndex--;
    render();moveTop();
  });
  $("next").addEventListener("click",()=>{
    if(intro){intro=false;render();moveTop();return;}
    if(review){submitResponse();return;}
    if(!validateCurrent())return;
    if(pageIndex>=groups().length-1)review=true;
    else pageIndex++;
    render();moveTop();
  });
  render();
})();
