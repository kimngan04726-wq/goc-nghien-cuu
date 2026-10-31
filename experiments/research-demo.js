/* In-memory demo adapter; no network, no authentication, no production data. */
(function(){
'use strict';
const pageId=1,subId='section_1';
const rows=new Map();
for(const [slot,content] of [[0,''],[1,'<p>Giả thuyết nghiên cứu có thể được kiểm chứng bằng khảo sát.</p><p>Phương pháp khảo sát định lượng.</p>'],[2,'<p>Thu thập ý kiến qua phỏng vấn.</p><p>Phân tích dữ liệu theo chủ đề.</p>']])rows.set(slot,{content,version:1});
const db={
 from(table){
  if(table!=='research_subsection_documents')throw Error('Unknown table');
  const filters={};
  const query={
   select(){return query},
   eq(key,value){filters[key]=value;return query},
   async maybeSingle(){
    if(filters.page_id!==pageId||filters.sub_id!==subId)return {data:null,error:null};
    const row=rows.get(filters.slot);return {data:row?{...row}:null,error:null};
   }
  };return query;
 },
 async rpc(name,args){
  if(name==='save_research_subsection_document'){
   const row=rows.get(args.p_slot);
   if(!row||row.version!==args.p_expected_version)return {data:null,error:{message:'Xung đột phiên bản'}};
   row.content=args.p_content;row.version++;return {data:{saved_version:row.version},error:null};
  }
  if(name==='merge_research_subsection_drafts'){
   if(rows.get(1).version!==args.p_draft1_version||rows.get(2).version!==args.p_draft2_version||rows.get(0).version!==args.p_merged_version)
    return {data:null,error:{message:'Phiên bản nguồn hoặc bài tổng hợp đã thay đổi'}};
   const row=rows.get(0);row.content=args.p_merged_content;row.version++;return {data:row.version,error:null};
  }
  return {data:null,error:{message:'Unknown demo RPC'}};
 }
};
const editor=window.createResearchSubsectionUI({mount:document.getElementById('editor'),db,pageId,subsections:[{id:subId,title:'1.1 · Câu hỏi nghiên cứu'}],canEdit:()=>true});
const bridge=window.createResearchCompareBridge({db,pageId,subId,canMerge:()=>true});
const preview=window.createResearchMergePreview({mount:document.getElementById('preview'),bridge});
const compare=window.createResearchCompareUI({mount:document.getElementById('compare'),loadDrafts:bridge.loadDrafts,onMerge:async result=>{await bridge.onMerge(result);preview.render();document.getElementById('preview').scrollIntoView({behavior:'smooth',block:'start'})},canMerge:()=>true});
const viewA=document.getElementById('viewA'),viewB=document.getElementById('viewB');
document.getElementById('tabA').onclick=async()=>{if(editor.dirty&&!confirm('Có nội dung chưa lưu. Bạn vẫn muốn chuyển trang?'))return;viewB.hidden=true;viewA.hidden=false;await editor.open(subId,0)};
document.getElementById('tabB').onclick=async()=>{if(editor.dirty&&!confirm('Có nội dung chưa lưu. Bạn vẫn muốn chuyển trang?'))return;viewA.hidden=true;viewB.hidden=false;await compare.refresh();preview.render()};
void editor.open(subId,1);
})();