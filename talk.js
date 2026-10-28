/* SAVE THE MOVE — 실천사례 토크콘서트 사전 질문 댓글 */
(() => {
  'use strict';

  const endpoint=(window.SAVE_THE_MOVE_TALK_ENDPOINT||'').trim();
  const configured=/^https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]+\/exec(?:\?.*)?$/.test(endpoint);
  const categories=[
    '전체 토크콘서트',
    '대전서부아동보호전문기관 · 김은지',
    '인천광역시아동보호전문기관 · 박혜원',
    '전북가정위탁지원센터 · 최시원',
    '대구광역시가정위탁지원센터 · 장혜정',
    '울산신나는아동쉼터 · 이선희'
  ];

  const form=document.getElementById('talkQuestionForm');
  if(!form)return;
  const select=document.getElementById('talkCategory');
  const field=document.getElementById('talkQuestion');
  const submitButton=document.getElementById('talkSubmit');
  const feedback=document.getElementById('talkFeedback');
  const list=document.getElementById('talkItems');
  const count=document.getElementById('talkCount');
  const counter=document.getElementById('talkCounter');
  const reload=document.getElementById('talkReload');

  categories.forEach((name,i)=>{
    const option=document.createElement('option');
    option.value=name;
    option.textContent=i===0?'토크콘서트 전체 / 공통 질문':name;
    select.appendChild(option);
  });

  const setStatus=(message,kind='')=>{
    feedback.textContent=message;
    feedback.dataset.kind=kind;
  };
  if(!configured){
    submitButton.disabled=true;
    setStatus('질문 접수 연결 설정을 확인해 주세요.','error');
  }
  field.addEventListener('input',()=>{counter.textContent=field.value.length+' / 600자';});

  let publicQuestions=[];
  const pending=new Map();
  let loaded=false;
  let loading=false;
  let lastAttempt=null;
  let jsonpCounter=0;

  const newNonce=()=>Array.from({length:3},()=>Math.random().toString(36).slice(2,10)).join('-');
  const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
  const safeOrigin=origin=>/^https:\/\/script\.google\.com$/.test(origin)
     || /^https:\/\/(?:[a-z0-9-]+\.)*googleusercontent\.com$/.test(origin);
  const dateLabel=value=>{
    const date=new Date(value);
    return Number.isNaN(date.valueOf())?'':new Intl.DateTimeFormat('ko-KR',{
      timeZone:'Asia/Seoul',year:'numeric',month:'numeric',day:'numeric',
      hour:'2-digit',minute:'2-digit',hour12:false
    }).format(date);
  };

  // Never use HTML insertion for user-authored questions.
  function render(){
    const combined=new Map();
    publicQuestions.forEach(q=>combined.set(String(q.id),q));
    pending.forEach((q,id)=>{if(!combined.has(id))combined.set(id,q);});
    const rows=[...combined.values()].sort((a,b)=>
      (new Date(b.createdAt).getTime()||0)-(new Date(a.createdAt).getTime()||0)
    );
    count.textContent=(loaded?publicQuestions.length+'개의 질문':'목록 연결 확인 중')+
      (pending.size?' · 저장 확인 중 '+pending.size+'건':'');
    list.replaceChildren();

    if(!rows.length){
      const blank=document.createElement('p');
      blank.className='talk-empty';
      blank.textContent=loaded
        ?'아직 접수된 질문이 없습니다. 첫 번째 질문을 남겨 주세요.'
        :'기존 질문 목록을 불러오지 못했습니다. 아래 새로고침 버튼으로 다시 시도해 주세요.';
      list.appendChild(blank);
      return;
    }
    rows.forEach(q=>{
      const item=document.createElement('article');
      item.className='talk-item';
      const avatar=document.createElement('span');
      avatar.className='talk-avatar';
      avatar.textContent='Q';
      const main=document.createElement('div');
      const meta=document.createElement('div');
      meta.className='talk-item-meta';
      const category=document.createElement('span');
      category.className='talk-item-category';
      category.textContent=String(q.category||'전체 토크콘서트');
      const date=document.createElement('time');
      date.textContent=dateLabel(q.createdAt);
      meta.append(category,date);
      if(q.localState){
        const state=document.createElement('span');
        state.className='talk-item-state '+(q.localState==='saving'?'is-saving':'is-unconfirmed');
        state.textContent=q.localState==='saving'?'저장 중':'저장 확인 필요';
        meta.appendChild(state);
      }
      const text=document.createElement('p');
      text.textContent=String(q.question||'');
      main.append(meta,text);
      item.append(avatar,main);
      list.appendChild(item);
    });
  }

  // Main transport: an HTML form POST to Apps Script, with an HTML Service
  // reply delivered to this page through a nonce-bound window.postMessage.
  // It avoids cross-origin fetch and ContentService GET redirects entirely.
  function requestByForm(action,values={}){
    return new Promise((resolve,reject)=>{
      if(!configured){reject(new Error('연동 URL 미설정'));return;}
      const nonce=newNonce();
      const frame=document.createElement('iframe');
      const target='stm_talk_'+nonce.replace(/-/g,'');
      frame.name=target;
      frame.title='SAVE THE MOVE 질문 서버 통신';
      frame.tabIndex=-1;
      frame.setAttribute('aria-hidden','true');
      frame.style.cssText='position:absolute;left:-10000px;top:0;width:1px;height:1px;opacity:0;border:0;pointer-events:none';
      const post=document.createElement('form');
      post.method='POST';
      post.action=endpoint;
      post.target=target;
      post.acceptCharset='UTF-8';
      post.style.display='none';
      const inputs={action,nonce,...values};
      Object.keys(inputs).forEach(key=>{
        const input=document.createElement('input');
        input.type='hidden';
        input.name=key;
        input.value=String(inputs[key]);
        post.appendChild(input);
      });
      let finished=false;
      let timer;
      function end(error,result){
        if(finished)return;
        finished=true;
        clearTimeout(timer);
        window.removeEventListener('message',receive);
        post.remove();
        frame.remove();
        error?reject(error):resolve(result);
      }
      function receive(event){
        const message=event.data;
        if(!safeOrigin(event.origin))return;
        if(!message || message.source!=='savethemove-talk-post'||message.nonce!==nonce)return;
        const answer=message.payload;
        if(!answer || !answer.ok){
          end(new Error(answer && answer.error || '시트 응답 오류'));
          return;
        }
        end(null,answer);
      }
      window.addEventListener('message',receive);
      document.body.appendChild(frame);
      document.body.appendChild(post);
      timer=setTimeout(()=>end(new Error('서버의 응답을 확인하지 못했습니다.')),15000);
      try{post.submit();}catch(error){end(error);}
    });
  }

  // Fallback for installations still serving the earlier JSONP endpoint.
  function requestJsonp(){
    return new Promise((resolve,reject)=>{
      const callback='stmTalkCB'+(++jsonpCounter)+'_'+Math.random().toString(36).slice(2);
      const script=document.createElement('script');
      let finished=false;
      let timer;
      function end(error,value){
        if(finished)return;
        finished=true;
        clearTimeout(timer);
        delete window[callback];
        script.remove();
        error?reject(error):resolve(value);
      }
      window[callback]=data=>end(null,data);
      script.onerror=()=>end(new Error('질문 조회 연결 실패'));
      script.onload=()=>{if(!finished)end(new Error('응답 형식이 올바르지 않습니다'));};
      timer=setTimeout(()=>end(new Error('조회 시간이 초과되었습니다')),9000);
      script.src=endpoint+(endpoint.includes('?')?'&':'?')+
        'callback='+encodeURIComponent(callback)+'&t='+Date.now();
      document.head.appendChild(script);
    });
  }

  async function fetchPublicQuestions(){
    let firstError;
    try{return await requestByForm('list');}
    catch(error){firstError=error;}
    try{return await requestJsonp();}
    catch(error){throw new Error('질문 목록 조회 실패: '+firstError.message);}
  }

  function acceptServerQuestions(answer){
    if(!answer || !answer.ok || !Array.isArray(answer.questions))
      throw new Error('질문 목록 응답 형식 오류');
    publicQuestions=answer.questions;
    loaded=true;
    const savedIDs=new Set(publicQuestions.map(q=>String(q.id)));
    for(const [id] of pending){if(savedIDs.has(id))pending.delete(id);}
    render();
  }

  async function refresh(manual=false){
    if(!configured||loading)return;
    loading=true;
    try{
      const answer=await fetchPublicQuestions();
      acceptServerQuestions(answer);
      if(manual)setStatus('질문 목록을 새로고침했습니다.','ok');
    }catch(error){
      if(manual || !loaded)setStatus(
        '기존 질문 목록 연결이 불안정합니다. 저장된 질문은 시트에 유지됩니다. ('+
        error.message+')','error'
      );
      render();
    }finally{loading=false;}
  }

  reload.addEventListener('click',()=>refresh(true));

  async function submit(){
    if(submitButton.disabled)return;
    const category=select.value;
    const question=field.value.trim();
    if(question.length<10){setStatus('질문을 10자 이상 입력해 주세요.','error');field.focus();return;}
    if(question.length>600){setStatus('질문은 600자 이하로 입력해 주세요.','error');return;}

    const signature=category+'\n'+question;
    const id=lastAttempt&&lastAttempt.signature===signature
      ?lastAttempt.id
      :'STM-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,10);
    lastAttempt={signature,id};
    pending.set(id,{
      id,category,question,
      createdAt:new Date().toISOString(),localState:'saving'
    });
    render(); // Show the submitted comment immediately, before the sheet reply.
    submitButton.disabled=true;
    submitButton.textContent='저장 중…';
    setStatus('댓글에 먼저 표시했습니다. 구글시트 저장을 확인하고 있습니다.');
    try{
      let answer;
      try{
        answer=await requestByForm('submit',{id,category,question});
        if(!answer.receipt || answer.receipt.id!==id)
          throw new Error('저장 확인 값이 일치하지 않습니다.');
        acceptServerQuestions(answer);
      }catch(postError){
        // Older deployments may have completed their POST but not replied.
        // Never submit the same POST again automatically.
        const latest=await fetchPublicQuestions();
        acceptServerQuestions(latest);
        if(!publicQuestions.some(q=>String(q.id)===id))throw postError;
      }
      lastAttempt=null;
      pending.delete(id);
      field.value='';
      counter.textContent='0 / 600자';
      render();
      setStatus('질문이 구글시트에 정상 접수되었으며 댓글 목록에도 반영되었습니다.','ok');
    }catch(error){
      const item=pending.get(id);
      if(item)item.localState='unconfirmed';
      render();
      setStatus(
        '댓글에는 임시 표시했지만 시트 저장을 확인하지 못했습니다. 같은 질문을 반복 접수하지 말고 잠시 후 목록을 새로고침해 주세요. ('+
        error.message+')','error'
      );
    }finally{
      submitButton.disabled=false;
      submitButton.textContent='질문 접수하기 →';
    }
  }

  form.addEventListener('submit',event=>{event.preventDefault();submit();});
  render();
  refresh();
  window.setInterval(()=>{
    const tab=document.getElementById('talk');
    if(document.visibilityState==='visible'&&tab&&tab.classList.contains('active'))
      refresh();
  },20000);
})();