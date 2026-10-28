/* 2026 SAVE THE MOVE · talk concert pre-questions */
(() => {
  const endpoint = (window.SAVE_THE_MOVE_TALK_ENDPOINT || '').trim();
  const categories = ['전체 토크콘서트','대전서부아동보호전문기관 · 김은지','인천광역시아동보호전문기관 · 박혜원','전북가정위탁지원센터 · 최시원','대구광역시가정위탁지원센터 · 장혜정','울산신나는아동쉼터 · 이선희'];
  const form = document.getElementById('talkQuestionForm');
  if (!form) return;
  const select = document.getElementById('talkCategory');
  const content = document.getElementById('talkQuestion');
  const button = document.getElementById('talkSubmit');
  const feedback = document.getElementById('talkFeedback');
  const list = document.getElementById('talkItems');
  const count = document.getElementById('talkCount');
  const counter = document.getElementById('talkCounter');
  const reload = document.getElementById('talkReload');
  const status = (message, kind='') => {feedback.textContent=message;feedback.dataset.kind=kind;};
  categories.forEach((c,i)=>{const o=document.createElement('option');o.value=c;o.textContent=i===0?'토크콘서트 전체 / 공통 질문':c;select.appendChild(o);});
  const configured = /^https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]+\/exec(?:\?.*)?$/.test(endpoint);
  if(!configured){button.disabled=true;status('사전 질문 접수 시스템 연동 준비 중입니다. 접수가 시작되면 이 화면에서 바로 질문을 남길 수 있습니다.');}
  content.addEventListener('input',()=>counter.textContent=content.value.length+' / 600자');
  let callbackSequence=0;
  const getQuestions=()=>new Promise((resolve,reject)=>{
    if(!configured){reject(Error('연동 전'));return;}
    const callback='saveTheMoveTalkCB'+(++callbackSequence)+'_'+Math.random().toString(36).slice(2);
    const script=document.createElement('script');
    const timer=setTimeout(()=>finish(Error('요청 시간이 초과되었습니다.')),12000);
    const finish=(error,data)=>{clearTimeout(timer);delete window[callback];script.remove();error?reject(error):resolve(data);};
    window[callback]=data=>finish(null,data);
    script.onerror=()=>finish(Error('질문 목록을 불러오지 못했습니다.'));
    script.src=endpoint+(endpoint.includes('?')?'&':'?')+'callback='+encodeURIComponent(callback)+'&t='+Date.now();
    document.head.appendChild(script);
  });
  const formatDate = value => {
    const d=new Date(value); return Number.isNaN(d.valueOf())?'':new Intl.DateTimeFormat('ko-KR',{timeZone:'Asia/Seoul',month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit',hour12:false}).format(d);
  };
  function render(questions){
    list.replaceChildren();
    const rows=(Array.isArray(questions)?questions:[]).slice().sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt));
    count.textContent=rows.length+'개의 질문';
    if(!rows.length){const p=document.createElement('p');p.className='talk-empty';p.textContent='아직 접수된 질문이 없습니다. 첫 번째 질문을 남겨 주세요.';list.appendChild(p);return;}
    rows.forEach((q,i)=>{
      const item=document.createElement('article');item.className='talk-item';
      const avatar=document.createElement('span');avatar.className='talk-avatar';avatar.textContent='Q';
      const main=document.createElement('div');const meta=document.createElement('div');meta.className='talk-item-meta';
      const category=document.createElement('span');category.className='talk-item-category';category.textContent=String(q.category||'공통 질문');
      const date=document.createElement('time');date.textContent=formatDate(q.createdAt);
      const text=document.createElement('p');text.textContent=String(q.question||'');
      meta.append(category,date);main.append(meta,text);item.append(avatar,main);list.appendChild(item);
    });
  }
  let loading=false;
  async function load(showError=false){
    if(loading || !configured)return;
    loading=true;
    try{const response=await getQuestions();if(!response.ok)throw Error(response.error||'목록 오류');render(response.questions);}
    catch(error){if(showError)status('질문 목록을 새로고침하지 못했습니다. 다시 시도해 주세요.','error');if(!list.children.length){const p=document.createElement('p');p.className='talk-empty';p.textContent='현재 질문 목록을 불러올 수 없습니다.';list.appendChild(p);}}
    finally{loading=false;}
  }
  reload.addEventListener('click',()=>load(true));
  async function submit(){
    const category=select.value, question=content.value.trim();
    if(!question || question.length<10){status('질문을 10자 이상 입력해 주세요.','error');content.focus();return;}
    if(question.length>600){status('질문은 600자 이내로 작성해 주세요.','error');return;}
    if(!configured)return;
    const id='STM-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,10);
    button.disabled=true;button.textContent='접수 확인 중…';status('질문을 접수하고 있습니다.');
    try {
      await fetch(endpoint,{method:'POST',mode:'no-cors',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify({id,category,question})});
      let saved=false;
      for(let attempt=0;attempt<5;attempt++){
        await new Promise(r=>setTimeout(r,1100+attempt*500));
        const response=await getQuestions();
        if(response.ok){render(response.questions);if((response.questions||[]).some(q=>q.id===id)){saved=true;break;}}
      }
      if(!saved)throw Error('저장 확인 지연');
      content.value='';counter.textContent='0 / 600자';status('질문이 정상적으로 접수되었습니다.','ok');
    } catch(error){status('접수 여부를 확인하지 못했습니다. 목록을 새로고침해 확인한 뒤, 중복 접수되지 않도록 주의해 주세요.','error');}
    finally{button.disabled=false;button.textContent='질문 접수하기 →';}
  }
  form.addEventListener('submit',e=>{e.preventDefault();submit();});
  load();
  window.setInterval(()=>{if(document.visibilityState==='visible'&&document.getElementById('talk').classList.contains('active'))load();},15000);
})();
