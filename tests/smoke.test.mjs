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

test('cold start stays covered until final styles and the active view are ready', () => {
  assert.match(html, /<html lang="pl" class="app-booting">/);
  assert.match(html, /html\.app-booting body>\*\{visibility:hidden!important\}/);
  assert.match(html, /id="app-ready-script"[\s\S]*refreshVisibleView[\s\S]*classList\.remove\('app-booting'\)/);
  assert.ok(html.lastIndexOf('id="app-ready-script"') > html.lastIndexOf('<style'));
});

test('discover cold start resets transient filters and reconciles their controls', () => {
  assert.match(html, /function resetDiscoverTransientView\(\)[\s\S]*discoverFeedMode='all';discoverSearch='';discoverAuthorFilters\.clear\(\)/);
  assert.match(html, /initTeamUiLanguage\(\);\s*resetDiscoverTransientView\(\);/);
  assert.match(html, /#s-discover \.discover-sidebar-item\[data-feed\][\s\S]*button\.classList\.toggle\('on',active\)/);
  assert.match(html, /window\.addEventListener\('pageshow',[\s\S]*refreshVisibleView\(\)/);
});

test('all inline scripts have valid syntax', () => {
  const scripts = [...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)]
    .map(match => match[1])
    .filter(source => source.trim());
  assert.ok(scripts.length > 0);
  scripts.forEach(source => new Function(source));
});

test('member catalog only exposes the three demo perspectives', () => {
  const seed = html.match(/let members=\[([\s\S]*?)\n\];/)?.[1] || '';
  assert.match(seed, /Anna Wiśniewska/);
  assert.match(seed, /Katarzyna Zielińska/);
  assert.match(seed, /Patrycja Kowalska/);
  assert.doesNotMatch(seed, /Marek Nowak|Piotr Kowalczyk|Magdalena Lis|Tomasz Górski/);
  assert.match(html, /const DEMO_PROFILE_NAMES=new Set\(\['Patrycja Kowalska','Anna Wiśniewska','Katarzyna Zielińska'\]\)/);
  assert.match(html, /if\(Array\.isArray\(data\.members\)\)members=demoPerspectiveProfiles\(data\.members\)/);
  assert.match(html, /Object\.keys\(demoAccounts\)\.forEach\(id=>\{if\(!DEMO_ACCOUNT_ORDER\.includes\(id\)\)delete demoAccounts\[id\];\}\)/);
  assert.match(html, /function normalizeDemoIdeaParticipants\(idea\)/);
  assert.match(html, /memberHistory=.*filter\(row=>DEMO_PROFILE_NAMES\.has\(row\?\.name\)\)/);
  assert.match(html, /role\.filledBy=.*filter\(name=>DEMO_PROFILE_NAMES\.has\(name\)\)/);
  assert.match(html, /if\(skill\.person&&!DEMO_PROFILE_NAMES\.has\(skill\.person\)\)\{skill\.person='';skill\.filled=false;\}/);
  assert.match(html, /function ensureProjectMembers\(idea\)[\s\S]*normalizeDemoIdeaParticipants\(idea\)/);
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
  assert.match(html, /function renderBoardReactionControl\(popId,onReactTpl,reactions=\{\}\)/);
  assert.match(html, /function openDiscoverPostDiscussion\(id\)[\s\S]*openBoardPostDiscussionModal/);
  assert.match(html, /class="discover-post-actions board-post-actions"/);
  assert.doesNotMatch(html, /<span>Doceniam<\/span>/);
  assert.match(html, /#s-discover \.discover-sidebar\{[^}]*max-height:calc\(100dvh - 104px\)[^}]*overflow-y:auto/);
  assert.match(html, /\.discover-composer-prompt\{[^}]*height:50px[^}]*border:1px solid #dedfeb[^}]*background:#fff/);
});

test('organization resource catalog has three starter items and routed detail pages', () => {
  assert.match(html, /id="nl-resources"[^>]*onclick="go\('resources'/);
  assert.match(html, /id="nl-resources"[\s\S]*?data-icon="resource-box"/);
  assert.match(html, /id="s-resources" class="screen resource-catalog-screen"/);
  assert.match(html, /id="s-resource" class="screen resource-detail-screen"/);
  const seed = html.match(/const catalogResources=\[([\s\S]*?)\n\];\nlet resourceCatalogState/)?.[1] || '';
  assert.equal((seed.match(/\{id:'/g) || []).length, 3);
  assert.match(seed, /mower-001/);
  assert.match(seed, /projector-014/);
  assert.match(seed, /room-011/);
  assert.match(html, /function renderResourceCatalog\(\)/);
  assert.match(html, /function catalogFilteredResources\(\)/);
  assert.match(html, /class="resource-filter-sidebar" aria-label="Filtry katalogu"/);
  assert.match(html, /id="resource-type-search"[^>]*placeholder="Szukaj typu…"/);
  assert.match(html, /id="resource-location-search"[^>]*placeholder="Szukaj lokalizacji…"/);
  assert.match(html, /id="resource-catalog-query"[^>]*placeholder="Szukaj zasobów po nazwie, opisie, lokalizacji lub cechach…"/);
  assert.match(html, /function setResourceCatalogScope\(value\)/);
  assert.match(html, /function setResourceCatalogView\(value\)/);
  assert.match(html, /function toggleResourceCatalogFilterGroup\(key\)/);
  assert.match(html, /focusIds=\{query:'resource-catalog-query',typeQuery:'resource-type-search',locationQuery:'resource-location-search'\}/);
  assert.match(html, /\.resource-sidebar-scroll\{max-height:116px;overflow-y:auto/);
  assert.match(html, /\.resource-filter-sidebar\{position:sticky;[^}]*overflow-y:auto/);
  assert.match(html, /class="resource-catalog-list \$\{resourceCatalogState\.view==='grid'\?'grid':''\}"/);
  assert.match(html, /function openCatalogResource\(id,opts=\{\}\)/);
  assert.match(html, /if\(head==='resources'&&parts\[1\]\)return \{kind:'resource'/);
  assert.match(html, /function renderCatalogResourceDetail\(\)/);
  assert.match(html, /\['overview','Przegląd'\],[\s\S]*\['availability','Dostępność'\],[\s\S]*\['discussion','Dyskusja'\],[\s\S]*\['history','Historia'\]/);
  assert.match(html, /\['availability','Dostępność'\],\['opinions','Opinie'\],\['discussion','Dyskusja'\]/);
  assert.match(html, /const catalogResourceReviewsById=\{/);
  assert.match(html, /const catalogResourceUsageById=\{/);
  assert.match(html, /const catalogUserUsageReviewsById=\{/);
  assert.match(html, /function catalogResourceOpinionsViewV2\(resource\)/);
  assert.match(html, /catalogResourceDetailTab==='opinions'\?catalogResourceOpinionsViewV2\(resource\)/);
  assert.match(html, /function openCatalogReviewForm\(resourceId\)/);
  assert.match(html, /function openCatalogReviewEligibility\(resourceId\)/);
  assert.match(html, /function catalogVerifiedUsage\(resource,user=MY_NAME\)/);
  assert.match(html, /usage\.completed&&usage\.ownerConfirmed&&!usage\.userReviewId/);
  assert.match(html, /function openVerifiedCatalogReviewForm\(resourceId,usageId\)/);
  assert.match(html, /function saveCatalogResourceReview\(resourceId,usageId\)/);
  assert.match(html, /usage\.userReviewId=review\.id/);
  assert.match(html, /function openOwnerUsageReviewPicker\(resourceId\)/);
  assert.match(html, /function confirmCatalogUsageCompletion\(resourceId,usageId\)/);
  assert.match(html, /usage\.ownerConfirmed=true/);
  assert.match(html, /function openOwnerUsageReviewForm\(resourceId,usageId\)/);
  assert.match(html, /function saveOwnerUsageReview\(resourceId,usageId\)/);
  assert.match(html, /usage\.ownerReviewId=review\.id/);
  assert.match(html, /function showCatalogReviewConfirmation\(resource,usage,review,ownerReview\)/);
  assert.match(html, /Powiązanie z rezerwacją/);
  assert.match(html, /Potwierdzenie zakończenia użycia/);
  assert.match(html, /function toggleCatalogReviewLike\(resourceId,reviewId\)/);
  assert.match(html, /id="collabohub-resource-opinions"/);
  assert.match(html, /id="collabohub-resource-review-workflow"/);
  assert.match(html, /\.resource-catalog-screen,\.resource-detail-screen\{[^}]*font-family:'DM Sans',sans-serif/);
  assert.ok(existsSync(new URL('../assets/resources/cordless-mower.jpg', import.meta.url)));
});

test('communicator stays available across collaboration screens but not inside documents', () => {
  assert.match(html, /supported=\['s-discover','s-ideas','s-idea','s-idea-person','s-members','s-teams','s-team-profile','s-platform','s-profile-me','s-profile'\]/);
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
  const calendarSeed=html.match(/const discoverCalendarEvents=\[([\s\S]*?)\n\];/)?.[1]||'';
  assert.match(html, /aria-label="Kalendarz spotkań"/);
  assert.match(html, /id="discover-calendar"/);
  assert.match(html, /function renderDiscoverCalendar\(\)/);
  assert.match(html, /Kalendarz spotkań/);
  assert.match(html, /Najbliższe spotkanie/);
  assert.equal((calendarSeed.match(/\{id:'/g)||[]).length, 1);
  assert.match(calendarSeed, /date:'2026-10-20'/);
  assert.match(calendarSeed, /teamId:'tm-leg'/);
  assert.match(calendarSeed, /avatar:'assets\/quorum-gavel\.png'/);
  assert.doesNotMatch(calendarSeed, /2026-09-12|calendar-consultation|calendar-workshop|calendar-vote/);
  assert.match(html, /function discoverCalendarTodayISO\(date=new Date\(\)\)/);
  assert.match(html, /function discoverCalendarFutureEvents\(\)/);
  assert.match(html, /event\.date>today\|\|\(event\.date===today&&event\.time>=clock\)/);
  assert.match(html, /id="discover-calendar-today-date"/);
  assert.match(html, /id="discover-calendar-today-time"/);
  assert.match(html, /function updateDiscoverCalendarClock\(\)/);
  assert.match(html, /avatar:'assets\/quorum-gavel\.png'/);
  assert.match(html, /function discoverCalendarEventVisual\(event\)/);
  assert.match(html, /safeUserUrl\(team\?\.avatar\|\|event\.avatar\|\|''/);
  assert.match(html, /\.discover-calendar-feature-icon img,\.discover-calendar-event-icon img\{[^}]*object-fit:cover/);
  assert.match(html, /function shiftDiscoverCalendar\(delta\)/);
  assert.doesNotMatch(html, /function openDiscoverMeetingModal\(\)/);
  assert.doesNotMatch(html, /function saveDiscoverMeeting\(\)/);
  assert.doesNotMatch(html, /Dodaj spotkanie/);
  assert.doesNotMatch(html, /discoverPosts,discoverCalendarEvents,myProfile/);
  assert.doesNotMatch(html, /id="discover-opportunities"/);
});

test('every project has a governed evaluation and work-points tab', () => {
  assert.match(html, /\{k:'ocena',label:'Ocena i punkty pracy'/);
  assert.match(html, /ocena:tabOcena/);
  assert.match(html, /ocena:'Ocena i punkty pracy'/);
  assert.match(html, /function renderIdeaEvaluationTab\(idea,ideaId\)/);
  assert.match(html, /function projectWorkEvaluationSteps\(stage\)/);
  assert.match(html, /Przygotowanie/);
  assert.match(html, /Ocena projektu/);
  assert.match(html, /Punkty pracy/);
  assert.match(html, /function openProjectWorkScore\(ideaId\)/);
  assert.match(html, /function saveProjectWorkScore\(ideaId\)/);
  assert.match(html, /Autor oceny pozostaje ukryty/);
  assert.match(html, /function closeProjectWorkScoring\(ideaId\)/);
  assert.match(html, /state\.pool=projectWorkScore\(state\)/);
  assert.match(html, /function saveWorkPointProposal\(ideaId,submit=false\)/);
  assert.match(html, /kind:'work-point-allocation'/);
  assert.match(html, /Punkty pracy nie są aurą ani popularnością/);
  assert.match(html, /v\.kind==='work-point-allocation'/);
  assert.match(html, /workPoints\.allocationStatus='approved'/);
  assert.match(html, /class="work-eval-steps"/);
  assert.match(html, /id="project-work-evaluation-styles"/);
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
  assert.match(html, /id="discover-post-search"[^>]*placeholder="Szukaj we wpisach…"[^>]*oninput="setDiscoverSearch\(this\.value\)"/);
  assert.ok(html.indexOf('id="discover-post-search"') < html.indexOf('id="discover-author-search"'));
  assert.match(html, /const hay=\[post\.title,post\.text\]\.join\(' '\)\.toLocaleLowerCase\('pl'\),words=discoverSearch\.split\(\/\\s\+\/\)\.filter\(Boolean\)/);
  assert.match(html, /words\.every\(word=>hay\.includes\(word\)\)/);
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
  assert.match(html, /class="project-head-action icon-only project-context-action project-pins-action"/);
  assert.match(html, /onclick="openProjectPinsCenter\(\$\{ideaId\}\)"/);
  assert.match(html, /class="project-head-action icon-only project-context-action project-notifications-action"/);
  assert.match(html, /onclick="openProjectNotificationCenter\(\$\{ideaId\},'list'\)"/);
  assert.match(html, /class="project-header-counter"/);
  assert.match(html, /class="project-head-action joined" data-tooltip="W projekcie"/);
  assert.match(html, /class="project-head-action icon-only" data-tooltip="Wariant"/);
});

test('pins and notifications moved from overview cards into complete header modals', () => {
  assert.match(html, /function openProjectPinsCenter\(ideaId\)/);
  assert.match(html, /class="project-pins-center-card">\$\{projectBulletinCard\(idea,idea\.id\)\}/);
  assert.match(html, /'project-pins-center-modal'/);
  assert.match(html, /function projectUnseenPinCount\(idea\)/);
  assert.match(html, /projectNotifications\(idea\)\.filter\(row=>row\.unread\)\.length/);
  const overview = html.match(/function renderProjectOverviewBottom\(idea,id\)\{([^\n]+)\}/)?.[1] || '';
  assert.match(overview, /class="idea-overview-content"/);
  assert.doesNotMatch(overview, /idea-overview-sidebar|projectBulletinCard|projectNotificationsOverviewCard|idea-team-summary/);
  assert.match(html, /\.idea-centered-overview\{display:grid;grid-template-columns:minmax\(0,1fr\);align-items:start\}/);
});

test('project overview uses the lifecycle strip and requires a reason for stage votes', () => {
  assert.match(html, /function renderProjectOverviewTop\(idea,id\)\{return projectOverviewLifecycle\(idea,id\);\}/);
  assert.match(html, /class="idea-lifecycle-strip" aria-label="Etapy projektu"/);
  assert.match(html, /class="idea-lifecycle-arrow forward icon-only"[\s\S]*confirmProjectLifecycleVote/);
  assert.match(html, /class="idea-lifecycle-arrow back"[\s\S]*confirmProjectLifecycleVote/);
  assert.doesNotMatch(html, /<small>Przejdź dalej<\/small>/);
  assert.match(html, /\.idea-lifecycle-arrow\.icon-only\{width:100%;min-width:0;grid-template-columns:1fr;grid-template-rows:1fr;place-items:center/);
  assert.match(html, /id="project-lifecycle-reason"/);
  assert.match(html, /function submitProjectLifecycleVote\(ideaId,targetStatus\)[\s\S]*if\(!reason\)return toast\('Dodaj uzasadnienie zmiany etapu\.'/);
  assert.match(html, /text:reason\|\|`Projekt powinien przejść do stanu/);
  assert.doesNotMatch(html, /<section class="idea-stage-summary"><h2>Etap projektu<\/h2>/);
});

test('project products use their cards and metrics fit without a direction column', () => {
  assert.match(html, /class="work-result-copy"><b class="work-result-title">/);
  assert.match(html, /detail=task\.produkt\|\|task\.deliverable\|\|task\.opis\|\|task\.desc/);
  assert.match(html, /\.work-results-card \.work-result-row\{height:auto;min-height:82px/);
  assert.match(html, /\.expected-results-table-wrap\{overflow-x:visible\}/);
  assert.match(html, /\.expected-results-table\{width:100%;min-width:0\}/);
  assert.match(html, /grid-template-columns:minmax\(0,1\.35fr\).*42px/);
  const metrics=html.match(/function projectExpectedResultsOverview\(idea,id\)\{([\s\S]*?)\n\}/)?.[1] || '';
  assert.doesNotMatch(metrics, /<span>Kierunek<\/span>|expected-result-direction/);
  assert.match(metrics, /<span>Efekt<\/span><span>Miernik<\/span><span>Stan bazowy<\/span><span>Cel<\/span><span>Kiedy mierzymy<\/span>/);
});

test('idea team tab focuses on individual competencies and people', () => {
  assert.match(html, /class="idea-team-intro"/);
  assert.match(html, /class="sc-title">Nasze kompetencje<\/div>/);
  assert.match(html, /class="idea-participants-card"/);
  assert.match(html, /class="idea-participant-tile"/);
  assert.match(html, /class="idea-participant-chat"[^>]*toggleDiscoverChat\('person:/);
  assert.match(html, /class="idea-participant-quorum \$\{quorum\.counts\?'in':'out'\}"/);
  assert.match(html, /data-tooltip="\$\{escAttr\(quorum\.reason\)\}"[^>]*>\$\{projectQuorumGavelIcon\(\)\}/);
  assert.match(html, /function projectQuorumGavelIcon\(\)[\s\S]*class="idea-quorum-gavel-icon"/);
  assert.match(html, /mask:url\('assets\/quorum-gavel\.png'\) center\/contain no-repeat/);
  assert.match(html, /\.idea-participant-quorum\{[^}]*border:0!important;[^}]*background:transparent!important/);
  assert.match(html, /\.idea-participants-list\{grid-template-columns:repeat\(2,minmax\(0,1fr\)\);gap:14px\}/);
  assert.match(html, /onclick="openProjectParticipantProfile\(\$\{ideaId\}/);
  assert.match(html, /class="idea-participant-role"/);
  assert.match(html, /<small>Dostępność<\/small>/);
  assert.match(html, /<small>Głosowania<\/small>/);
  assert.match(html, /<small>Spotkania<\/small>/);
  assert.match(html, /<small>Ostatnia aktywność w pomyśle<\/small>/);
  assert.match(html, /function projectVoteGavelIcon\(\)[\s\S]*projectQuorumGavelIcon/);
  assert.match(html, /\.project-vote-gavel \.idea-quorum-gavel-icon\{[^}]*quorum-gavel\.png/);
  const participantCard = html.match(/function renderIdeaParticipantsCard\(idea,ideaId\)\{([\s\S]*?)\n\}/)?.[1] || '';
  assert.doesNotMatch(participantCard, /idea-participant-metrics|stats\.tasks|stats\.docs|stats\.comments|Największy wkład/);
  assert.match(html, /class="idea-competency-person" data-person=/);
  assert.match(html, /class="board-person-hover-target competency"/);
  assert.match(html, /\.board-person-hover-target:hover>\.board-person-hover-card/);
  assert.match(html, /const primary=needPrimaryCapability\(r\)[\s\S]*idea-competency-copy"><strong>\$\{escHtml\(primary\.name\)\}/);
  const joinButton = html.match(/function projectJoinSplitButton\(idea,ideaId\)\{([\s\S]*?)\n\}/)?.[1] || '';
  assert.match(joinButton, /openJoinProjectModal\(\$\{ideaId\}\)/);
  assert.doesNotMatch(joinButton, /ensureIdeaTeams|requestProjectTeamJoin|join-split/);
  const applications = html.match(/function renderProjectJoinApplications\(idea,ideaId\)\{([\s\S]*?)\n\}/)?.[1] || '';
  assert.match(applications, /v\.open&&v\.kind==='project-join'/);
  assert.doesNotMatch(applications, /project-team-join|teamName|teamMembers/);
  const teamTab = html.match(/const tabZespol=`([\s\S]*?)`;\n\n  const tabBudzet/)?.[1] || '';
  assert.match(teamTab, /renderIdeaParticipantsCard|partsBlock/);
  assert.match(teamTab, /<\/div>\s*\$\{partsBlock\}/);
  assert.doesNotMatch(teamTab, /renderAcceptedProjectTeams|Teamy w projekcie/);
  assert.match(html, /\.idea-team-layout\{display:grid;grid-template-columns:minmax\(0,1fr\)/);
});

test('participant context keeps attendance, quorum and a project-specific personal board', () => {
  assert.match(html, /function projectVoteIsLive\(vote\)[\s\S]*minutes<=15/);
  assert.match(html, /function projectVoteParticipation\(idea,row\)[\s\S]*meetingConfirmedAttendanceNames/);
  assert.match(html, /function projectMemberQuorumInfo\(idea,row\)[\s\S]*inactiveDays[\s\S]*inactiveVotes/);
  assert.match(html, /Brak wymaganej aktywności w ostatnich \$\{inactiveDays\} dniach/);
  assert.match(html, /function meetingConfirmedAttendanceNames\(meeting\)[\s\S]*attendance\?\.confirmed===true/);
  assert.match(html, /function saveProjectMeetingAttendance\(ideaId,meetingId\)[\s\S]*attendance=\{confirmed:true,present/);
  assert.match(html, /Frekwencja nie wynika z zaproszeń ani deklaracji przed spotkaniem/);
  assert.match(html, /function openProjectParticipantProfile\(ideaId,name\)/);
  assert.match(html, /id="s-idea-person" class="screen"/);
  assert.match(html, /function projectParticipantHash\(ideaId,personId\)[\s\S]*zespol\/osoba/);
  assert.match(html, /section==='zespol'&&parts\[3\]==='osoba'/);
  assert.match(html, /function openProjectParticipantProfilePage\(ideaId,personRef,opts=\{\}\)/);
  const participantPage = html.match(/function openProjectParticipantProfilePage\(ideaId,personRef,opts=\{\}\)\{([\s\S]*?)\n\}/)?.[1] || '';
  assert.match(participantPage, /project-person-breadcrumb/);
  assert.match(participantPage, /returnToIdea\(\$\{idea\.id\},'zespol'\)/);
  assert.match(participantPage, /project-person-profile-name[\s\S]*openMember\(\$\{person\.id\}\)/);
  assert.match(participantPage, /name===MY_NAME[\s\S]*projectPersonProfileIcon\('settings'\)[\s\S]*Napisz do/);
  assert.match(participantPage, /beginProjectParticipantProfileEdit/);
  assert.match(participantPage, /project-person-edit-action cancel[\s\S]*project-person-edit-action save/);
  assert.match(participantPage, /project-person-inline-description[\s\S]*project-person-inline-hours[\s\S]*project-person-inline-note/);
  assert.match(participantPage, /project-person-competency-pill[\s\S]*project-person-competency-add/);
  assert.doesNotMatch(participantPage, /person\.roles|person\.skills/);
  assert.match(participantPage, /project-person-tabs/);
  assert.match(participantPage, /aria-current="page"[\s\S]*aria-disabled="true"/);
  assert.match(participantPage, /project-person-description[\s\S]*<small>Opis<\/small>/);
  assert.doesNotMatch(participantPage, /Moja rola w tym pomyśle|Edytuj opis i dostępność<\/button>/);
  assert.doesNotMatch(participantPage, /project-person-page-footer|>Otwórz pełny profil<|Wróć do zespołu/);
  assert.match(participantPage, /renderProjectParticipantBoard\(idea,name\)/);
  assert.doesNotMatch(participantPage, /Opinie ze współpracy|projectParticipantFeedbackHTML|projectParticipantFeedbackComposerHTML/);
  assert.match(participantPage, /go\('idea-person'/);
  assert.doesNotMatch(participantPage, /appModal\(/);
  assert.match(html, /function projectParticipantBoardPosts\(idea,name\)[\s\S]*participantBoardPosts[\s\S]*participantFeedback/);
  assert.match(html, /function projectParticipantCompetencies\(idea,name\)[\s\S]*projectCapabilityCatalog/);
  assert.match(html, /function beginProjectParticipantProfileEdit\(ideaId\)/);
  assert.match(html, /function saveProjectParticipantProfileEdit\(ideaId\)[\s\S]*participantContexts\[MY_NAME\][\s\S]*competencies/);
  assert.match(html, /function cancelProjectParticipantProfileEdit\(ideaId\)/);
  const contextEditor = html.match(/function openProjectParticipantContextEdit\(ideaId\)\{([^}]*)\}/)?.[1] || '';
  assert.doesNotMatch(contextEditor, /appModal/);
  assert.match(html, /function renderProjectParticipantBoard\(idea,name\)[\s\S]*Czym chcesz się podzielić\?/);
  const participantBoard = html.match(/function renderProjectParticipantBoard\(idea,name\)\{([\s\S]*?)\n\}/)?.[1] || '';
  assert.doesNotMatch(participantBoard, /Tablica w tym pomyśle|Wpisy .* związane wyłącznie z tym pomysłem/);
  assert.match(html, /function openProjectParticipantBoardComposer\(ideaId,name,postId=''\)/);
  assert.match(html, /project-person-board-composer[\s\S]*teamBoardComposerMediaHTML\(\)[\s\S]*Wybierz emotkę lub GIF/);
  assert.match(html, /function saveProjectParticipantBoardPost\(ideaId,name,postId=''\)[\s\S]*participantBoardPosts/);
  assert.match(html, /function toggleProjectParticipantBoardReaction\(ideaId,name,postId,emoji\)/);
  assert.match(html, /project-person-board-actions board-post-actions[\s\S]*renderBoardReactionControl[\s\S]*board-comment-trigger[\s\S]*Zapisz/);
  assert.match(html, /function toggleProjectParticipantBoardDiscussion\(ideaId,name,postId\)/);
  assert.match(html, /function addProjectParticipantBoardComment\(ideaId,name,postId\)/);
  assert.match(html, /function toggleProjectParticipantBoardSaved\(ideaId,name,postId\)/);
  assert.match(html, /\.project-person-board \.project-person-board-post h2\{[^}]*font-size:26px/);
  assert.match(html, /\.project-person-board-actions\{[^}]*border-top:1px solid var\(--bdr\)/);
  assert.match(html, /function openBoardPostDiscussionModal\(context,postId,locator=''\)/);
  assert.match(html, /function renderBoardReactionTypes\(reactions,openDetailsTpl\)/);
  assert.match(html, /function setBoardPostReaction\(reactions,emoji\)/);
  assert.match(html, /function openBoardReactionDetails\(context,postId,locator,emoji='',commentId=''\)/);
  assert.match(html, /function toggleBoardPostCommentReaction\(context,postId,locator,commentId,emoji\)/);
  assert.match(html, /function startBoardPostCommentEdit\(context,postId,locator,commentId\)/);
  assert.match(html, /function deleteBoardPostComment\(context,postId,locator,commentId\)/);
  assert.match(html, /function toggleBoardCommentReplies\(context,postId,locator,commentId\)/);
  assert.match(html, /sameLevel=found\.depth>=2/);
  assert.match(html, /replyTo=found\.comment\.author\|\|found\.comment\.by/);
  assert.match(html, /input\.value=`\$\{boardPostCommentComposer\.replyAuthor\} `;input\.focus\(\{preventScroll:true\}\);input\.setSelectionRange\(0,boardPostCommentComposer\.replyAuthor\.length\)/);
  assert.doesNotMatch(html, /Odpowiadasz: <b>/);
  assert.match(html, /function boardReplyMentionHTML\(name\)/);
  assert.match(html, /function boardPersonHoverCardHTML\(name\)/);
  assert.match(html, /class="board-person-hover-card"/);
  assert.match(html, /class="board-person-card-follow/);
  assert.match(html, /function boardPersonSharedContext\(name\)/);
  assert.match(html, /class="board-person-card-actions icon-only/);
  assert.match(html, /\.board-person-hover-card\{display:block!important;opacity:0;visibility:hidden;pointer-events:none/);
  assert.match(html, /\.board-person-hover-target:hover>\.board-person-hover-card[^{]*\{[^}]*transition-delay:\.2s/);
  assert.match(html, /aria-label="Wyślij wiadomość"/);
  assert.match(html, /function toggleBoardPersonFollow\(name,event\)/);
  assert.match(html, /function boardPostAuthorHeaderHTML\(author,avatar,date\)/);
  assert.match(html, /id="mb-inp-board-post-comment"/);
  assert.match(html, /event\.key==='Enter'&&!event\.shiftKey&&!event\.isComposing/);
  assert.match(html, /function handleBoardPostCommentAttachments\(kind,input\)/);
  assert.match(html, /id="epanel-board-post-comment"/);
  assert.match(html, /class="board-post-modal-tool board-post-modal-gif"/);
  assert.match(html, /\.board-post-person-trigger b,\.board-post-person-static b\{color:var\(--txt\)!important\}/);
  assert.match(html, /\.app-modal\.board-post-discussion-modal\{width:min\(860px/);
  assert.match(html, /\.board-post-modal-head>button\{border:1px solid var\(--bdr\);background:var\(--surf\);box-shadow:none!important/);
  assert.match(html, /class="board-person-hover-target discover-author"/);
  assert.match(html, /function copyBoardPersonName\(name,event\)/);
  assert.match(html, /boardExpandedCommentThreads=new Set\(\)/);
  assert.match(html, /class="board-reaction-details-overlay"/);
  assert.match(html, /function deleteProjectParticipantBoardPost\(ideaId,name,postId\)/);
  assert.match(html, /downloadBoardDocument\(context,postId,index,teamId=''\)[\s\S]*context==='project-person'/);
  assert.match(html, /\.project-person-tabs\{[^}]*width:min\(1100px,100%\)/);
  assert.match(html, /\.project-person-tabs button\{[^}]*flex:1 1 0/);
  assert.match(html, /\.project-person-profile-page \.project-person-profile-head\{width:min\(1100px,100%\);margin-right:auto;margin-left:auto\}/);
  assert.match(html, /\.project-person-board\{width:min\(1100px,100%\)/);
  assert.match(html, /\.project-person-profile-facts\{grid-template-columns:repeat\(5,minmax\(0,1fr\)\)/);
  assert.match(html, /function toggleDiscoverChat\(key\)[\s\S]*ui\.active===key[\s\S]*ui\.active=null/);
  assert.match(html, /!e\.target\.closest\('\.idea-participant-more'\).*idea-participant-menu/);
  assert.match(html, /Zaproponuj usunięcie z pomysłu/);
  assert.match(html, /function submitProjectRemovalProposal\(ideaId,name\)[\s\S]*kind:'recall'/);
  assert.match(html, /function openPartManager\(id,name\)\{return openProjectParticipantProfile/);
});

test('joining an idea only starts in the team tab and uses two real steps', () => {
  const contribution = html.match(/function renderIdeaContributionIntro\(idea,ideaId\)\{([\s\S]*?)\n\}/)?.[1] || '';
  assert.match(contribution, /if\(isActiveProjectMember\(idea\)\)return '';/);
  assert.match(contribution, />Dołącz<\/button>/);
  assert.doesNotMatch(contribution, /Zgłoś swój wkład/);

  const headerMembership = html.match(/function projectHeaderMembershipButton\(idea,ideaId\)\{([\s\S]*?)\n\}/)?.[1] || '';
  assert.match(headerMembership, /if\(member\)return/);
  assert.match(headerMembership, /return '';/);
  assert.doesNotMatch(headerMembership, /projectHeaderJoin|join-primary|Kandydatura w toku/);

  const joinForm = html.match(/function openJoinProjectModal\(ideaId,step=1\)\{([\s\S]*?)\n\}\nfunction captureProjectJoinDraft/)?.[1] || '';
  assert.match(joinForm, /steps:\['Motywacja','Podsumowanie'\]/);
  assert.match(joinForm, /projectJoinNext\(\$\{ideaId\}\)/);
  assert.doesNotMatch(joinForm, /<svg|class="mi|w fazie opracowania|Wystarczy kilka zdań|Nie wysyłamy bez podsumowania/);
  assert.match(html, /function renderProjectJoinSummary\(ideaId\)/);
  assert.match(html, /onclick="submitProjectJoin\(\$\{ideaId\}\)">Wyślij zgłoszenie/);
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
  assert.match(html, />Członkowie<\/button><button[^>]+>Pomysły<\/button><button[^>]+>Dyskusje<\/button><button[^>]+>Głosowania<\/button><button[^>]+>Zasady<\/button><button[^>]+>Rejestr<\/button>/);
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
  assert.match(html, /class="team-discussions-page team-channel-workspace"/);
  assert.match(html, /class="team-discussion-list-tools"/);
  assert.match(html, /placeholder="Szukaj rozmów, osób lub wątków…"/);
  assert.match(html, /Wycisz[\s\S]*Przypnij[\s\S]*Udostępnij[\s\S]*Ustawienia/);
  assert.match(html, /class="discussion-info-rail"/);
  assert.match(html, /class="team-discussion-list-scroll"/);
  assert.match(html, /function discussionChannelAvatar\(ch,size='small'\)/);
  assert.match(html, /id="team-channel-image" type="file" accept="image\/\*"/);
  assert.match(html, /function toggleTeamDiscussionPin\(teamId,channelId\)/);
  assert.match(html, /collabohub-pinned-discussions:/);
  assert.match(html, /Przypięte dyskusje/);
  assert.match(html, /collabohub-team-channel-chat-v1:/);
  assert.match(html, /function setupChatWindowPlacement\(win,c\)/);
  assert.match(html, /collabohub-chat-window-layout:/);
  assert.match(html, /className='dc-resize-handle'/);
  assert.match(html, /classList\.add\('dc-drag-handle'\)/);
  assert.match(html, /function clearChatWindowLayout\(key\)/);
  assert.match(html, /\._saveChatLayout\?\.\(\)/);
  assert.match(html, /win\._saveChatLayout=save/);
  assert.doesNotMatch(html, /pointercancel',up\);save\(\)/);
  assert.match(html, /collaborativeDocument=screen\?\.id==='s-idea'/);
  assert.doesNotMatch(html, /visible=document\.getElementById\('s-team-profile'\).*teamProfileTab==='votes'/);
  assert.match(html, /#s-team-profile\.on\.discussion-workspace-active[^}]*height:100dvh[^}]*overflow:hidden/);
  assert.match(html, /#s-team-profile\.discussion-workspace-active>\.profile-header\{display:block/);
  assert.doesNotMatch(html, /#s-team-profile\.discussion-workspace-active>\.profile-header\{display:none/);
  assert.match(html, /#s-team-profile\.discussion-workspace-active \.tp-hero-main\{display:flex/);
  assert.match(html, /@media\(max-width:820px\)[^{]*\{[^}]*#s-team-profile\.on\.discussion-workspace-active/);
  assert.match(html, /\.team-discussion-messages\{[^}]*overflow-y:auto/);
  assert.match(html, /\.team-discussion-compose\{[^}]*flex:0 0 64px/);
  const discussions=html.match(/function renderTeamDiscussionsTab\(t,mine\)\{([\s\S]*?)\n\}/)?.[1] || '';
  assert.doesNotMatch(discussions, /Członkowie online|Ostatnia aktywność/);
});

test('idea discussion tab uses the same fixed-height named-thread communicator', () => {
  assert.match(html, /function renderIdeaDiscussionsTab\(idea,ideaId\)/);
  assert.match(html, /const tabDyskusja=renderIdeaDiscussionsTab\(idea,id\)/);
  assert.match(html, /function ensureIdeaDiscussionThreads\(idea\)/);
  assert.match(html, /function sendIdeaDiscussionMessage\(ideaId,rowId\)/);
  assert.match(html, /id="idea-thread-image" type="file" accept="image\/\*"/);
  assert.match(html, /#s-idea\.on\.discussion-workspace-active[^}]*height:100dvh[^}]*overflow:hidden/);
  assert.match(html, /#s-idea\.discussion-workspace-active \.idea-page[^}]*height:calc\(100dvh - var\(--global-nav-height\)\)[^}]*overflow:hidden/);
});

test('team ideas tab filters assigned projects and starts a team-owned private draft', () => {
  assert.match(html, /function renderTeamIdeasTab\(t,mine\)/);
  assert.match(html, /class="team-ideas-page"/);
  assert.match(html, /Pomysły zespołu/);
  assert.match(html, /placeholder="Szukaj pomysłów zespołu…"/);
  assert.match(html, /Projekt zakończony/);
  assert.match(html, /Ocena zakończona/);
  assert.match(html, /Ostatnia aktywność/);
  assert.match(html, /function beginTeamIdeaDraft\(teamId\)/);
  assert.match(html, /const idea=createBlankPrivateIdeaDraft\(\)/);
  assert.match(html, /idea\.teamOriginId=String\(t\.id\)/);
  assert.match(html, /t\.projectIds\.push\(idea\.id\)/);
  assert.match(html, /onclick="beginTeamIdeaDraft\('\$\{escAttr\(t\.id\)\}'\)"/);
  assert.match(html, /class="team-ideas-sort-trigger"/);
  assert.match(html, /class="team-ideas-sort-menu"/);
  assert.match(html, /function toggleTeamIdeasSort\(event\)/);
  assert.match(html, /class="team-idea-card\$\{archived\?' archived':''\}" href="#idea\/\$\{idea\.id\}"/);
  assert.match(html, /Aktywność \$\{escHtml\(polishRelative\(activity\)\)\}/);
  const teamIdeas=html.match(/function renderTeamIdeasTab\(t,mine\)\{([\s\S]*?)\n\}/)?.[1] || '';
  assert.doesNotMatch(teamIdeas, /Powiąż istniejący/);
  assert.doesNotMatch(teamIdeas, /Brak zaznaczeń = bez ograniczeń/);
  assert.doesNotMatch(teamIdeas, /<select/);
  const teamIdeaCard=html.match(/function teamIdeaRowHTML\(idea\)\{([\s\S]*?)\n\}/)?.[1] || '';
  assert.doesNotMatch(teamIdeaCard, /Zobacz szczegóły|team-idea-more|⋮/);
});

test('idea catalogs show visual cards without dead overflow actions', () => {
  assert.match(html, /function ideaCatalogPhoto\(idea\)/);
  assert.match(html, /class="idea-card-thumb"/);
  assert.match(html, /class="idea-card-content"/);
  assert.match(html, /#s-ideas \.ic\{\s*display:grid!important;min-height:0!important;grid-template-columns:132px/);
  assert.match(html, /#s-ideas \.idea-card-thumb\{[^}]*width:132px;height:132px/);
  assert.match(html, /class="ic-title-wrap"><div class="ic-title">/);
  assert.match(html, /Array\.from\(groups\.values\(\)\)\.filter\(g=>g\.filled<g\.min\)/);
  const ideaCatalogCard=html.match(/list\.innerHTML=forMeInvites\+filtered\.map\(idea=>\{([\s\S]*?)\n  \}\)\.join/)?.[1] || '';
  assert.doesNotMatch(ideaCatalogCard, /title="Autor pomysłu"/);
  assert.doesNotMatch(ideaCatalogCard, /title="Komentarze:/);
  assert.match(html, /\.team-idea-card\{[^}]*grid-template-columns:132px/);
  assert.match(html, /\.team-idea-card \.team-idea-cover\{[^}]*width:132px;height:132px/);
  assert.doesNotMatch(html, /idea-card-more/);
  assert.match(html, /\.members-skill-options\{[^}]*scrollbar-gutter:stable/);
  assert.match(html, /\.members-skill-option i\{[^}]*min-width:24px/);
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
  assert.match(html, /team-board-post-actions board-post-actions/);
  assert.match(html, /function toggleTeamBoardPostReaction\(teamId,postId,emoji\)/);
  assert.match(html, /function openTeamBoardPostDiscussion\(teamId,postId\)/);
  assert.match(html, /function toggleTeamBoardPostSaved\(teamId,postId\)/);
  assert.match(html, /#s-team-profile\.on\{display:block;padding:84px 24px 70px!important/);
  assert.match(html, /#s-team-profile \.tp-hero\{[^}]*overflow:visible/);
  assert.match(html, /#s-team-profile \.tp-board-feed\{width:min\(900px,100%\);margin:18px auto 0\}/);
  assert.match(html, /\.tp-board-post-image\{display:block;width:100%;height:260px;object-fit:cover/);
});

test('secondary boards share chronological and engagement sorting controls', () => {
  assert.match(html, /var boardFeedPreferences=\{team:\{\},member:\{\},projectPerson:\{\}\}/);
  assert.match(html, /function sortedBoardFeedRows\(source,scope,key\)/);
  assert.match(html, /preference\.sort==='appreciated'\?boardFeedReactionCount/);
  assert.match(html, /preference\.sort==='commented'\?boardFeedCommentCount/);
  assert.match(html, /function boardFeedControlsHTML\(scope,key\)/);
  assert.match(html, /newest:\['Najnowsze','clock'\][\s\S]*appreciated:\['Najbardziej doceniane','star'\][\s\S]*commented:\['Najczęściej komentowane','comment'\]/);
  assert.match(html, /timeMeta=\{today:'Dzisiaj',week:'Ten tydzień',month:'Ten miesiąc',year:'Ten rok',all:'Cały okres'\}/);
  assert.match(html, /sortedBoardFeedRows\(visible,'team',t\.id\)/);
  assert.match(html, /boardFeedControlsHTML\('team',t\.id\)/);
  assert.match(html, /sortedBoardFeedRows\(filteredRows,'member',member\.id\)/);
  assert.match(html, /boardFeedControlsHTML\('member',member\.id\)/);
  assert.match(html, /sortedBoardFeedRows\(rows,'member',profileMember\.id\)/);
  assert.match(html, /boardFeedControlsHTML\('member',profileMember\.id\)/);
  assert.match(html, /sortedBoardFeedRows\(projectParticipantBoardPosts\(idea,name\),'projectPerson',key\)/);
  assert.match(html, /boardFeedControlsHTML\('projectPerson',key\)/);
  assert.match(html, /\.board-feed-controls\{[^}]*display:flex/);
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
  assert.match(html, /const BOARD_POST_MAX_IMAGES=4/);
  assert.match(html, /const BOARD_POST_IMAGE_DATA_LIMIT=360000/);
  assert.match(html, /function compactBoardPostImageData\(source\)/);
  assert.match(html, /Limit to 900 KB na plik i 1,2 MB łącznie/);
  assert.match(html, /function commitBoardPublication\(snapshot\)/);
  assert.match(html, /if\(!commitBoardPublication\(persistenceSnapshot\)\)return/);
  assert.match(html, /function persistentMembersSnapshot\(\)/);
  assert.match(html, /function compactOversizedBoardMedia\(\)/);
  assert.match(html, /compactOversizedBoardMedia\(\);/);
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
