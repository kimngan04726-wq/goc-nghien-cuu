/* Experimental only: not loaded by production index.html. Requires audited Supabase RLS/RPC. */
(function(global){
'use strict';
const validId=s=>typeof s==='string'&&/^[a-z0-9][a-z0-9_-]{0,79}$/i.test(s);
function createResearchSubsectionUI({mount,db,pageId,subsections,canEdit=()=>false}){
 if(!(mount instanceof HTMLElement)||!db||!Number.isInteger(pageId)||!Array.isArray(subsections))throw Error('Invalid configuration');
 const root=document.createElement('div');root.className='subsection-workspace';
 const heading=document.createElement('h2');heading.textContent='Soạn thảo theo tiểu mục (thử nghiệm)';
 const nav=document.createElement('nav');nav.className='sw-nav';nav.setAttribute('aria-label','Mục lục tiểu mục');
 const main=document.createElement('section');main.className='sw-main';
 const status=document.createElement('p');status.setAttribute('role','status');const side=document.createElement('aside');side.className='sw-side';const sideHeading=document.createElement('h3');sideHeading.textContent='Thông tin bản thảo';const info=document.createElement('p');info.textContent='Chọn tiểu mục để bắt đầu';side.append(sideHeading,info);
 const editor=document.createElement('textarea');editor.rows=16;editor.setAttribute('aria-label','Nội dung tiểu mục');
 const save=document.createElement('button');save.type='button';save.textContent='Lưu phiên bản';
 const switcher=document.createElement('select');switcher.setAttribute('aria-label','Chọn bản thảo');
 [['0','Bài tổng hợp'],['1','Bản nháp 1'],['2','Bản nháp 2']].forEach(([value,label])=>{const o=document.createElement('option');o.value=value;o.textContent=label;switcher.append(o)});
 let current=null,version=0,dirty=false,busy=false,loading=false,revision=0,timeout=null,pendingSave=null;
 function report(message){status.textContent=message;info.textContent=(current?'Tiểu mục: '+current.subId+' · Bản: '+current.slot+' · Phiên bản: '+version+' · ':'')+message}
 function stopTimer(){clearTimeout(timeout);timeout=null}
 function editable(){return !!current&&!editor.readOnly&&canEdit(current.subId,current.slot)}
 function markDirty(){revision++;dirty=true;report('Có thay đổi chưa lưu');stopTimer();if(editable())timeout=setTimeout(()=>{void saveNow()},2000)}
 async function saveNow(){
  stopTimer();
  if(busy)return pendingSave?await pendingSave:!dirty;
  if(!editable()||loading||!dirty)return !dirty;
  busy=true;save.disabled=true;report('Đang lưu...');
  const snapshot=editor.value,rev=revision,ctx={...current},expected=version;
  pendingSave=(async()=>{try{
   const {data,error}=await db.rpc('save_research_subsection_document',{p_page_id:pageId,p_sub_id:ctx.subId,p_slot:ctx.slot,p_expected_version:expected,p_content:snapshot});
   if(error)throw error;
   const result=Array.isArray(data)?data[0]:data;
   if(!Number.isSafeInteger(Number(result?.saved_version)))throw Error('Server did not return a version');
   version=Number(result.saved_version);
   dirty=revision!==rev;
   report(dirty?'Đã lưu bản trước; còn thay đổi mới':'Đã lưu phiên bản '+version);
   return !dirty;
  }catch(e){
   dirty=true;report('Chưa lưu được hoặc xung đột phiên bản. Nội dung vẫn ở trình soạn thảo: '+(e.message||e));
   return false;
  }finally{
   busy=false;save.disabled=!editable();
   if(dirty&&revision!==rev&&editable())timeout=setTimeout(()=>{void saveNow()},2000);
  }})();
  try{return await pendingSave}finally{pendingSave=null}
 }
 async function open(subId,slot=0){
  if(!validId(subId)||![0,1,2].includes(slot))throw Error('Invalid subsection');
  if(loading||busy){report('Đang xử lý, vui lòng đợi');return false}
  if(dirty&&!confirm('Có thay đổi chưa lưu. Bỏ thay đổi để chuyển?')){switcher.value=String(current?.slot??0);return false}
  stopTimer();loading=true;save.disabled=true;editor.disabled=true;report('Đang tải...');
  try{
   const {data,error}=await db.from('research_subsection_documents').select('content,version').eq('page_id',pageId).eq('sub_id',subId).eq('slot',slot).maybeSingle();
   if(error)throw error;
   current={subId,slot};version=Number(data?.version||0);editor.value=data?.content||'';dirty=false;revision++;
   switcher.value=String(slot);editor.readOnly=!canEdit(subId,slot);for(const b of nav.querySelectorAll('button'))b.setAttribute('aria-current',String(b.dataset.subId===subId));
   report(data?'Đã tải phiên bản '+version:'Tiểu mục chưa có nội dung');return true;
  }catch(e){report('Không tải được: '+(e.message||e));switcher.value=String(current?.slot??0);return false}
  finally{loading=false;editor.disabled=false;save.disabled=!editable()}
 }
 for(const sub of subsections){if(!validId(sub.id))continue;const b=document.createElement('button');b.type='button';b.textContent=sub.title||sub.id;b.dataset.subId=sub.id;b.onclick=()=>{void open(sub.id,Number(switcher.value))};nav.append(b)}
 editor.addEventListener('input',markDirty);
 save.onclick=()=>{void saveNow()};
 switcher.onchange=()=>{if(current)void open(current.subId,Number(switcher.value))};
 const beforeUnload=e=>{if(dirty){e.preventDefault();e.returnValue=''}};
 global.addEventListener('beforeunload',beforeUnload);
 main.append(switcher,editor,save,status);main.prepend(heading);root.append(nav,main,side);mount.replaceChildren(root);
 return {open,save:saveNow,element:root,dispose(){stopTimer();global.removeEventListener('beforeunload',beforeUnload)},get dirty(){return dirty}};
}
global.createResearchSubsectionUI=createResearchSubsectionUI;
})(window);
