/* Shared workspace shell. Domain actions remain in the existing modules. */
const TEAM_WORKSPACE_SECTIONS=[['board','Przegląd'],['ideas','Pomysły'],['members','Członkowie'],['meetings','Spotkania'],['votes','Głosowania'],['register','Rejestr']];
const teamWorkspaceViewState=new Map();
let teamWorkspaceSearchResults=[];
let activeTeamWorkspaceContext='';
function activateTeamWorkspaceContext(id){
 const key=String(id);if(activeTeamWorkspaceContext===key)return;
 if(activeTeamWorkspaceContext)workspaceState(activeTeamWorkspaceContext).meetings={...teamMeetingsView};
 Object.assign(teamMeetingsView,workspaceState(key).meetings||{status:'',query:'',day:'',offset:0});
 activeTeamWorkspaceContext=key;
}
function workspaceState(id){if(!teamWorkspaceViewState.has(String(id)))teamWorkspaceViewState.set(String(id),{memberQuery:'',logQuery:'',ideasView:'grid',logType:'all'});return teamWorkspaceViewState.get(String(id));}
function workspaceTeam(){return projectTeams.find(team=>String(team.id)===String(teamProfileTabTeamId));}
function teamWorkspaceSwitcher(team){const own=projectTeams.filter(t=>teamAcceptedMembers(t).includes(MY_NAME));return `<details class="team-workspace-switcher"><summary aria-label="Zmień przestrzeń: ${escAttr(team.name)}" title="${escAttr(team.name)}"><span class="team-workspace-avatar">${teamBoardAvatar(team)}</span><span aria-hidden="true">⌄</span></summary><div class="team-workspace-switcher-menu"><small>Twoje zespoły</small>${own.map(t=>`<a href="${teamHash(t.id)}" ${String(t.id)===String(team.id)?'aria-current="page"':''}><span class="team-workspace-avatar">${teamBoardAvatar(t)}</span><b>${escHtml(t.name||'Nowy zespół')}</b>${String(t.id)===String(team.id)?'<i>✓</i>':''}</a>`).join('')||'<p>Nie należysz jeszcze do żadnego zespołu.</p>'}<hr><a href="#discover">← Wróć do CollaboHub</a><a href="#teams">Wszystkie zespoły</a></div></details>`;}
function renderTeamWorkspaceTopbar(team){
 const nav=document.querySelector('nav.global-nav');if(!nav)return;let bar=document.getElementById('team-workspace-chrome');if(!bar){bar=document.createElement('div');bar.id='team-workspace-chrome';nav.insertBefore(bar,nav.querySelector('.account-wrap'));}
 const accent=teamWorkspaceAppearance(team).accent;if(accent)bar.style.setProperty('--team-workspace-accent',accent);else bar.style.removeProperty('--team-workspace-accent');
 const section=TEAM_WORKSPACE_SECTIONS.some(([key])=>key===teamProfileTab)?teamProfileTab:'board';
 bar.innerHTML=`${teamWorkspaceSwitcher(team)}<div class="team-workspace-search"><form role="search" onsubmit="event.preventDefault();searchTeamWorkspace(this.querySelector('input').value)"><label>${catalogResourceIcon('search')}<input type="search" autocomplete="off" aria-label="Szukaj w zespole" placeholder="Szukaj w zespole…" oninput="searchTeamWorkspace(this.value)" onkeydown="if(event.key==='Escape')closeTeamWorkspaceSearch()"></label></form><div id="team-workspace-search-results" hidden></div></div><nav class="team-workspace-navigation" aria-label="Nawigacja zespołu">${TEAM_WORKSPACE_SECTIONS.map(([key,label])=>`<a href="${teamHash(team.id,key)}" ${key===section?'aria-current="page"':''}>${label}</a>`).join('')}</nav>`;
}
function teamWorkspaceSearchRows(team,query){const q=String(query||'').trim().toLocaleLowerCase('pl');if(!q)return [];const rows=[];const add=(kind,title,subtitle,open)=>{if([title,subtitle].join(' ').toLocaleLowerCase('pl').includes(q))rows.push({kind,title,subtitle,open});};
 teamProjects(team).forEach(idea=>add('Pomysł',idea.title,idea.desc,()=>openTeamWorkspaceIdea(team.id,idea.id)));
 teamAcceptedMembers(team).forEach(name=>{const person=members.find(m=>m.name===name);add('Członek',name,(person?.skills||[]).join(' · '),()=>{setTeamProfileTab(team.id,'members');filterTeamWorkspaceMembers(name);});});
 (team.meetings||[]).forEach(m=>add('Spotkanie',m.title,m.description,()=>{setTeamProfileTab(team.id,'meetings');openMeetingSummary('team',team.id,m.id);}));
 (team.decisions||[]).forEach(v=>add('Głosowanie',v.prop,v.description,()=>openTeamRailVote(team.id,v.id)));
 (team.boardPosts||[]).filter(p=>p.status!=='draft'||p.by===MY_NAME).forEach(p=>add('Wpis',p.title||p.text,p.text,()=>{setTeamProfileTab(team.id,'board');openTeamBoardPostDiscussion(team.id,p.id);}));return rows.slice(0,12);
}
function searchTeamWorkspace(query){const team=workspaceTeam(),box=document.getElementById('team-workspace-search-results');if(!team||!box)return;teamWorkspaceSearchResults=teamWorkspaceSearchRows(team,query);box.hidden=!String(query).trim();box.innerHTML=teamWorkspaceSearchResults.map((row,index)=>`<button type="button" onclick="openTeamWorkspaceSearchResult(${index})"><small>${escHtml(row.kind)}</small><b>${escHtml(row.title||'Bez tytułu')}</b><span>${escHtml(String(row.subtitle||'').slice(0,90))}</span></button>`).join('')||'<p>Brak wyników w tym zespole.</p>';}
function closeTeamWorkspaceSearch(){const box=document.getElementById('team-workspace-search-results');if(box)box.hidden=true;}
function openTeamWorkspaceSearchResult(index){const item=teamWorkspaceSearchResults[index];closeTeamWorkspaceSearch();item?.open();}
function teamWorkspaceMemberRows(team,query){const q=String(query).toLocaleLowerCase('pl');return teamAcceptedMembers(team).map(name=>({name,person:members.find(m=>m.name===name),role:team.memberRoles?.[name]||'Członek zespołu'})).filter(row=>!q||[row.name,row.role,...(row.person?.skills||[])].join(' ').toLocaleLowerCase('pl').includes(q));}
function workspaceInvitationHistory(team){return (team.invitationHistory||[]).length?`<details class="team-ws-invitation-history"><summary>Zakończone zaproszenia i zgłoszenia (${team.invitationHistory.length})</summary>${[...team.invitationHistory].reverse().map(row=>`<article><b>${escHtml(row.name||row.person||'')}</b><span>${escHtml({accepted:'Dołączono',declined:'Odrzucono',withdrawn:'Wycofano',expired:'Wygasło'}[row.status]||'Zakończono')}</span><time>${escHtml(createdLabel(row.statusChangedAt||row.date))}</time></article>`).join('')}</details>`:'';}
function renderWorkspaceMembers(team){return renderTeamMemberCatalog(team);}

