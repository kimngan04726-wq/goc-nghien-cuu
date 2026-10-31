/* Stage 1 experimental UI: not loaded by index.html until explicitly integrated. */
(function(global){
'use strict';
const escapeHTML=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const cleanId=s=>/^[a-z0-9][a-z0-9_-]{0,79}$/i.test(s);
function createResearchSubsectionUI({mount,db,pageId,subsections,canEdit=()=>false}){
 if(!(mount instanceof HTMLElement)||!db||!Number.isInteger(pageId)||!Array.isArray(subsections))throw Error('Invalid subsection UI configuration');
 const root=document.createElement('div');root.className='subsection-workspace';
 const heading=document.createElement('h2');heading.textContent='Soạn thảo theo tiểu mục (thử nghiệm)';
 const nav=document.createElement('nav');nav.setAttribute('aria-label','Mục lục tiểu mục');
 const main=document.createElement('section');
 const status=document.createElement('p');status.setAttribute('role','status');
 const editor=document.createElement('textarea');editor.rows=16;editor.setAttribute('aria-label','Nội dung tiểu mục');
 const save=document.createElement('button');save.type='button';save.textContent='Lưu phiên bản';
 const switcher=document.createElement('select');switcher.setAttribute('aria-label','Chọn bản thảo');
 [['0','Bài tổng hợp'],['1','Bản nháp 1'],['2','Bản nháp 2']].forEach(([value,label])=>{const o=document.createElement('option');o.value=value;o.textContent=label;switcher.append(o)});
 let current=null,version=0,dirty=false,busy=false;
 function setStatus(message){status.textContent=message}
 function markDirty(){dirty=true;setStatus('Có thay đổi chưa lưu')}
 function renderNav(){nav.replaceChildren();for(const sub of subsections){if(!cleanId(sub.id))continue;const b=document.createElement('button');b.type='button';b.textContent=sub.title||sub.id;b.onclick=()=>open(sub.id,Number(switcher.value));nav.append(b)}}
 async function open(subId,slot=0){
  if(!cleanId(subId)||![0,1,2].includes(slot))throw Error('Invalid subsection');
  if(dirty&&!confirm('Nội dung chưa lưu. Bạn muốn bỏ thay đổi?'))return;
  busy=true;save.disabled=true;setStatus('Đang tải...');
  try{
   const {data,error}=await db.from('research_subsection_documents').select('content,version').eq('page_id',pageId).eq('sub_id',subId).eq('slot',slot).maybeSingle();
   if(error)throw error;
   current={subId,slot};version=Number(data?.version||0);editor.value=data?.content||'';dirty=false;
   switcher.value=String(slot);editor.readOnly=!canEdit(subId,slot);
   setStatus(data?'Đã tải phiên bản '+version:'Chưa có nội dung trong tiểu mục này');
  }catch(e){setStatus('Không tải được: '+e.message)}
  finally{busy=false;save.disabled=!current||editor.readOnly}
 }
 async function saveNow(){
  if(!current||busy||!dirty||!canEdit(current.subId,current.slot))return;
  busy=true;save.disabled=true;setStatus('Đang lưu...');
  try{
   const {data,error}=await db.rpc('save_research_subsection_document',{p_page_id:pageId,p_sub_id:current.subId,p_slot:current.slot,p_expected_version:version,p_content:editor.value});
   if(error)throw error;
   const result=Array.isArray(data)?data[0]:data;
   version=Number(result?.saved_version);dirty=false;setStatus('Đã lưu phiên bản '+version);
  }catch(e){setStatus('Lưu thất bại hoặc xung đột phiên bản. Sao chép nội dung trước khi tải lại. '+e.message)}
  finally{busy=false;save.disabled=editor.readOnly}
 }
 editor.addEventListener('input',markDirty);
 save.onclick=saveNow;
 switcher.onchange=()=>{if(current)open(current.subId,Number(switcher.value))};
 main.append(switcher,editor,save,status);root.append(heading,nav,main);mount.replaceChildren(root);renderNav();
 return {open,save:saveNow,element:root};
}
global.createResearchSubsectionUI=createResearchSubsectionUI;
})(window);
