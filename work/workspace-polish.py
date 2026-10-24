from pathlib import Path
r=Path('/Users/partrycjaciupak/Documents/Codex/2026-10-03/nap/collabo_hub_razem');p=r/'assets/workspace/team-workspace.js';s=p.read_text()
s=s.replace("let teamWorkspaceSearchResults=[];", """let teamWorkspaceSearchResults=[];
let activeTeamWorkspaceContext='';
function activateTeamWorkspaceContext(id){
 const key=String(id);if(activeTeamWorkspaceContext===key)return;
 if(activeTeamWorkspaceContext)workspaceState(activeTeamWorkspaceContext).meetings={...teamMeetingsView};
 Object.assign(teamMeetingsView,workspaceState(key).meetings||{status:'',query:'',day:'',offset:0});
 activeTeamWorkspaceContext=key;
}""")
s=s.replace("const section=TEAM_WORKSPACE_SECTIONS", "const accent=teamWorkspaceAppearance(team).accent;if(accent)bar.style.setProperty('--team-workspace-accent',accent);else bar.style.removeProperty('--team-workspace-accent');\n const section=TEAM_WORKSPACE_SECTIONS")
s=s.replace("<header><h1>Członkowie</h1><label", "<header><h1>Członkowie</h1>${teamAcceptedMembers(team).includes(MY_NAME)?'<button type=\"button\" class=\"inv-primary\" onclick=\"openWorkspaceTeamInvite()\">＋ Zaproś osobę</button>':''}<label")
s=s.replace("function workspaceMemberCards(team,query)", """function openWorkspaceTeamInvite(){
 const team=workspaceTeam();if(!team||!teamAcceptedMembers(team).includes(MY_NAME))return;
 const available=members.filter(person=>!teamAcceptedMembers(team).includes(person.name)&&!(team.pendingMembers||[]).includes(person.name));
 appModal(`<h3>Zaproś do zespołu</h3><div class="ch-team-invite-list">${available.map(person=>`<button type="button" class="vbtn" onclick="inviteWorkspaceTeamMember(${Number(person.id)})">${escHtml(person.name)}</button>`).join('')||'<p>Wszystkie dostępne osoby należą już do zespołu lub mają oczekujące zaproszenie.</p>'}</div>`);
}
function inviteWorkspaceTeamMember(memberId){const team=workspaceTeam();if(!team)return;prepareMemberTeamInvite(team.id,memberId);openTeam(team.id,{preserveVoteScroll:true});}
function workspaceMemberCards(team,query)""")
p.write_text(s)
p=r/'index.html';s=p.read_text();needle="function openTeam(teamId,opts={}){\n  const t=";assert needle in s;s=s.replace(needle,"function openTeam(teamId,opts={}){\n  if(typeof activateTeamWorkspaceContext==='function')activateTeamWorkspaceContext(teamId);\n  const t=",1);p.write_text(s)
p=r/'package.json';s=p.read_text().replace('node --test tests/smoke.test.mjs','node --test tests/*.test.mjs');p.write_text(s)
