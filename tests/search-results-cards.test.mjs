import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
const source=name=>html.match(new RegExp('function '+name+'\\([^]*?\\n\\}'))?.[0];
test('search visuals reuse the canonical project photos and catalog resource icons',()=>{
 const context={globalSearchEntity:item=>item.entity,safeUserUrl:x=>x,catalogResourceIcon:key=>`<svg data-icon="${key}"></svg>`,ideaCatalogPhoto:idea=>idea.projectPhoto,escAttr:String,globalSearchFilterIcon:()=>'<svg></svg>'};vm.createContext(context);vm.runInContext(source('globalSearchVisual'),context);
 assert.match(context.globalSearchVisual({kind:'project',entity:{projectPhoto:'sejm.jpg'}}),/src="sejm.jpg"/);
 assert.match(context.globalSearchVisual({kind:'resource',entity:{photo:'mower.jpg',typeKey:'garden'}}),/src="mower.jpg"/);
 assert.match(context.globalSearchVisual({kind:'resource',entity:{typeKey:'garden'}}),/data-icon="garden"/);
});
test('search combines selected content types, availability and location against real catalog records',()=>{
 const records={one:{status:'available',location:'Biuro'},two:{status:'reserved',location:'Biuro'},three:{status:'available',location:'Magazyn'}};
 const context={globalSearchEntity:item=>records[item.resourceId],globalSearchFilterMatch:(item,filter)=>filter==='all'||item.kind===filter};vm.createContext(context);
 vm.runInContext("const globalSearchTypeSelection=new Set(),globalSearchAvailability=new Set(['available']),globalSearchLocation=new Set(['Biuro']);let globalSearchPageFilter='all';"+source('globalSearchFacetMatch'),context);
 const item=id=>({kind:'resource',scope:'catalog',resourceId:id});assert.equal(context.globalSearchFacetMatch(item('one')),true);assert.equal(context.globalSearchFacetMatch(item('two')),false);assert.equal(context.globalSearchFacetMatch(item('three')),false);assert.equal(context.globalSearchFacetMatch({kind:'dictionary'}),false);
 vm.runInContext("globalSearchAvailability.clear();globalSearchLocation.clear();globalSearchTypeSelection.add('resource');globalSearchTypeSelection.add('dictionary')",context);
 assert.equal(context.globalSearchFacetMatch({kind:'dictionary'}),true);assert.equal(context.globalSearchFacetMatch({kind:'project'}),false);
});
test('search card uses clean description and real resource metadata instead of index source text',()=>{
 const resource={description:'Kosiarka Bosch 36V',type:'Sprzęt',location:'Biuro',owner:'Anna',status:'available'};
 const context={globalSearchEntity:()=>resource,GLOBAL_SEARCH_META:{resource:{singular:'Zasób'}},catalogStatusMeta:()=>({tone:'available',label:'Dostępny'}),catalogResourceIcon:()=>'<svg></svg>',globalSearchFilterIcon:()=>'<svg></svg>',globalSearchResultTags:()=>['ogród'],globalSearchHighlight:String,escAttr:String,escHtml:String,globalSearchVisual:()=>'<img src="mower.jpg">'};vm.createContext(context);vm.runInContext(source('globalSearchPageResultCard'),context);
 const card=context.globalSearchPageResultCard({kind:'resource',scope:'catalog',resultIndex:2,title:'Kosiarka',source:'INTERNAL resource-mower OGR-001',matchExcerpt:'INTERNAL repeated index payload'},'kos');assert.match(card,/Kosiarka Bosch 36V/);assert.match(card,/Dostępny/);assert.match(card,/Biuro/);assert.match(card,/Anna/);assert.ok(!card.includes('INTERNAL'));assert.match(card,/openGlobalSearchResult\(2\)/);
});
test('sidebar combines alternatives within a facet and excludes its own selections from counts',()=>{
 const records={a:{status:'available',location:'Biuro'},b:{status:'reserved',location:'Biuro'},c:{status:'available',location:'Magazyn'}};
 const context={globalSearchEntity:item=>records[item.resourceId],globalSearchFilterMatch:(item,filter)=>filter==='all'||item.kind===filter};vm.createContext(context);
 vm.runInContext("const globalSearchTypeSelection=new Set(['resource']),globalSearchAvailability=new Set(['available','reserved']),globalSearchLocation=new Set(['Biuro']);let globalSearchPageFilter='all';"+source('globalSearchFacetMatch'),context);
 const item=id=>({kind:'resource',scope:'catalog',resourceId:id});assert.equal(context.globalSearchFacetMatch(item('a')),true);assert.equal(context.globalSearchFacetMatch(item('b')),true);assert.equal(context.globalSearchFacetMatch(item('c')),false);
 assert.equal(context.globalSearchFacetMatch(item('c'),'location'),true);
 vm.runInContext("globalSearchAvailability.delete('reserved')",context);assert.equal(context.globalSearchFacetMatch(item('b')),false);assert.equal(context.globalSearchFacetMatch(item('b'),'availability'),true);
});
test('sidebar collapse state survives repeated rendering',()=>{
 const context={globalSearchCollapsedGroups:new Set()};vm.createContext(context);vm.runInContext(source('rememberGlobalSearchGroup')+'\n'+source('globalSearchFacetGroup'),context);
 context.rememberGlobalSearchGroup({isConnected:true,dataset:{searchGroup:'location'},open:false});assert.ok(!context.globalSearchFacetGroup('location','Lokalizacja','Treść').includes(' open '));
 context.rememberGlobalSearchGroup({isConnected:true,dataset:{searchGroup:'location'},open:true});assert.ok(context.globalSearchFacetGroup('location','Lokalizacja','Treść').includes(' open '));
});
