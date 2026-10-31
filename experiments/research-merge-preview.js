/* Experimental merge preview. Plain text only; never inject draft text as HTML. */
(function(global){
'use strict';
function createResearchMergePreview({mount,bridge}){
 if(!(mount instanceof HTMLElement)||!bridge||typeof bridge.confirmSave!=='function')throw Error('Invalid preview configuration');
 const root=document.createElement('section');root.className='research-merge-preview';
 const heading=document.createElement('h2');heading.textContent='Xem trước bài tổng hợp';
 const notice=document.createElement('p');notice.textContent='Nội dung ghép hiện là văn bản thuần. Định dạng từ hai bản nháp không được giữ lại.';
 const meta=document.createElement('p');
 const text=document.createElement('pre');text.className='rmp-text';
 const status=document.createElement('p');status.setAttribute('role','status');
 const save=document.createElement('button');save.type='button';save.textContent='Xác nhận lưu bài tổng hợp';
 const refresh=document.createElement('button');refresh.type='button';refresh.textContent='Cập nhật bản xem trước';
 let busy=false;
 function render(){
  const preview=bridge.preview;
  text.textContent=preview?.text||'Chưa có nội dung ghép. Hãy chọn ý từ Trang B trước.';
  const sources=preview?.sources||[];
  const counts={1:0,2:0};sources.forEach(s=>{if(s.slot===1||s.slot===2)counts[s.slot]++});
  meta.textContent=preview?'Ý được chọn: '+sources.length+' · Nháp 1: '+counts[1]+' · Nháp 2: '+counts[2]+' · Phiên bản bài tổng hợp dự kiến: '+preview.expectedVersion:'Chưa có bản xem trước';
  save.disabled=!preview||busy;
 }
 save.onclick=async()=>{
  if(busy||!bridge.preview)return;
  busy=true;save.disabled=true;status.textContent='Đang kiểm tra và lưu...';
  try{
   const ok=await bridge.confirmSave();
   status.textContent=ok?'Đã gửi lưu thành công':'Đã hủy lưu';
  }catch(e){status.textContent='Không lưu được: '+(e.message||e)}
  finally{busy=false;render()}
 };
 refresh.onclick=render;
 root.append(heading,notice,meta,text,refresh,save,status);mount.replaceChildren(root);render();
 return {render,element:root};
}
global.createResearchMergePreview=createResearchMergePreview;
})(window);
