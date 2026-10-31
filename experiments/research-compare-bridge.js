/* Experimental bridge: load two drafts for the same subsection; preview only until confirmed. */
(function(global){
'use strict';
function createResearchCompareBridge({db,pageId,subId,canMerge=()=>false}){
 if(!db||!Number.isInteger(pageId)||typeof subId!=='string')throw Error('Invalid comparison context');
 let baseVersion=null,sourceVersions=null,preview=null;
 async function read(slot){
  const {data,error}=await db.from('research_subsection_documents').select('content,version')
   .eq('page_id',pageId).eq('sub_id',subId).eq('slot',slot).maybeSingle();
  if(error)throw error;
  return {content:data?.content||'',version:Number(data?.version||0)};
 }
 async function loadDrafts(){
  const [a,b,merged]=await Promise.all([read(1),read(2),read(0)]);
  baseVersion=merged.version;sourceVersions=[a.version,b.version];preview=null;
  return [a.content,b.content];
 }
 async function onMerge(result){
  if(!canMerge())throw Error('Không có quyền ghép bài');
  if(baseVersion===null)throw Error('Cần tải bản nháp trước');
  preview={text:result.text,sources:result.sources,expectedVersion:baseVersion,sourceVersions:[...sourceVersions]};
  return preview;
 }
 async function confirmSave(){
  if(!canMerge()||!preview)throw Error('Chưa có bản xem trước hoặc không đủ quyền');
  const [latest,source1,source2]=await Promise.all([read(0),read(1),read(2)]);
  if(source1.version!==preview.sourceVersions[0]||source2.version!==preview.sourceVersions[1])throw Error('Bản nháp nguồn đã thay đổi; cần tải lại và chọn ý lại');
  if(latest.version!==preview.expectedVersion)throw Error('Bài tổng hợp đã thay đổi; tải lại trước khi lưu');
  // A merge must never silently overwrite an existing consolidated article.
  if(latest.content.trim()&&!global.confirm('Bài tổng hợp đã có nội dung. Bạn có chắc muốn thay thế bằng các ý đã chọn?'))return false;
  const {data,error}=await db.rpc('save_research_subsection_document',{
   p_page_id:pageId,p_sub_id:subId,p_slot:0,
   p_expected_version:preview.expectedVersion,p_content:preview.text
  });
  if(error)throw error;
  const saved=Array.isArray(data)?data[0]:data;
  baseVersion=Number(saved.saved_version);preview=null;return true;
 }
 return {loadDrafts,onMerge,confirmSave,get preview(){return preview}};
}
global.createResearchCompareBridge=createResearchCompareBridge;
})(window);
