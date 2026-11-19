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
  const isLong=q=>/서술|장문/.test(q.type);
  const maxChoices=q=>Number((q.type.match(/최대\s*(\d+)/)||[])[1]||999);
  const noneOption=s=>["없음","경험 없음","참여한 적 없음","별도 운영 없음","어려움 없음"].includes(s);
  const hasOther=q=>(q.choices||[]).includes("기타");
  const selectedOther=q=>isMulti(q)?(Array.isArray(answers[q.id])&&answers[q.id].includes("기타")):answers[q.id]==="기타";
  function eligible(q){
    if(role!=="상담원")return true;
    const c=q.condition||"";
    const familyEdu=Array.isArray(answers.C03)&&answers.C03.some(x=>/^202[3-6]년$/.test(x));
    const familyApplied=Number(answers.C06)>0;
    const gasApplied=Number(answers.C27)>0;
    const internal=Array.isArray(answers.C25)&&answers.C25.some(x=>!noneOption(x));
    if(c.includes("법인 교육 참여")&&!familyEdu)return false;
    if(c.includes("적용 가정 1 이상")&&!familyApplied)return false;
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
  function questionHtml(q){
    const multi=isMulti(q),num=isNumeric(q),long=isLong(q),opts=q.choices||[];
    const val=answers[q.id],selection=Array.isArray(val)?val:val==null?[]:[val];
    const note=multi?` <span class="multi-note">(${maxChoices(q)===999?"복수선택":"복수선택 · 최대 "+maxChoices(q)+"개"})</span>`:"";
    let html=`<section class="question" id="question-${esc(q.id)}"><h3 class="question-title"><span class="qnum">${questionNo(q)}.</span>${esc(q.question)}${note}</h3>`;
    if(num){
      const unit=/가정/.test(q.question)?"가정":/사례/.test(q.question)?"사례":/건/.test(q.question)?"건":"회";
      const textVal=String(val??"");
      const manual=countModes[q.id]==="over"||(/^\d+$/.test(textVal)&&Number(textVal)>10);
      const selected=manual?"over":textVal;
      const options=[["","선택해 주세요"],["0","없음"],...Array.from({length:10},(_,i)=>[String(i+1),String(i+1)+unit]),["over","10"+unit+" 초과(직접 입력)"]];
      html+=`<select class="textinput count-select" data-count-select="${esc(q.id)}" aria-label="${esc(q.question)}">${options.map(([value,label])=>`<option value="${esc(value)}" ${selected===value?"selected":""}>${esc(label)}</option>`).join("")}</select>`;
      if(manual)html+=`<div class="count-manual"><input class="textinput" type="number" min="11" step="1" inputmode="numeric" data-count-input="${esc(q.id)}" value="${esc(Number(textVal)>10?textVal:"")}" placeholder="11 이상 직접 입력" aria-label="${esc(q.question)} 10 초과 입력"></div>`;
    }
    else if(long||opts.length===0)html+=`<textarea class="textinput" rows="4" data-entry="${esc(q.id)}" placeholder="구체적으로 작성해 주세요" aria-label="${esc(q.question)}">${esc(val??"")}</textarea>`;
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
      html+=`<div class="followup"><label for="other-${esc(q.id)}">기타 내용을 작성해 주세요.</label><textarea id="other-${esc(q.id)}" class="textinput" rows="2" data-extra="${esc(q.id)}" placeholder="구체적인 내용을 입력해 주세요">${esc(answers[q.id+"__other"]??"")}</textarea></div>`;
    }
    if(multi&&q.reason){
      html+=`<div class="followup"><label for="reason-${esc(q.id)}">선택한 항목의 구체적인 사유를 작성해 주세요.</label><textarea id="reason-${esc(q.id)}" class="textinput" rows="3" data-reason="${esc(q.id)}" placeholder="선택한 이유나 관련 경험을 구체적으로 입력해 주세요">${esc(answers[q.id+"__reason"]??"")}</textarea></div>`;
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
    if(isNumeric(q)){
      if(a==null||String(a).trim()==="")return "필수 응답입니다. 해당 실적이 없으면 0을 입력해 주세요.";
      if(!/^\d+$/.test(String(a))||!Number.isSafeInteger(Number(a)))return "0 이상의 정수를 입력해 주세요.";
      if(countModes[q.id]==="over"&&Number(a)<=10)return "10을 초과하는 횟수·건수를 입력해 주세요.";
    }else if(isMulti(q)){
      if(!Array.isArray(a)||a.length===0)return "필수 응답입니다. 항목을 선택해 주세요.";
      if(a.length>maxChoices(q))return "최대 "+maxChoices(q)+"개까지 선택할 수 있습니다.";
    }else if(isLong(q)||!(q.choices||[]).length){
      if(!String(a??"").trim())return "필수 응답입니다. 내용을 입력해 주세요.";
    }else if(!String(a??"").trim())return "필수 응답입니다. 항목을 선택해 주세요.";
    if(hasOther(q)&&selectedOther(q)&&!String(answers[q.id+"__other"]??"").trim())return "기타 내용을 입력해 주세요.";
    if(isMulti(q)&&q.reason&&!String(answers[q.id+"__reason"]??"").trim())return "선택한 사유를 입력해 주세요.";
    if(q.id==="C07"&&Number(a)>Number(answers.C06))return "2회 이상 적용 가정 수는 전체 적용 가정 수를 초과할 수 없습니다.";
    if(q.id==="C31"&&Number(a)>Number(answers.C27))return "평가 완료 사례 수는 전체 적용 사례 수를 초과할 수 없습니다.";
    if(q.id==="C30"&&["C28","C29","C30"].every(id=>/^\d+$/.test(String(answers[id]??"")))&&Number(answers.C29)+Number(answers.C30)!==Number(answers.C28))return "심층사업 실행 건수와 일반 사례관리 실행 건수의 합계가 전체 실행 건수와 일치해야 합니다.";
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
      <div class="note">2023~2026년 활용 경험을 기준으로 응답해 주세요. 적용 경험이 없는 경우 해당 실적에서 ‘없음’을 선택하면 관련 문항이 자동으로 제외됩니다.</div>
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
      let value=answerLabel(q);
      if(hasOther(q)&&selectedOther(q))value+="\n기타: "+(answers[q.id+"__other"]||"");
      if(isMulti(q)&&q.reason)value+="\n선택 사유: "+(answers[q.id+"__reason"]||"");
      out+=`<div class="summary-row"><div class="summary-title">${questionNo(q)}. ${esc(q.question)}</div><div class="summary-answer">${esc(value)}</div></div>`;
    });
    out+="</div>";
    $("content").innerHTML=out;
    $("previous").disabled=false;
    $("next").textContent="응답 파일 저장";
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
  function exportData(){
    const missing=visible().filter(q=>check(q));
    if(missing.length){
      review=false;
      const i=groups().findIndex(g=>g.questions.some(q=>q.id===missing[0].id));
      pageIndex=Math.max(0,i);
      render();
      validateCurrent();
      return;
    }
    const data={schema:"FAMILY_GAS_2026_v3",role,exportedAt:new Date().toISOString(),source:"응답 파일(서버 미연동)",answers:{}};
    for(const q of visible()){
      data.answers[q.id]=answers[q.id];
      if(hasOther(q)&&selectedOther(q))data.answers[q.id+"__other"]=answers[q.id+"__other"];
      if(isMulti(q)&&q.reason)data.answers[q.id+"__reason"]=answers[q.id+"__reason"];
    }
    const blob=new Blob([JSON.stringify(data,null,2)],{type:"application/json"});
    const url=URL.createObjectURL(blob);
    const link=document.createElement("a");
    link.href=url;
    link.download=`2026_가족팀회의_GAS_${role}_응답.json`;
    document.body.appendChild(link);link.click();link.remove();
    setTimeout(()=>URL.revokeObjectURL(url),1000);
    $("status").textContent="응답 파일을 저장했습니다. 서버에는 전송되지 않았습니다.";
  }
  document.addEventListener("input",e=>{
    const t=e.target;
    const id=t.dataset.entry||t.dataset.countInput||t.dataset.extra||t.dataset.reason;
    if(!id)return;
    if(t.dataset.entry||t.dataset.countInput)answers[id]=t.value;
    if(t.dataset.extra)answers[id+"__other"]=t.value;
    if(t.dataset.reason)answers[id+"__reason"]=t.value;
    setError(id,"");
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
    if(review){exportData();return;}
    if(!validateCurrent())return;
    if(pageIndex>=groups().length-1)review=true;
    else pageIndex++;
    render();moveTop();
  });
  render();
})();
