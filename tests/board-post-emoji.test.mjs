import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
const source=name=>html.match(new RegExp('function '+name+'\\([^]*?\\n\\}'))[0];
test('shared post toolbar installs emoji control before attachments without duplicating it',()=>{
 let button,installed=false;const tools={querySelector:()=>installed?button:null,prepend:value=>{button=value;installed=true;}};
 const context={document:{createElement:()=>({setAttribute(){}})},openBoardPostEmoji(){}};vm.createContext(context);vm.runInContext(source('installBoardPostEmoji'),context);
 const composer={querySelector:()=>tools};context.installBoardPostEmoji(composer);assert.equal(button.className,'board-post-emoji');const first=button;context.installBoardPostEmoji(composer);assert.equal(first,button);
 assert.ok(html.indexOf('installBoardPostEmoji(composer);if(!composer')>0);
});
test('full emoji menu replaces selection at the caret and preserves attached reference cards',()=>{
 let callback,events=0;const refs=[{href:'#idea/1'}],input={value:'A test B',selectionStart:2,selectionEnd:6,isConnected:true,boardRefs:refs,focus(){},setRangeText(text,start,end){this.value=this.value.slice(0,start)+text+this.value.slice(end);},dispatchEvent(){events++;}};
 const context={document:{querySelectorAll:()=>[]},Event:class{},openExpandedMessageReaction:(button,pick)=>callback=pick};vm.createContext(context);vm.runInContext(source('openBoardPostEmoji'),context);
 const button={closest:()=>({querySelector:()=>input})};context.openBoardPostEmoji(button);callback('🙂');assert.equal(input.value,'A 🙂 B');assert.equal(input.boardRefs,refs);assert.equal(events,1);
 input.selectionStart=input.selectionEnd=input.value.length;context.openBoardPostEmoji(button);callback('gif:demo.gif');assert.equal(input.value,'A 🙂 B[[gif:demo.gif]]');
});
