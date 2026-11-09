import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
const source=name=>html.match(new RegExp('function '+name+'\\([^]*?\\n\\}'))?.[0]||html.match(new RegExp('function '+name+'\\([^\\n]+'))[0];
test('all inline scripts parse after rich-reference integration',()=>{for(const match of html.matchAll(/<script\b[^>]*>([^]*?)<\/script>/g))new vm.Script(match[1]);});
test('rich references preserve prose, deduplicate attachments and round-trip card-only posts',()=>{
 const context={};vm.createContext(context);vm.runInContext(source('boardReferenceParts')+'\n'+source('boardComposerValue'),context);
 const parsed=context.boardReferenceParts('Warto sprawdzić\n@[Projekt](#idea/1)\n@[Projekt](#idea/1)\n@[Anna](#member/2)');
 assert.equal(parsed.text,'Warto sprawdzić');assert.equal(parsed.refs.length,2);
 const stored=context.boardComposerValue({value:'',boardRefs:parsed.refs});assert.ok(stored.includes('@[Projekt](#idea/1)'));assert.equal(context.boardReferenceParts(stored).refs.length,2);
});
test('quick voting uses the canonical ballot mutation and persists only successful votes',()=>{
 let calls=0,saves=0,allowed=false;
 const context={ideas:[{id:1,votes:[{id:'v1'}]}],castStance:(idea,vote,choice,reason)=>{calls++;assert.equal(choice,'yes');assert.equal(reason.text,'');return allowed;},queuePersistence:()=>saves++,document:{querySelectorAll:()=>[]}};
 vm.createContext(context);vm.runInContext(source('castBoardReferenceVote'),context);
 context.castBoardReferenceVote({},'1','v1','yes');assert.equal(calls,1);assert.equal(saves,0);
 allowed=true;context.castBoardReferenceVote({},'1','v1','yes');assert.equal(saves,1);
 context.castBoardReferenceVote({},'1','v1','bogus');assert.equal(calls,2);
});
test('selected needs survive publication and re-edit without changing the destination',()=>{
 const context={};vm.createContext(context);vm.runInContext(source('boardReferenceParts')+'\n'+source('boardComposerValue'),context);
 const ref={label:'Projekt',href:'#idea/1',needs:['Weryfikacja prawna','Redakcja tekstu']};
 const stored=context.boardComposerValue({value:'Dołącz do nas',boardRefs:[ref]});
 const parsed=context.boardReferenceParts(stored);assert.equal(parsed.text,'Dołącz do nas');assert.equal(parsed.refs[0].href,ref.href);assert.deepEqual(Array.from(parsed.refs[0].needs),ref.needs);
 assert.ok(!stored.includes('board-ref:{'));
});
test('preview uses canonical photos, omits arrows and shows only selected vacant needs',()=>{
 const idea={id:1,desc:'Opis',roleRequirements:[{role:'Prawo',min:2,filledBy:['Anna']},{role:'Tekst',min:1,filledBy:[]},{role:'Pełna rola',min:1,filledBy:['Anna']}]};
 const context={ideas:[idea],catalogResources:[{id:'r1',photo:'resource.jpg',description:'Zasób'}],projectTeams:[],GLOBAL_SEARCH_META:{project:{singular:'Pomysł'},resource:{singular:'Zasób'}},escHtml:String,escAttr:String,safeUserUrl:x=>x,teamBoardMentionIcon:()=>'<svg></svg>',ideaCatalogPhoto:()=> 'canonical-project.jpg',needPrimaryCapability:role=>({name:role.role}),catalogResourceIcon:()=>'<svg></svg>',dictionaryEntries:()=>[],resolveBoardReference:ref=>ref.href==='#idea/1'?{kind:'project',ideaId:1,title:'Projekt'}:{kind:'resource',scope:'catalog',resourceId:'r1',title:'Zasób'}};
 vm.createContext(context);vm.runInContext(source('boardReferenceIdeaNeeds')+'\n'+source('renderBoardReference'),context);
 const rendered=context.renderBoardReference({label:'Projekt',href:'#idea/1',needs:['Prawo','Pełna rola']});
 assert.ok(rendered.includes('src="canonical-project.jpg"'));assert.ok(rendered.includes('Prawo'));assert.ok(rendered.includes('1/2'));assert.ok(!rendered.includes('Pełna rola'));assert.ok(!rendered.includes('Tekst'));assert.ok(!rendered.includes('↗'));
 assert.ok(context.renderBoardReference({label:'Zasób',href:'#resources/r1'}).includes('src="resource.jpg"'));
});
