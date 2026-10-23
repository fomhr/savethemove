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


// Group information is sourced from the confirmed 2026 SAVE THE MOVE participant sheet.
// The public site intentionally includes only name, institution and area — never IDs or travel data.
const teamRoster = (window.SAVE_THE_MOVE_ROSTER || []).map((entry) => ({
  group: Number(entry[0]),
  order: Number(entry[1]),
  name: String(entry[2]),
  area: String(entry[3]),
  facility: String(entry[4])
}));
const areaOrder = ['아보전', '가정위탁', '쉼터', '부문'];
const areaLabels = {
  '아보전': '아동보호전문기관',
  '가정위탁': '가정위탁지원센터',
  '쉼터': '학대피해아동쉼터',
  '부문': '부문원'
};
const groupCode = (group) => ({1:'A', 2:'B', 3:'C', 4:'D'})[Number(group)] || String(group);
const groupName = (group) => groupCode(group) + '조';
const normalizePersonName = (value) => String(value || '').normalize('NFKC').replace(/\s+/g, '').toLocaleLowerCase('ko');
const createTeamElement = (tag, className, content) => {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (content !== undefined) element.textContent = String(content);
  return element;
};
const teamModeButtons = [...document.querySelectorAll('[data-team-mode]')];
const teamGroupButtons = [...document.querySelectorAll('[data-group]')];
const teamSearchPane = document.querySelector('#teamSearchPane');
const teamBrowsePane = document.querySelector('#teamBrowsePane');
const teamResult = document.querySelector('#teamResult');
const teamDirectory = document.querySelector('#teamDirectory');
let selectedTeam = 1;

const showTeamMode = (mode) => {
  if (!teamSearchPane || !teamBrowsePane) return;
  teamSearchPane.hidden = mode !== 'search';
  teamBrowsePane.hidden = mode !== 'browse';
  teamModeButtons.forEach(button => {
    const active = button.dataset.teamMode === mode;
    button.classList.toggle('is-current', active);
    button.setAttribute('aria-pressed', String(active));
  });
};

const renderTeamDirectory = (group) => {
  if (!teamDirectory) return;
  selectedTeam = group;
  teamGroupButtons.forEach(button => {
    const active = Number(button.dataset.group) === group;
    button.classList.toggle('is-selected', active);
    button.setAttribute('aria-pressed', String(active));
  });
  const allInGroup = teamRoster.filter(person => person.group === group)
    .sort((a,b) => a.order - b.order);
  teamDirectory.replaceChildren();

  const masthead = createTeamElement('div', 'team-roster-masthead');
  const mastheadNumber = createTeamElement('span', 'team-roster-masthead-number', groupCode(group));
  mastheadNumber.setAttribute('aria-hidden', 'true');
  const mastheadText = createTeamElement('div', 'team-roster-masthead-text');
  const eyebrow = createTeamElement('p', 'team-subheading', 'TEAM ' + groupCode(group));
  const title = createTeamElement('h3', '', groupName(group) + ' 전체 명단');
  title.id = 'selectedTeamTitle';
  const subtitle = createTeamElement('p', '', '총 ' + allInGroup.length + '명 · 분야별로 함께하는 동료를 확인하세요.');
  mastheadText.append(eyebrow, title, subtitle);
  masthead.append(mastheadNumber, mastheadText);
  teamDirectory.append(masthead);

  const overview = createTeamElement('div','team-area-summary');
  areaOrder.forEach(area => {
    const count = allInGroup.filter(person => person.area === area).length;
    const item = createTeamElement('div','team-area-stat');
    item.append(createTeamElement('span','team-area-stat-label',areaLabels[area]),
                createTeamElement('strong','team-area-stat-count',count+'명'));
    overview.append(item);
  });
  teamDirectory.append(overview);

  for (const area of areaOrder) {
    const people = allInGroup.filter(person => person.area === area);
    if (!people.length) continue;
    const zone = createTeamElement('section','team-roster-zone');
    const zoneHead = createTeamElement('div','team-roster-zone-head');
    const name = createTeamElement('h4','',areaLabels[area]);
    const count = createTeamElement('span','',people.length + '명');
    zoneHead.append(name,count);
    zone.append(zoneHead);
    const list = createTeamElement('div','team-member-grid');
    people.forEach(person => {
      const item = createTeamElement('div','team-member-card');
      const number = createTeamElement('span','team-member-seq',String(person.order).padStart(2,'0'));
      const info = createTeamElement('div','team-member-info');
      info.append(createTeamElement('strong','',person.name),
                  createTeamElement('small','',person.facility));
      item.append(number,info);
      list.append(item);
    });
    zone.append(list);
    teamDirectory.append(zone);
  }
  const notice = document.querySelector('#teamRosterAnnouncement');
  if(notice)notice.textContent=groupName(group)+' 총 '+allInGroup.length+'명 명단을 표시했습니다.';
};

