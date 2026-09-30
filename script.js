const invitation=document.querySelector('#invitation');
const site=document.querySelector('#site');
const heroVideo=document.querySelector('.hero-video');

if(heroVideo){
  heroVideo.muted=true;
  heroVideo.defaultMuted=true;
  heroVideo.setAttribute('muted','');
  heroVideo.setAttribute('playsinline','');
  heroVideo.setAttribute('webkit-playsinline','');
  heroVideo.src='assets/savethemove-welcome.mp4';
  heroVideo.load();
}

const ensureHeroVideoPlaying=()=>{
  if(!heroVideo)return;
  heroVideo.muted=true;
  const playPromise=heroVideo.play();
  if(playPromise?.catch)playPromise.catch(()=>{});
};

ensureHeroVideoPlaying();

document.addEventListener('visibilitychange',()=>{
  if(!document.hidden)ensureHeroVideoPlaying();
});

let invitationOpened=false;
const openInvitation=()=>{
  if(invitationOpened)return;
  invitationOpened=true;
  ensureHeroVideoPlaying();
  invitation.classList.add('opening');
  setTimeout(()=>{
    invitation.classList.add('hidden');
    site.classList.add('visible');
    site.setAttribute('aria-hidden','false');
    ensureHeroVideoPlaying();
    document.querySelector('#overview-title').focus?.();
  },1880)
};
document.querySelector('#openInvitation').addEventListener('click',openInvitation);
document.querySelector('#openInvitationText').addEventListener('click',openInvitation);

const showPage=id=>{document.querySelectorAll('.page').forEach(p=>p.classList.toggle('active',p.id===id));document.querySelectorAll('.nav-link').forEach(b=>b.classList.toggle('active',b.dataset.page===id));document.querySelector('#mainNav').classList.remove('open');document.querySelector('#menuToggle').setAttribute('aria-expanded','false');window.scrollTo({top:0,behavior:'smooth'})};
document.querySelectorAll('[data-page]').forEach(button=>button.addEventListener('click',()=>showPage(button.dataset.page)));
document.querySelectorAll('[data-go]').forEach(button=>button.addEventListener('click',()=>showPage(button.dataset.go)));
document.querySelector('#menuToggle').addEventListener('click',e=>{const nav=document.querySelector('#mainNav');nav.classList.toggle('open');e.currentTarget.setAttribute('aria-expanded',nav.classList.contains('open'))});

document.querySelectorAll('.day-tab').forEach(tab=>tab.addEventListener('click',()=>{document.querySelectorAll('.day-tab').forEach(t=>t.classList.remove('active'));document.querySelectorAll('.timeline').forEach(t=>t.classList.remove('active'));tab.classList.add('active');document.querySelector(`#${tab.dataset.day}`).classList.add('active')}));

const teams={김하늘:{team:'3조 · 빨간 나침반',place:'1층 다목적홀 A구역',members:'이로운 · 박지민 · 최서준'},이로운:{team:'3조 · 빨간 나침반',place:'1층 다목적홀 A구역',members:'김하늘 · 박지민 · 최서준'},박지민:{team:'7조 · 함께의 파도',place:'2층 워크숍룸 B',members:'한서아 · 정우진 · 윤가람'},최서준:{team:'1조 · 첫 번째 움직임',place:'1층 로비 테이블 1',members:'이서윤 · 송도윤 · 임나래'}};
document.querySelector('#teamSearch').addEventListener('submit',e=>{e.preventDefault();const name=new FormData(e.currentTarget).get('name').trim().replace(/\s/g,'');const result=document.querySelector('#teamResult');const data=teams[name];result.classList.add('show');result.innerHTML=data?`<span>${name} 님의 편성조</span><strong>${data.team}</strong><p>만나는 곳 · ${data.place}<br>함께하는 동료 · ${data.members}</p>`:`<strong>이름을 찾지 못했어요.</strong><p>이름과 띄어쓰기를 확인해 주세요. 계속 조회되지 않으면 수탁사업지원팀에 문의해 주세요.</p>`});