function openWorkspaceTeamInvite(){
 const team=workspaceTeam();if(!team||!teamAcceptedMembers(team).includes(MY_NAME))return;
 const available=members.filter(person=>!teamAcceptedMembers(team).includes(person.name)&&!(team.pendingMembers||[]).includes(person.name));
 appModal(`<h3>Zaproś do zespołu</h3><div class="ch-team-invite-list">${available.map(person=>`<button type="button" class="vbtn" onclick="inviteWorkspaceTeamMember(${Number(person.id)})">${escHtml(person.name)}</button>`).join('')||'<p>Wszystkie dostępne osoby należą już do zespołu lub mają oczekujące zaproszenie.</p>'}</div>`);
}
function inviteWorkspaceTeamMember(memberId){const team=workspaceTeam();if(!team)return;prepareMemberTeamInvite(team.id,memberId);openTeam(team.id,{preserveVoteScroll:true});}
function workspaceMemberCards(team,query){return teamWorkspaceMemberRows(team,query).map(({name,person,role})=>`<article class="team-ws-member"><span class="team-ws-member-avatar">${memberAvatarContent(name,person?.ini||memberInitials(name))}</span><div><b>${escHtml(name)}</b><small>${escHtml(role)}</small><div class="team-ws-member-skills">${(person?.skills||[]).map(skill=>`<span>${escHtml(skill)}</span>`).join('')}</div><small>Aktywność: ${escHtml(person?.lastActive||person?.activity||'—')}</small></div>${person?`<button type="button" onclick="openMember(${Number(person.id)})">Profil ›</button>`:''}</article>`).join('')||'<p class="team-ws-empty">Brak pasujących członków.</p>';}
function filterTeamWorkspaceMembers(query){setTeamCatalogValue('members','query',query,'team-catalog-member-search');}