const browseTeam = (group) => {
  showTeamMode('browse');
  renderTeamDirectory(group);
  const heading = document.querySelector('#selectedTeamTitle');
  if (heading) {
    heading.tabIndex = -1;
    heading.focus({preventScroll:true});
  }
};

const renderNameSearch = (rawName) => {
  if(!teamResult)return;
  teamResult.replaceChildren();
  teamResult.classList.add('show');
  teamResult.append(createTeamElement('p','team-result-eyebrow','SEARCH RESULT'));
  const query=normalizePersonName(rawName);
  if (!query) {
    teamResult.append(createTeamElement('strong','team-result-placeholder','이름을 입력해 주세요.'));
    return;
  }
  let hits=teamRoster.filter(person=>normalizePersonName(person.name)===query);
  let partial=false;
  if(!hits.length && query.length>=2){
    hits=teamRoster.filter(person=>normalizePersonName(person.name).includes(query));
    partial=true;
  }
  if(!hits.length){
    teamResult.append(createTeamElement('strong','team-result-placeholder','일치하는 이름이 없습니다.'));
    teamResult.append(createTeamElement('p','team-result-note','이름을 다시 확인하거나, 조별 전체 명단에서 찾아보세요.'));
    const browse = createTeamElement('button','team-inline-browse','조별 전체 명단 보기 →');
    browse.type='button';
    browse.addEventListener('click',()=>browseTeam(1));
    teamResult.append(browse);
    return;
  }
  const visibleHits=hits.slice(0,12);
  const resultHeading=createTeamElement('strong','team-result-heading',partial ? '이름에 "'+rawName.trim()+'"이 포함된 '+hits.length+'명' : rawName.trim()+' 님의 검색 결과');
  teamResult.append(resultHeading);
  if (hits.length>1)teamResult.append(createTeamElement('p','team-result-note','동명이인 또는 유사한 이름이 있을 수 있습니다. 소속기관을 함께 확인해 주세요.'));
  const hitList=createTeamElement('div','team-search-hits');
  visibleHits.forEach(person=>{
    const item=createTeamElement('article','team-search-hit');
    const hitInfo=createTeamElement('div','team-search-hit-info');
    hitInfo.append(createTeamElement('span','team-search-hit-group',groupName(person.group)),
                   createTeamElement('strong','',person.name),
                   createTeamElement('p','',person.facility+' · '+(areaLabels[person.area]||person.area)));
    const browse = createTeamElement('button','team-inline-browse','이 조 전체보기 →');
    browse.type='button';
    browse.setAttribute('aria-label',person.name+' 님의 '+groupName(person.group)+' 전체 명단 보기');
    browse.addEventListener('click',()=>browseTeam(person.group));
    item.append(hitInfo,browse);
    hitList.append(item);
  });
  teamResult.append(hitList);
  if(hits.length>visibleHits.length)teamResult.append(createTeamElement('p','team-result-note','최대 12명까지만 표시합니다. 정확한 이름으로 검색해 주세요.'));
};

const teamSearchForm = document.querySelector('#teamSearch');
if (teamSearchForm) teamSearchForm.addEventListener('submit',event=>{
  event.preventDefault();
  const name=String(new FormData(teamSearchForm).get('name')||'').trim();
  renderNameSearch(name);
});
teamModeButtons.forEach(button=>button.addEventListener('click',()=>showTeamMode(button.dataset.teamMode)));
teamGroupButtons.forEach(button=>button.addEventListener('click',()=>renderTeamDirectory(Number(button.dataset.group))));
const browseAllButton=document.querySelector('#browseFromSearch');
if (browseAllButton) browseAllButton.addEventListener('click',()=>browseTeam(1));
const teamTotal=document.querySelector('#teamTotalCount');
if(teamTotal)teamTotal.textContent=String(teamRoster.length);
const browseTotal=document.querySelector('#browseAllCount');
if(browseTotal)browseTotal.textContent='총 '+teamRoster.length+'명';
document.querySelectorAll('[data-count-group]').forEach(node=>{
  const group=Number(node.dataset.countGroup);
  node.textContent=teamRoster.filter(person=>person.group===group).length+'명';
});
renderTeamDirectory(1);
