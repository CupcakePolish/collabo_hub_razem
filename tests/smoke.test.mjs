import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');

test('page uses one stable zoom value from the first render', () => {
  assert.match(html, /body\{[^}]*zoom:1\}/);
  assert.match(html, /html\.is-mac body\{zoom:1\}/);
  assert.doesNotMatch(html, /zoom:1\.18/);
  assert.doesNotMatch(html, /html\.is-mac body\{zoom:\.94\}/);
});

test('all inline scripts have valid syntax', () => {
  const scripts = [...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)]
    .map(match => match[1])
    .filter(source => source.trim());
  assert.ok(scripts.length > 0);
  scripts.forEach(source => new Function(source));
});

test('closed votes use the canonical acceptance rule', () => {
  assert.match(html, /function voteWasAccepted\(idea,v\)/);
  assert.match(html, /voteWasAccepted\(idea,v\)\?'✓ Przyjęto':'✗ Odrzucono'/);
  assert.match(html, /if\(!v\.open\) return voteWasAccepted\(idea,v\)/);
});

test('interactive placeholders do not use dead javascript links', () => {
  assert.doesNotMatch(html, /href=["']javascript:void\(0\)/i);
});

test('team join requests require confirmation and can be withdrawn', () => {
  assert.match(html, /function openGlobalTeamJoinRequest\(teamId\)/);
  assert.match(html, /function confirmWithdrawGlobalTeamRequest\(teamId\)/);
  assert.match(html, /function withdrawGlobalTeamRequest\(teamId\)/);
});

test('discover board has navigation, composer and publish interactions', () => {
  assert.match(html, /id="nl-discover"[^>]*onclick="go\('discover'/);
  assert.match(html, /id="nl-discover"[\s\S]*?<svg data-icon="compass"/);
  assert.match(html, /id="nl-ideas"[\s\S]*?<svg data-icon="lightbulb"/);
  assert.match(html, /id="nl-platform"[\s\S]*?<svg data-icon="book-open"/);
  assert.match(html, /class="nav-brand"[^>]*aria-label="Przejdź do Odkrywaj"[^>]*onclick="go\('discover'\)"[^>]*onkeydown="[^"]*go\('discover'\)/);
  assert.match(html, /id="s-discover" class="screen discover-screen"/);
  assert.match(html, /class="discover-composer-prompt"[^>]*onclick="openDiscoverComposerModal\(\)"/);
  assert.doesNotMatch(html, /id="discover-search-input"/);
  assert.doesNotMatch(html, /id="discover-results-summary"/);
  assert.match(html, /function openDiscoverComposerModal\(options=\{\}\)[\s\S]*class="tbp-composer[^"]*"/);
  assert.match(html, /function publishDiscoverPost\(\)/);
  assert.match(html, /function toggleDiscoverLike\(id\)/);
  assert.match(html, /function addDiscoverComment\(id\)/);
  assert.match(html, /#s-discover \.discover-sidebar\{[^}]*max-height:calc\(100dvh - 104px\)[^}]*overflow-y:auto/);
  assert.match(html, /\.discover-composer-prompt\{[^}]*height:50px[^}]*border:1px solid #dedfeb[^}]*background:#fff/);
});

test('communicator stays available across collaboration screens but not inside documents', () => {
  assert.match(html, /supported=\['s-discover','s-ideas','s-idea','s-members','s-teams','s-team-profile','s-platform','s-profile-me','s-profile'\]/);
  assert.match(html, /collaborativeDocument=screen\?\.id==='s-idea'&&!!screen\.querySelector\('\.doc-workspace'\)/);
  assert.match(html, /document\.body\.append\(host\)/);
  assert.match(html, /if\(typeof renderDiscoverChats==='function'\)renderDiscoverChats\(\);[\s\S]*if\(!opts\.preserveScroll\)/);
  assert.match(html, /:is\(#s-discover,#s-ideas,#s-idea,#s-members,#s-teams,#s-team-profile,#s-platform,#s-profile-me,#s-profile\)\{box-sizing:border-box;padding-right:82px!important\}/);
  assert.match(html, /#s-idea:has\(\.doc-workspace\)\{padding-right:0!important\}/);
  assert.match(html, /function openChatPersonMenu\(anchor,name,ui\)/);
  assert.match(html, /dataset\.personName=m\.by/);
  assert.match(html, /Wyślij wiadomość.*Zobacz profil.*Zablokuj.*Połączenie głosowe.*Czat wideo/s);
  assert.match(html, /function toggleChatPersonBlocked\(name\)/);
  assert.match(html, /\.dc-message-avatar:hover:after,.dc-message-avatar:focus-visible:after/);
});

test('discover side rail only reveals its scrollbar while scrolling', () => {
  assert.match(html, /class="discover-sidebar"[^>]*onscroll="showDiscoverSidebarScrollbar\(this\)"/);
  assert.match(html, /class="discover-right-rail"[^>]*onscroll="showDiscoverSidebarScrollbar\(this\)"/);
  assert.match(html, /function showDiscoverSidebarScrollbar\(sidebar\)/);
  assert.match(html, /scrollbar-color:transparent transparent/);
  assert.match(html, /\.discover-sidebar\.is-scrolling\{scrollbar-color:#c9b9e8 transparent\}/);
  assert.match(html, /\.discover-right-rail\.is-scrolling\{scrollbar-color:#c9b9e8 transparent\}/);
  assert.match(html, /#s-discover \.discover-right-rail\{[^}]*max-height:calc\(100dvh - 104px\)[^}]*overflow-y:auto/);
  assert.match(html, /setTimeout\(\(\)=>sidebar\.classList\.remove\('is-scrolling'\),650\)/);
});

test('discover right rail renders an interactive meeting calendar', () => {
  assert.match(html, /aria-label="Kalendarz spotkań"/);
  assert.match(html, /id="discover-calendar"/);
  assert.match(html, /function renderDiscoverCalendar\(\)/);
  assert.match(html, /Kalendarz spotkań/);
  assert.match(html, /Najbliższe spotkanie/);
  assert.match(html, /function shiftDiscoverCalendar\(delta\)/);
  assert.doesNotMatch(html, /function openDiscoverMeetingModal\(\)/);
  assert.doesNotMatch(html, /function saveDiscoverMeeting\(\)/);
  assert.doesNotMatch(html, /Dodaj spotkanie/);
  assert.doesNotMatch(html, /discoverPosts,discoverCalendarEvents,myProfile/);
  assert.doesNotMatch(html, /id="discover-opportunities"/);
});

test('discover board filters and sorts community posts', () => {
  assert.match(html, /const APP_TIME_ZONE='Europe\/Warsaw'/);
  assert.match(html, /const NOW_TIME=\(\)=>new Intl\.DateTimeFormat\('pl-PL',\{timeZone:APP_TIME_ZONE/);
  assert.doesNotMatch(html, /data-filter-kind="topic"/);
  assert.doesNotMatch(html, />Tematy</);
  assert.doesNotMatch(html, /data-filter-kind="type"/);
  assert.doesNotMatch(html, /Rodzaj wpisu/);
  assert.doesNotMatch(html, /id="discover-composer-kind"/);
  assert.doesNotMatch(html, /discover-kind-badge/);
  assert.match(html, /id="discover-author-search"/);
  assert.match(html, /Najbardziej doceniane/);
  assert.match(html, /Najczęściej komentowane/);
  assert.match(html, /data-time="today"[\s\S]*data-time="week"[\s\S]*data-time="month"[\s\S]*data-time="year"[\s\S]*data-time="all"/);
  assert.match(html, /\['appreciated','commented'\]\.includes\(discoverSort\)/);
  assert.match(html, /function discoverPostTime\(post,index=0,referenceNow=Date\.now\(\)\)/);
  assert.match(html, /function discoverPostClock\(post,index=0,referenceNow=Date\.now\(\)\)/);
  assert.match(html, /function discoverPostTimestamp\(post\)/);
  assert.ok(html.indexOf('const exact=discoverPostTimestamp(post)') < html.indexOf("if(value.includes('dzisiaj'))"));
  assert.match(html, /if\(value\.includes\('dzisiaj'\)\)return dayStart\+timeOfDay-index/);
  assert.match(html, /discoverPosts\.map\(\(post,index\)=>\(\{post,index,time:discoverPostTime\(post,index,referenceNow\)\}\)\)/);
  assert.match(html, /return rows\.map\(row=>row\.post\)/);
  assert.match(html, /function discoverPostDateLabel\(post,index=0,referenceNow=Date\.now\(\)\)/);
  assert.match(html, /createdAt=new Date\(\)\.toISOString\(\)/);
  assert.match(html, /discoverPostAuthorButton\(post,avatar\)[\s\S]*discoverPostDateLabel\(post\)/);
  assert.doesNotMatch(html, /post\.sourceType==='team'\?'Zespół':'Osoba'/);
  assert.match(html, /function openDiscoverAuthor\(id\)/);
  assert.match(html, /function toggleDiscoverFilterSection\(button\)/);
  assert.match(html, /class="discover-filter-toggle"[^>]*aria-expanded="true"/);
  assert.doesNotMatch(html, /function openDiscoverSource\(id\)/);
});

test('discover post menu supports author actions and community reports', () => {
  assert.match(html, /function discoverPostCanManage\(post\)/);
  assert.match(html, /function discoverPostMenu\(post\)/);
  assert.match(html, /Opcje autora/);
  assert.match(html, /Edytuj wpis/);
  assert.match(html, /Usuń wpis/);
  assert.match(html, /Zgłoś wpis/);
  assert.match(html, /function openDiscoverReportModal\(id\)/);
  assert.match(html, /function submitDiscoverPostReport\(id\)/);
  assert.match(html, /post\.reports\.push\(/);
  assert.doesNotMatch(html, /Edytuj powiązanie/);
  assert.doesNotMatch(html, /class="discover-post-source"/);
  assert.match(html, /#s-discover \.discover-post-text \.tp-board-mention\{[^}]*background:transparent[^}]*text-decoration:none/);
});

test('discover post editing reuses the full composer and marks edited posts', () => {
  assert.match(html, /function openDiscoverEditPostModal\(id\)[\s\S]*openDiscoverComposerModal\(\)/);
  assert.match(html, /teamBoardComposerImages=teamBoardPostImages\(post\)/);
  assert.match(html, /teamBoardComposerDocuments=teamBoardPostDocuments\(post\)/);
  assert.match(html, /publish\.textContent='Zapisz zmiany'/);
  assert.match(html, /Object\.assign\(editingPost,\{title,text,image,images,documents,editedAt:Date\.now\(\)\}\)/);
  assert.match(html, /post\.editedAt\?' · Edytowane':''/);
  assert.doesNotMatch(html, /id="discover-edit-title"/);
  assert.doesNotMatch(html, /function saveDiscoverPostEdits\(id\)/);
});

test('team catalog toolbar keeps search and create action together', () => {
  assert.match(html, /class="teams-catalog-tools"[\s\S]*id="teams-search"[\s\S]*class="teams-create-button"[^>]*onclick="startGlobalTeamForm\(\)"/);
  assert.match(html, /class="teams-results-toolbar"/);
  assert.match(html, /\.teams-create-button\{[\s\S]*white-space:nowrap/);
  assert.match(html, /\.teams-create-button\{[\s\S]*border:2px solid #cbb8ee[\s\S]*background:#fff[\s\S]*color:#57329f/);
});

test('add idea still starts the existing private-draft flow', () => {
  assert.match(html, /class="ideas-add-button" onclick="beginNewIdea\(\)"/);
  assert.match(html, /#s-ideas \.ideas-add-button\{[\s\S]*border:2px solid #cbb8ee[\s\S]*background:#fff[\s\S]*color:#57329f/);
  assert.doesNotMatch(html, /<button[^>]*class="btn-add"[^>]*onclick="beginNewIdea\(\)"/);
  assert.match(html, /ideas-search-row/);
  assert.match(html, /function beginNewIdea\(\)/);
});

test('needed and present competency filters are searchable and filter project cards', () => {
  assert.match(html, /id="idea-needed-skill-search"/);
  assert.match(html, /id="idea-present-skill-search"/);
  assert.match(html, /function renderIdeaSkillFilters\(\)/);
  assert.match(html, /selectedIdeaNeededSkills\.size/);
  assert.match(html, /selectedIdeaPresentSkills\.size/);
  assert.match(html, /ideaHasCompetency\(i,skill,'needed'\)/);
  assert.match(html, /ideaHasCompetency\(i,skill,'present'\)/);
});

test('personalized ideas use the Dla mnie label', () => {
  assert.match(html, /id="tab-for-me"[^>]*>✦ Dla mnie/);
  assert.doesNotMatch(html, /Dopasowane/);
});

test('discover board keeps its visual assets without the orphaned green courtyard demo', () => {
  assert.match(html, /assets\/discover\/odkrywaj-illustration\.png/);
  assert.match(html, /assets\/discover\/50-drzew\.jpg/);
  assert.match(html, /\^assets\\\/\[a-z0-9_\.\/-\]\+\\\.\(\?:png\|jpe\?g\|gif\|webp\)\$/);
  assert.match(html, /Posadźmy 100 drzew/);
  assert.match(html, /Kamień milowy: posadzono pierwsze 50 drzew/);
  assert.doesNotMatch(html, /\{id:'discover-demo-2'/);
  assert.doesNotMatch(html, /projectTeams\.push\(\{id:'tm-green'/);
  assert.match(html, /data\.projectTeams\.filter\(row=>String\(row\?\.id\)!=='tm-green'\)/);
  assert.match(html, /data\.discoverPosts\.filter\(row=>String\(row\?\.id\)!=='discover-demo-2'\)/);
  assert.ok(existsSync(new URL('../assets/discover/odkrywaj-illustration.png', import.meta.url)));
  assert.ok(existsSync(new URL('../assets/discover/50-drzew.jpg', import.meta.url)));
});

test('discover composer chooses between the member and their published teams', () => {
  assert.match(html, /ownTeams=\(projectTeams\|\|\[\]\)\.filter\(row=>!row\.draft&&teamAcceptedMembers\(row\)\.includes\(MY_NAME\)\)/);
  assert.match(html, /id="discover-composer-identity-picker"/);
  assert.match(html, /class="discover-identity-menu" role="listbox"/);
  assert.match(html, /data-identity="profile" role="option"/);
  assert.match(html, /data-identity="team:\$\{escAttr\(row\.id\)\}" role="option"/);
  assert.match(html, /function selectDiscoverComposerIdentity\(value,event\)/);
  assert.doesNotMatch(html, /<select id="discover-composer-source"/);
  assert.match(html, /<input type="hidden" id="discover-composer-source" value="profile">/);
  assert.doesNotMatch(html, /id="discover-composer-source-id"/);
  assert.doesNotMatch(html, /<h3>Nowy wpis<\/h3>/);
  assert.match(html, /\.discover-composer-identity\{width:158px;min-height:36px\}/);
  assert.match(html, /\.discover-composer-head\{position:absolute;[^}]*top:16px;right:18px;padding:0\}/);
  assert.match(html, /\.discover-composer-shell\{position:relative;min-height:520px\}/);
});

test('idea sharing uses the post composer with destination choices and a prefilled mention', () => {
  assert.match(html, /function shareIdeaOnMyBoard\(ideaId\)[\s\S]*openDiscoverComposerModal\(\{ideaId\}\)/);
  assert.match(html, /ideaMention=idea\?`@\[\$\{[^`]+\}\]\(#idea\/\$\{idea\.id\}\)`:''/);
  assert.match(html, /id="discover-composer-audience-picker"/);
  assert.match(html, /data-audience="public"[\s\S]*Publiczne/);
  assert.match(html, /data-audience="team"[\s\S]*Wewnątrz zespołu/);
  assert.match(html, /data-audience="profile"[\s\S]*Tylko na swoim profilu/);
  assert.match(html, /if\(audience==='team'\)/);
  assert.match(html, /if\(audience==='profile'\)/);
});

test('project header metadata is uniform and aligned with the top of its photo', () => {
  assert.match(html, /#s-idea \.idea-title-meta button\{[^}]*font:inherit/);
  assert.match(html, /#s-idea \.idea-title-meta,#s-idea \.idea-title-meta button\{font-size:12px;line-height:1\.45\}/);
  assert.match(html, /#s-idea \.idea-title-meta \.idea-meta-status\{[^}]*color:#6b52a4/);
  assert.match(html, /#s-idea \.ph-idea\{display:flex;align-items:flex-start;gap:24px\}/);
  assert.match(html, /id="idea-ph-title"[\s\S]*id="idea-title-meta"[\s\S]*id="idea-hero-actions"/);
  assert.match(html, /#s-idea \.ph-idea-actions\{position:static;max-width:none;[^}]*margin-top:12px\}/);
  assert.match(html, /#s-idea \.idea-title-meta\{gap:10px;margin-top:16px\}/);
  assert.match(html, /class="project-head-action icon-only watch-project/);
  assert.match(html, /class="project-head-action share-board" data-tooltip="Na tablicę"/);
  assert.match(html, /class="project-head-action joined" data-tooltip="W projekcie"/);
  assert.match(html, /class="project-head-action icon-only" data-tooltip="Wariant"/);
});

test('project overview uses the lifecycle strip and requires a reason for stage votes', () => {
  assert.match(html, /function renderProjectOverviewTop\(idea,id\)\{return projectOverviewLifecycle\(idea,id\);\}/);
  assert.match(html, /class="idea-lifecycle-strip" aria-label="Etapy projektu"/);
  assert.match(html, /class="idea-lifecycle-arrow forward"[\s\S]*confirmProjectLifecycleVote/);
  assert.match(html, /class="idea-lifecycle-arrow back"[\s\S]*confirmProjectLifecycleVote/);
  assert.match(html, /id="project-lifecycle-reason"/);
  assert.match(html, /function submitProjectLifecycleVote\(ideaId,targetStatus\)[\s\S]*if\(!reason\)return toast\('Dodaj uzasadnienie zmiany etapu\.'/);
  assert.match(html, /text:reason\|\|`Projekt powinien przejść do stanu/);
  assert.doesNotMatch(html, /<section class="idea-stage-summary"><h2>Etap projektu<\/h2>/);
});

test('discover team posts resolve the current team avatar with a fallback', () => {
  assert.match(html, /function discoverPostAvatar\(post,team=null\)/);
  assert.match(html, /safeUserUrl\(team\?\.avatar\|\|post\.avatarImage\|\|'','image'\)/);
  assert.match(html, /class="discover-avatar-fallback"/);
  assert.match(html, /onerror="this\.remove\(\)"/);
});

test('new teams start as editable private drafts and publish to Discover', () => {
  assert.match(html, /function startGlobalTeamForm\(\)[\s\S]*draft:true/);
  assert.match(html, /id="team-draft-name"/);
  assert.match(html, /id="team-draft-desc"/);
  assert.match(html, /function saveGlobalTeamDraft\(teamId,quiet=false,/);
  assert.match(html, /function publishGlobalTeam\(teamId\)[\s\S]*discoverPosts\.unshift/);
  assert.match(html, /Prywatny szkic/);
  assert.match(html, /function toggleTeamDraftEdit\(teamId\)/);
  assert.match(html, /function addTeamDraftRequirement\(teamId\)/);
  assert.match(html, /function removeTeamDraftRequirement\(teamId,index\)/);
  assert.doesNotMatch(html, /const draftEditor=t\.draft/);
});

test('catalog filters use checkboxes and no explicit all option', () => {
  assert.doesNotMatch(html, /data-filter-value="all"/);
  assert.doesNotMatch(html, /dictionaryChoice\('Wszystkie'/);
  assert.doesNotMatch(html, /teamRadioOption\('mode','all'/);
  assert.match(html, /teamModeFilters=\[\],teamLocationFilters=\[\]/);
  assert.match(html, /dictionaryCategory===value\?'all':value/);
  assert.match(html, /ideaListFilters\[key\]===value\?'all':value/);
});

test('team profile is centered and has no sidebar layout', () => {
  assert.match(html, /class="tp-breadcrumb"/);
  assert.match(html, /class="tp-tabs"/);
  assert.match(html, /class="tp-page-grid"/);
  assert.match(html, /#s-team-profile\.on\{display:block/);
  assert.match(html, /width:min\(1240px,100%\);max-width:1240px;margin:0 auto/);
  assert.doesNotMatch(html, /team-profile-header'\)\.innerHTML=`<div class="tp-side-card"/);
});

test('team draft supports avatar upload and dictionary-backed locations', () => {
  assert.match(html, /function updateTeamDraftAvatar\(teamId,input\)/);
  assert.match(html, /accept="image\/\*"[^>]*updateTeamDraftAvatar/);
  assert.match(html, /function teamLocationDictionaryMatches\(query\)/);
  assert.match(html, /\['city','region'\]\.includes\(row\.category\)/);
  assert.match(html, /Wybierz miasto lub region ze Słownika/);
  assert.match(html, /id="team-location-suggestions"/);
  assert.match(html, /Brak pojęcia w Słowniku/);
  assert.match(html, /Przejdź do Słownika i dodaj/);
});

test('focus styling uses a thin border without heavy rings', () => {
  assert.match(html, /:focus-visible\{outline:1px solid var\(--p400\)!important/);
  assert.match(html, /tp-hero\.is-editing\{border-color:var\(--bdr\);outline:0;box-shadow:none\}/);
});

test('team catalog previews uploaded profile photos', () => {
  assert.match(html, /class="team-card-avatar">\$\{avatar\}/);
  assert.match(html, /t\.avatar\?`<img src="\$\{escAttr\(t\.avatar\)\}/);
  assert.match(html, /\.team-card-avatar img\{width:100%;height:100%;object-fit:cover\}/);
  assert.match(html, /team-card-description\{grid-column:2;/);
  assert.match(html, /team-catalog-card\{display:flex;[\s\S]*flex-direction:column/);
  assert.match(html, /team-catalog-card footer\{[\s\S]*margin-top:auto/);
  assert.match(html, /team-card-copy\{display:grid;[\s\S]*align-content:start/);
  assert.match(html, /<h2>\$\{escHtml\(t\.name\|\|'Nowy zespół'\)\}<\/h2><div class="team-card-badges">/);
  assert.match(html, /team-catalog-card footer\{[\s\S]*border-top:0/);
});

test('team draft separates editing, publishing and deletion', () => {
  assert.match(html, /function confirmPublishGlobalTeam\(teamId\)/);
  assert.match(html, /Opublikować zespół\?/);
  assert.match(html, /class="tp-button tp-publish-quiet"[^>]*confirmPublishGlobalTeam/);
  assert.match(html, /function confirmDeleteTeamDraft\(teamId\)/);
  assert.match(html, /function deleteTeamDraft\(teamId\)/);
  assert.match(html, /Usunąć szkic zespołu\?/);
  assert.match(html, /editing\?`<button class="tp-button" onclick="saveTeamProfileEdit/);
  assert.doesNotMatch(html, /editing\?`[^`]*publishGlobalTeam/);
});

test('published team uses metadata, real tabs and profile-change votes', () => {
  assert.match(html, /Opublikowano: \$\{escHtml\(t\.publishedDate/);
  assert.match(html, /Ostatnia aktywność: \$\{escHtml\(t\.lastActive/);
  assert.match(html, /setTeamProfileTab\('\$\{escAttr\(t\.id\)\}','board'\)\">Tablica/);
  assert.match(html, />Członkowie<\/button><button[^>]+>Dyskusje<\/button><button[^>]+>Głosowania<\/button><button[^>]+>Zasady<\/button><button[^>]+>Rejestr<\/button>/);
  assert.match(html, /teamAcceptedMembers\(t\)\.length>1/);
  assert.match(html, /kind:'team-profile-edit'/);
  assert.match(html, /function rejectTeamDecision\(teamId,decisionId\)/);
  assert.doesNotMatch(html, /Jesteś w zespole<\/span>/);
  assert.doesNotMatch(html, /document\.getElementById\('tp-discussion'\)\?\.scrollIntoView\(\{behavior:'smooth'\}\)/);
});

test('team rules tab manages governance drafts and voted proposals', () => {
  assert.match(html, /function renderTeamRulesTab\(t,mine\)/);
  assert.match(html, /Zasady i ustawienia zespołu/);
  assert.match(html, /Zmiany wymagają głosowania/);
  assert.match(html, /Podejmowanie decyzji.*Dołączanie.*Członkostwo.*Zasady opisowe/s);
  assert.match(html, /Czas bez aktywności/);
  assert.match(html, /osoba nie liczy się do kworum/);
  assert.match(html, /function openTeamGovernanceEdit\(teamId,draftId=''/);
  assert.match(html, /Przygotuj zmianę zasad/);
  assert.match(html, /function renderTeamRulesEditor\(t,mine\)/);
  assert.match(html, /class="team-rules-page team-rules-editing"/);
  assert.match(html, /function updateTeamRulesEditorField\(key,value,type='text'\)/);
  assert.match(html, /Możesz przechodzić między kartami/);
  assert.match(html, /proposedTeamRules/);
  assert.match(html, /function updateTeamGovernanceProposalPreview\(\)/);
  assert.match(html, /function saveTeamGovernanceDraft\(teamId\)/);
  assert.match(html, /function submitTeamGovernanceEdit\(teamId\)/);
  assert.match(html, /teamRuleProposalsHTML\(t,mine\)/);
  assert.match(html, /function ensureTeamRulesDemo\(t\)/);
  assert.match(html, /class="team-rule-author" data-person-name=/);
  assert.match(html, /teamProfileTab='rules';openTeam\(teamId\)/);
  assert.match(html, /ballots:\{\[MY_NAME\]:'yes'\}/);
  assert.doesNotMatch(html, /team-rules-table[\s\S]{0,500}Zmień<\/button>/);
  assert.doesNotMatch(html, /function openTeamGovernanceEdit\(teamId,draftId=''\)\{[^\n]*appModal/);
});

test('team voting tab is a searchable master-detail workflow with proposals and discussions', () => {
  assert.match(html, /function renderTeamDecisionsTab\(t\)/);
  assert.match(html, /class="team-voting-heading"><h1>Głosowania zespołu<\/h1>/);
  assert.match(html, /placeholder="Szukaj głosowania…"/);
  assert.match(html, /filter\('open','Trwające'\).*filter\('closed','Zakończone'\).*filter\('cancelled','Anulowane'\)/s);
  assert.match(html, /class="team-voting-layout"/);
  assert.match(html, /function selectTeamVote\(teamId,decisionId\)/);
  assert.match(html, /function submitTeamDecisionVote\(teamId,decisionId\)/);
  assert.match(html, /value="yes"[\s\S]*value="no"[\s\S]*value="abstain"/);
  assert.match(html, /Wstrzymanie liczy się do kworum, ale nie do większości/);
  assert.match(html, /function openTeamVoteProposal\(teamId\)/);
  assert.match(html, /function submitTeamVoteProposal\(teamId\)/);
  assert.match(html, /function openTeamVoteDiscussion\(teamId,decisionId\)/);
  assert.match(html, /class="team-vote-discussion-trigger"/);
  assert.match(html, /function teamVoteDiscussionUnread\(t,d\)/);
  assert.match(html, /collabohub-team-vote-chat-v1:/);
  assert.match(html, /function renderTeamVoteDiscussionChat\(\)/);
  assert.match(html, /setupDiscoverComposer\(host,c,teamVoteDiscussionUI\);enhanceChatControls\(host,c,teamVoteDiscussionUI\);finishChatConversation\(host,c,teamVoteDiscussionUI\)/);
  assert.match(html, /function minimizeTeamVoteDiscussion\(\)/);
  assert.match(html, /team-vote-author-yes/);
  assert.match(html, /d\.ballots\[MY_NAME\]=choice/);
  assert.match(html, /if\(c\.type!==['"]team-vote['"]&&themeGrid\)/);
  assert.doesNotMatch(html, /content:'Głos: za'/);
  assert.doesNotMatch(html, /data-vote-stance/);
  assert.match(html, /class="team-vote-simulator"/);
  assert.match(html, /function simulateTeamVoteResult\(teamId,decisionId,scenario\)/);
  assert.match(html, /\['consensus','objection','deadline'\]\.includes\(scenario\)/);
  assert.match(html, /function resetTeamVoteSimulation\(teamId,decisionId\)/);
  assert.match(html, /Przywrócono stan głosowania sprzed symulacji/);
  assert.match(html, /\.team-voting-layout\{display:grid;grid-template-columns:minmax\(300px,38%\) minmax\(0,62%\)/);
  assert.match(html, /preserveScroll:!!opts\.preserveVoteScroll/);
});

test('team discussions share persistent draggable chat windows with the communicator sidebar', () => {
  assert.match(html, /function renderTeamDiscussionsTab\(t,mine\)/);
  assert.match(html, /class="team-discussions-heading"/);
  assert.match(html, /Dyskusje zespołu/);
  assert.match(html, /placeholder="Szukaj dyskusji, kanału lub osoby…"/);
  assert.match(html, /Otwórz jako komunikator/);
  assert.match(html, /function toggleTeamDiscussionPin\(teamId,channelId\)/);
  assert.match(html, /collabohub-pinned-discussions:/);
  assert.match(html, /Przypięte dyskusje/);
  assert.match(html, /collabohub-team-channel-chat-v1:/);
  assert.match(html, /function setupChatWindowPlacement\(win,c\)/);
  assert.match(html, /collabohub-chat-window-layout:/);
  assert.match(html, /className='dc-resize-handle'/);
  assert.match(html, /classList\.add\('dc-drag-handle'\)/);
  assert.match(html, /collaborativeDocument=screen\?\.id==='s-idea'/);
  assert.doesNotMatch(html, /visible=document\.getElementById\('s-team-profile'\).*teamProfileTab==='votes'/);
  const discussions=html.match(/function renderTeamDiscussionsTab\(t,mine\)\{([\s\S]*?)\n\}/)?.[1] || '';
  assert.doesNotMatch(discussions, /Członkowie online|Ostatnia aktywność/);
});

test('team board uses a centered visual feed with editable welcome post', () => {
  assert.match(html, /function renderTeamBoard\(t,mine\)/);
  assert.match(html, /class="tp-board-feed"/);
  assert.match(html, /class="tp-board-quick-compose"/);
  assert.match(html, /Czym chcesz się podzielić\?/);
  assert.doesNotMatch(html, /class="tp-button tp-board-add"/);
  assert.doesNotMatch(html, /<h2><i>▣<\/i> Tablica zespołu<\/h2>/);
  assert.match(html, /Przygotowujesz tablicę szkicu\. Wpisy nie są jeszcze publiczne/);
  assert.match(html, /Poznaj \$\{t\.name/);
  assert.match(html, /assets\/discover\/50-drzew\.jpg/);
  assert.match(html, /openTeamBoardPostModal/);
  assert.match(html, /async function saveTeamBoardPost/);
  assert.match(html, /toggleTeamWelcomePin/);
  assert.match(html, /#s-team-profile\.on\{display:block;padding:84px 24px 70px!important/);
  assert.match(html, /#s-team-profile \.tp-hero\{[^}]*overflow:visible/);
  assert.match(html, /#s-team-profile \.tp-board-feed\{width:min\(900px,100%\);margin:18px auto 0\}/);
  assert.match(html, /\.tp-board-post-image\{display:block;width:100%;height:260px;object-fit:cover/);
});

test('team board post composer supports rich media and categorized platform mentions', () => {
  assert.match(html, /class="tbp-composer"/);
  assert.match(html, /composerKey='team-board-post-body'/);
  assert.match(html, /id="mb-inp-\$\{composerKey\}"/);
  assert.match(html, /Wybierz emotkę lub GIF/);
  assert.doesNotMatch(html, /class="tbp-save-draft"/);
  assert.match(html, /saveTeamBoardPost\('[^']*','[^']*','published'\)/);
  assert.match(html, /function handleTeamBoardMention\(input\)/);
  assert.match(html, /buildGlobalSearchIndex\(\)/);
  assert.match(html, /function insertTeamBoardMention\(index\)/);
  assert.match(html, /function renderTeamBoardText\(raw\)/);
  assert.match(html, /class="tp-board-mention"/);
  assert.match(html, /function previewTeamBoardPostImage\(input\)/);
  assert.match(html, /function previewTeamBoardPostDocuments\(input\)/);
  assert.match(html, /id="team-board-post-image"[^>]*multiple/);
  assert.match(html, /id="team-board-post-document"[^>]*multiple/);
  assert.match(html, /function teamBoardPostMediaHTML\(post,context='discover',teamId=''\)/);
  assert.match(html, /images\.slice\(0,4\)/);
  assert.match(html, /class="post-auto-more">\+\$\{images\.length-4\}/);
  assert.match(html, /class="post-document-list"/);
  assert.match(html, /function downloadBoardDocument\(context,postId,index,teamId=''\)/);
  assert.doesNotMatch(html, /function setTeamBoardComposerLayout\(layout\)/);
  assert.doesNotMatch(html, /aria-label="Układ wpisu"/);
  assert.match(html, /\.member-action-close,\.ch-modal-close,\.tbp-close/);
  assert.match(html, /\.app-modal\.team-board-post-modal\{width:min\(980px/);
  assert.match(html, /class="tbp-audience-menu"/);
  assert.match(html, /Tylko zespół/);
  assert.match(html, /Dla członków platformy · także w Odkrywaj/);
  assert.match(html, /placeholder="Tytuł \(opcjonalnie\)"/);
  assert.doesNotMatch(html, /function teamBoardLayoutIcon\(layout\)/);
  assert.match(html, /TEAM_BOARD_MENTION_CATEGORIES/);
  assert.match(html, /Kategorie elementów platformy/);
  assert.match(html, /\['project','resource','member','vote','doc','team'\]/);
  assert.match(html, /function teamBoardComposerIcon\(kind\)/);
  assert.match(html, /discover-team-board-/);
  assert.match(html, /\.tbp-mention-pop\{position:absolute;z-index:120;top:0;left:calc\(100% \+ 18px\)/);
  assert.match(html, /slice\(0,6\)/);
  assert.match(html, /query=match\?\.\[1\]\|\|''/);
  assert.match(html, /test\(query\)\)\{hide\(\);return;\}/);
  assert.match(html, /teamBoardMentionQuery='';/);
  assert.match(html, /teamBoardMentionResults=\[\];/);
  assert.match(html, /#s-team-profile>\.profile-header\{[^}]*border:0!important/);
});
