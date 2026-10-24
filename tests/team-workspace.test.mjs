import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
const html=await readFile(new URL('../index.html',import.meta.url),'utf8');
const source=await readFile(new URL('../assets/workspace/team-workspace.js',import.meta.url),'utf8');
const routing=html.slice(html.indexOf('function screenHash('),html.indexOf('function isCurrentIdeaRoute('));
function context(extra={}){
 const ctx=vm.createContext({document:{addEventListener(){},getElementById(){return null;}},parseAppRoute:()=>({kind:'screen'}),escHtml:x=>String(x??'').replaceAll('<','&lt;'),escAttr:x=>String(x??'').replaceAll('"','&quot;'),teamAcceptedMembers:t=>t.members||[],MY_NAME:'A',projectTeams:[],members:[],teamProfileTabTeamId:'one',teamProfileTab:'board',teamProjects:t=>t.ideas||[],authorOf:()=>({name:'A'}),boardDateFromValue:x=>x?new Date(x):null,createdLabel:x=>String(x||'—'),memberAvatarContent:()=>'',memberInitials:()=>'',teamBoardAvatar:()=>'<img alt="">',teamHash:(id,tab='board')=>'#team/'+id+(tab==='board'?'':'/'+tab),catalogResourceIcon:()=>'',...extra});
 vm.runInContext(source,ctx);return ctx;
}

