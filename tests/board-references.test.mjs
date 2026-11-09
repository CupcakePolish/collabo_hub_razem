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