function workspaceLogRows(team){const rows=[{label:'Utworzono zespół',date:team.date,type:'team'},...(team.publishedDate?[{label:'Opublikowano zespół',date:team.publishedDate,type:'team'}]:[]),...(team.discussion||[]).map(row=>({label:row.text||'Aktualizacja',date:row.createdAt||row.date,by:row.by,type:'activity'})),...(team.decisions||[]).map(row=>({label:(row.open?'Rozpoczęto głosowanie: ':'Zakończono głosowanie: ')+(row.prop||'Decyzja'),date:row.closedAt||row.closedDate||row.createdAt||row.date,by:row.proposedBy,type:'vote'})),...(team.meetings||[]).map(row=>({label:(row.createdAt?'Utworzono spotkanie: ':'Spotkanie: ')+row.title,date:row.createdAt||row.date,by:row.by,type:'meeting'})),...(team.boardPosts||[]).filter(row=>row.status!=='draft').map(row=>({label:'Opublikowano wpis: '+(row.title||String(row.text||'').slice(0,80)),date:row.createdAt||row.date,by:row.by,type:'activity'})),...(team.invitationHistory||[]).map(row=>({label:({accepted:'Dołączono do zespołu: ',declined:'Odrzucono zgłoszenie: ',withdrawn:'Wycofano zgłoszenie: '}[row.status]||'Zakończono zaproszenie: ')+(row.name||row.person||''),date:row.statusChangedAt||row.date,by:row.by,type:'team'})),...teamProjects(team).map(row=>({label:'Pomysł zespołu: '+row.title,date:row.createdAt||row.date,by:authorOf(row).name,type:'idea'}))];return rows.map((row,index)=>({...row,index,stamp:boardDateFromValue(row.date)?.getTime()||0})).sort((a,b)=>b.stamp-a.stamp||b.index-a.index);}
function renderWorkspaceLog(team){const state=workspaceState(team.id);return `<section class="team-workspace-log"><header><h1>Rejestr</h1><input type="search" aria-label="Szukaj w rejestrze" placeholder="Szukaj zdarzenia…" value="${escAttr(state.logQuery)}" oninput="filterTeamWorkspaceLog(this.value)"><select aria-label="Typ zdarzenia" onchange="workspaceState('${escAttr(team.id)}').logType=this.value;filterTeamWorkspaceLog(workspaceState('${escAttr(team.id)}').logQuery)">${[['all','Wszystkie zdarzenia'],['team','Zespół'],['vote','Głosowania'],['meeting','Spotkania'],['idea','Pomysły'],['activity','Aktywność']].map(([key,label])=>`<option value="${key}" ${state.logType===key?'selected':''}>${label}</option>`).join('')}</select></header><div id="team-workspace-log-list">${workspaceLogMarkup(team)}</div></section>`;}
function workspaceLogMarkup(team){const state=workspaceState(team.id),q=state.logQuery.toLocaleLowerCase('pl');return workspaceLogRows(team).filter(row=>(state.logType==='all'||row.type===state.logType)&&(!q||[row.label,row.by].join(' ').toLocaleLowerCase('pl').includes(q))).map(row=>`<article><span class="team-ws-log-dot"></span><div><b>${escHtml(row.label)}</b>${row.by?`<small>${escHtml(row.by)}</small>`:''}</div><time>${escHtml(row.date?createdLabel(row.date):'—')}</time></article>`).join('')||'<p class="team-ws-empty">Brak pasujących zdarzeń.</p>';}
function filterTeamWorkspaceLog(query){const team=workspaceTeam();if(!team)return;workspaceState(team.id).logQuery=query;const host=document.getElementById('team-workspace-log-list');if(host)host.innerHTML=workspaceLogMarkup(team);}
function teamWorkspaceAppearance(team){
 const value=team.workspaceAppearance||{};
 const banner=String(value.banner||'');
 return {accent:/^#[0-9a-f]{6}$/i.test(value.accent||'')?value.accent:'',banner:/^(https?:\/\/|assets\/|data:image\/(png|jpeg|webp);base64,)/i.test(banner)?banner:'',pattern:value.pattern==='stars'?'stars':'',motto:String(value.motto||'').slice(0,160)};
}
function applyTeamWorkspaceAppearance(root,team){
 const appearance=teamWorkspaceAppearance(team);
 if(appearance.accent)root.style.setProperty('--team-workspace-accent',appearance.accent);
 if(appearance.pattern)root.dataset.pattern=appearance.pattern;
 if(appearance.banner){const cover=document.createElement('img');cover.className='team-workspace-cover';cover.src=appearance.banner;cover.alt='';root.prepend(cover);}
 if(appearance.motto){const motto=document.createElement('p');motto.className='team-workspace-motto';motto.textContent=appearance.motto;root.prepend(motto);}
}
function renderTeamWorkspaceLayout(){
 const host=document.getElementById('team-profile-body'),team=workspaceTeam(),hero=host?.querySelector(':scope > .tp-hero');if(!host||!team||!hero)return;
 renderTeamWorkspaceTopbar(team);host.closest('.screen')?.classList.remove('discussion-workspace-active');
 const root=document.createElement('div');root.className='team-workspace-view team-ws-'+teamProfileTab;root.dataset.teamId=String(team.id);hero.classList.add('team-profile-identity');hero.querySelector('.tp-tabs')?.remove();
 if(teamProfileTab==='board'){
  const profile=document.createElement('aside');profile.className='team-workspace-profile';profile.append(hero);const feed=host.querySelector('.tp-board-feed');const rail=document.createElement('aside');rail.className='team-workspace-context';rail.innerHTML=renderTeamContextRail(team);root.append(profile);if(feed)root.append(feed);root.append(rail);
 }else if(teamProfileTab==='members')root.innerHTML=renderWorkspaceMembers(team);
 else if(teamProfileTab==='register')root.innerHTML=renderWorkspaceLog(team);
 else if(teamProfileTab==='votes'){root.innerHTML=renderTeamVoteCatalog(team); }else if(teamProfileTab==='meetings'){const meetings=host.querySelector('.team-meetings-dashboard,.team-meeting-page,.team-meetings-tab');if(meetings)root.append(meetings);(team.meetings||[]).forEach(m=>{if(!m.teamId)m.teamId=String(team.id);});}
 else if(teamProfileTab==='ideas'){root.innerHTML=renderTeamIdeaCatalog(team); }else{const active=host.querySelector('.tp-tab-pane.on');if(active)root.append(active);}
 root.querySelectorAll('.ideas-list a[href^="#idea/"]').forEach(link=>{const id=link.getAttribute('href').split('/')[1];link.href=teamHash(team.id,'ideas')+'/idea/'+id;});
 applyTeamWorkspaceAppearance(root,team);host.replaceChildren(root);
}
function setWorkspaceIdeasView(view){const team=workspaceTeam();if(!team||!['grid','list'].includes(view))return;workspaceState(team.id).ideasView=view;openTeam(team.id,{preserveVoteScroll:true});}
function openTeamWorkspaceIdea(teamId,ideaId){const team=projectTeams.find(t=>String(t.id)===String(teamId));if(!team||!teamProjects(team).some(idea=>String(idea.id)===String(ideaId)))return;location.hash=teamHash(teamId,'ideas')+'/idea/'+encodeURIComponent(ideaId);}
document.addEventListener('pointerdown',event=>{document.querySelectorAll('.team-workspace-switcher[open]').forEach(menu=>{if(!menu.contains(event.target))menu.open=false;});if(!event.target.closest('.team-workspace-search'))closeTeamWorkspaceSearch();});
document.addEventListener('keydown',event=>{if(event.key!=='Escape')return;document.querySelectorAll('.team-workspace-switcher[open]').forEach(menu=>{menu.open=false;menu.querySelector('summary')?.focus();});closeTeamWorkspaceSearch();});
// Initial routing runs before this optional module is loaded.
if(parseAppRoute().kind==='team')routeFromLocation();