test('workspace module parses and loads without a team route',()=>{assert.doesNotThrow(()=>context());});
test('team routes preserve document and invitation state and reject invalid sections',()=>{
 const ctx=vm.createContext({SCREEN_ROUTES:{ideas:'ideas'},ROUTE_IDEA_TABS:{przeglad:'przeglad',dokumenty:'dokumenty',zespol:'zespol'}});vm.runInContext(routing,ctx);
 const route=hash=>vm.runInContext(`parseAppRoute(${JSON.stringify(hash)})`,ctx);
 for(const section of ['ideas','members','meetings','votes','log'])assert.equal(route('#team/one/'+section).kind,'team');
 const doc=route('#team/one/ideas/idea/7/dokumenty/doc/d1');assert.equal(doc.ideaId,7);assert.equal(doc.docId,'d1');assert.equal(doc.ideaTab,'dokumenty');
 assert.equal(route('#team/one/ideas/idea/7/zespol/zapraszanie').invitationPage,true);
 assert.equal(route('#team/one/ideas/unknown').kind,'invalid');assert.equal(route('#team/one/members/unknown').kind,'invalid');assert.equal(route('#team/one/discussions').kind,'invalid');
 assert.equal(route('#idea/7/dokumenty/doc/d1').docId,'d1');
});
test('workspace switcher only lists memberships and does not label the avatar in its summary',()=>{
 const ctx=context({projectTeams:[{id:'one',name:'Alpha',members:['A']},{id:'two',name:'Beta',members:['B']}]});const markup=vm.runInContext('teamWorkspaceSwitcher(projectTeams[0])',ctx);
 assert.match(markup,/Twoje zespoły/);assert.match(markup,/>Alpha<\/b>/);assert.doesNotMatch(markup,/>Beta<\/b>/);assert.doesNotMatch(markup.split('</summary>')[0],/>Alpha</);assert.match(markup,/#discover/);
});
test('search uses only current team content and preserves destinations',()=>{
 const opened=[];const team={id:'one',members:['A'],ideas:[{id:1,title:'Term',desc:'own'}],meetings:[{id:'m',title:'Term'}],decisions:[{id:'v',prop:'Term'}],boardPosts:[{id:'p',text:'Term'},{id:'draft',text:'Term',status:'draft',by:'B'}]};
 const ctx=context({team,setTeamProfileTab:()=>{},openMeetingSummary:(...args)=>opened.push(args),openTeamRailVote:(...args)=>opened.push(args),openTeamBoardPostDiscussion:(...args)=>opened.push(args)});
 const rows=vm.runInContext('teamWorkspaceSearchRows(team,"term")',ctx);assert.equal(rows.length,4);rows.find(r=>r.kind==='Spotkanie').open();assert.deepEqual(opened[0],['team','one','m']);rows.find(r=>r.kind==='Głosowanie').open();assert.deepEqual(opened[1],['one','v']);
});
test('project scope includes legacy assignment and teamId but excludes private drafts belonging to another person',()=>{
 const fn=html.slice(html.indexOf('function teamProjects('),html.indexOf('\nfunction ',html.indexOf('function teamProjects(')+1));
 const ctx=vm.createContext({ideas:[{id:1},{id:2,teamId:'one'},{id:3,teamId:'two'},{id:4,teamId:'one',private:true}],isPrivateIdeaDraft:i=>!!i.private,canOpenPrivateIdeaDraft:()=>false});vm.runInContext(fn,ctx);assert.deepEqual(Array.from(vm.runInContext('teamProjects({id:"one",projectIds:[1]}).map(i=>i.id)',ctx)),[1,2]);
});
test('members support skill search and finished invitations remain read-only',()=>{
 const ctx=context({members:[{name:'A',skills:['Grafika']},{name:'B',skills:['Prawo']}]});ctx.team={id:'one',members:['A','B'],invitationHistory:[{name:'C',status:'declined',date:'2026-10-24'}]};
 assert.equal(vm.runInContext('teamWorkspaceMemberRows(team,"prawo")[0].name',ctx),'B');const markup=vm.runInContext('renderWorkspaceMembers(team)',ctx);assert.match(markup,/Zakończone zaproszenia/);assert.match(markup,/Odrzucono/);assert.doesNotMatch(vm.runInContext('workspaceInvitationHistory(team)',ctx),/<button/);
});
test('activity timeline sorts actual timestamps and includes invitation outcomes',()=>{
 const ctx=context();ctx.team={date:'2026-01-01',discussion:[{text:'Earlier',date:'2026-02-01'}],invitationHistory:[{name:'C',status:'accepted',statusChangedAt:'2026-03-01'}]};const rows=vm.runInContext('workspaceLogRows(team)',ctx);assert.match(rows[0].label,/Dołączono/);assert.equal(rows.at(-1).label,'Utworzono zespół');
});
test('appearance accepts optional local decoration and rejects unsafe banner and accent values',()=>{
 const ctx=context();ctx.team={workspaceAppearance:{accent:'red;position:fixed',banner:'javascript:alert(1)',pattern:'stars',motto:'hello'}};const value=vm.runInContext('teamWorkspaceAppearance(team)',ctx);assert.equal(value.accent,'');assert.equal(value.banner,'');assert.equal(value.pattern,'stars');ctx.team.workspaceAppearance.accent='#654321';assert.equal(vm.runInContext('teamWorkspaceAppearance(team).accent',ctx),'#654321');
});
test('meeting shell keeps the current dashboard and meeting detail view',()=>{
 // Exercise the shell against the three component roots supported by the existing meeting module.
 for(const component of ['.team-meetings-dashboard','.team-meeting-page','.team-meetings-tab']){
  const node=()=>({children:[],classList:{add(){},remove(){},toggle(){}},dataset:{},style:{setProperty(){}},append(...items){this.children.push(...items);},prepend(){},querySelector(){return null;},querySelectorAll(){return [];}});
  const hero=node(),meeting=node(),host=node();host.querySelector=selector=>selector===':scope > .tp-hero'?hero:selector.split(',').includes(component)?meeting:null;host.closest=()=>null;host.replaceChildren=root=>host.children=[root];
  const ctx=context({projectTeams:[{id:'one',members:['A'],meetings:[{id:'m'}]}],teamProfileTab:'meetings',document:{addEventListener(){},getElementById:id=>id==='team-profile-body'?host:null,createElement:node}});vm.runInContext('renderTeamWorkspaceTopbar=()=>{};renderTeamWorkspaceLayout()',ctx);assert.equal(host.children[0].children[0],meeting,component);assert.equal(ctx.projectTeams[0].meetings[0].teamId,'one');
 }
});
test('meeting search and filters are restored per team',()=>{
 const ctx=context({teamMeetingsView:{status:'',query:'',day:'',offset:0}});
 vm.runInContext("activateTeamWorkspaceContext('one');teamMeetingsView.query='Legal';teamMeetingsView.status='upcoming';activateTeamWorkspaceContext('two')",ctx);
 assert.equal(ctx.teamMeetingsView.query,'');ctx.teamMeetingsView.query='Garden';vm.runInContext("activateTeamWorkspaceContext('one')",ctx);assert.equal(ctx.teamMeetingsView.query,'Legal');assert.equal(ctx.teamMeetingsView.status,'upcoming');vm.runInContext("activateTeamWorkspaceContext('two')",ctx);assert.equal(ctx.teamMeetingsView.query,'Garden');
});
test('membership outcomes are archived once and cannot be approved by non-members',()=>{
 const extract=name=>html.slice(html.indexOf('function '+name+'('),html.indexOf('\nfunction ',html.indexOf('function '+name+'(')+1));
 const team={id:'one',members:['A'],pendingMembers:['B'],pendingInvites:[{name:'B',note:'Original note'}],discussion:[]};const ctx=vm.createContext({team,ensureIdeaTeams:()=>[team],teamAcceptedMembers:t=>t.members,MY_NAME:'A',TODAY:'2026-10-24',queuePersistence(){},openTeam(){}});vm.runInContext(extract('acceptGlobalTeamMember'),ctx);vm.runInContext("acceptGlobalTeamMember('one','B');acceptGlobalTeamMember('one','B')",ctx);assert.equal(team.invitationHistory.length,1);assert.equal(team.invitationHistory[0].note,'Original note');assert.equal(team.invitationHistory[0].status,'accepted');assert.ok(team.members.includes('B'));assert.equal(team.pendingInvites.length,0);
 ctx.MY_NAME='Outsider';team.pendingMembers.push('C');vm.runInContext("acceptGlobalTeamMember('one','C')",ctx);assert.ok(!team.members.includes('C'));assert.equal(team.invitationHistory.length,1);
});
