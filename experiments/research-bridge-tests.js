/* Isolated in-memory bridge regression tests; no Supabase or production writes. */
(function(global){
'use strict';
async function runResearchBridgeTests(){
 const results=[];
 const check=(name,ok)=>results.push({name,passed:!!ok});
 const records=new Map([[0,{content:'',version:1}],[1,{content:'A',version:2}],[2,{content:'B',version:3}]]);
 const db={
  from(){
   const f={};
   const q={select(){return q},eq(k,v){f[k]=v;return q},
    async maybeSingle(){return {data:records.has(f.slot)?{...records.get(f.slot)}:null,error:null}}};
   return q;
  },
  async rpc(name,p){
   if(name!=='merge_research_subsection_drafts')return {error:{message:'Unexpected RPC'}};
   if(records.get(1).version!==p.p_draft1_version||records.get(2).version!==p.p_draft2_version||records.get(0).version!==p.p_merged_version)
    return {error:{message:'Version conflict'}};
   records.get(0).content=p.p_merged_content;records.get(0).version++;
   return {data:records.get(0).version,error:null};
  }
 };
 const bridge=global.createResearchCompareBridge({db,pageId:1,subId:'test',canMerge:()=>true});
 const draft=await bridge.loadDrafts();
 check('Load two drafts',draft[0]==='A'&&draft[1]==='B');
 await bridge.onMerge({text:'A\\n\\nB',sources:[{slot:1,id:'a'},{slot:2,id:'b'}]});
 check('Preview captures source versions',bridge.preview.sourceVersions.join(',')==='2,3');
 records.get(1).version++;
 let rejected=false;try{await bridge.confirmSave()}catch(e){rejected=/nguồn/.test(e.message)}
 check('Reject changed draft 1',rejected&&records.get(0).content==='');
 await bridge.loadDrafts();await bridge.onMerge({text:'Merged',sources:[]});
 records.get(2).version++;
 rejected=false;try{await bridge.confirmSave()}catch(e){rejected=/nguồn/.test(e.message)}
 check('Reject changed draft 2',rejected);
 await bridge.loadDrafts();await bridge.onMerge({text:'Merged',sources:[]});
 records.get(0).version++;
 rejected=false;try{await bridge.confirmSave()}catch(e){rejected=/tổng hợp/.test(e.message)}
 check('Reject changed consolidated article',rejected);
 await bridge.loadDrafts();await bridge.onMerge({text:'Merged',sources:[]});
 const ok=await bridge.confirmSave();
 check('Successful merge increments version',ok===true&&records.get(0).content==='Merged'&&records.get(0).version===3);
 bridge.invalidatePreview();
 check('Invalidate preview',bridge.preview===null);
 return results;
}
global.runResearchBridgeTests=runResearchBridgeTests;
})(window);
