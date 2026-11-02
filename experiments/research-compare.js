/* Experimental comparison/merge logic. No production integration, no database writes. */
(function(global){
'use strict';
function normalizeParagraphs(html){
 const doc=new DOMParser().parseFromString(String(html||''),'text/html');
 for(const node of doc.querySelectorAll('script,style,iframe,object,embed,form,svg'))node.remove();
 const blocks=Array.from(doc.body.querySelectorAll('p,li,h1,h2,h3,h4,blockquote'));
 const items=(blocks.length?blocks:[doc.body]).map((node,index)=>({
  id:'p'+index,
  text:(node.textContent||'').replace(/\s+/g,' ').trim()
 })).filter(x=>x.text);
 return items;
}
function createResearchCompareUI({mount,loadDrafts,onMerge,onSelectionChange=()=>{},canMerge=()=>false}){
 if(!(mount instanceof HTMLElement)||typeof loadDrafts!=='function'||typeof onMerge!=='function')throw Error('Invalid compare configuration');
 const root=document.createElement('section');root.className='research-compare';
 const title=document.createElement('h2');title.textContent='So sánh và chọn lọc ý (thử nghiệm)';
 const status=document.createElement('p');status.setAttribute('role','status');
 const columns=document.createElement('div');columns.className='rc-columns';
 const selected=document.createElement('ol');selected.className='rc-selected';
 const merge=document.createElement('button');merge.type='button';merge.textContent='Ghép các ý đã chọn';merge.disabled=true;
 let picks=[],drafts=[[],[]],loading=false;
 const report=t=>{status.textContent=t};
 const renderSelected=()=>{
  selected.replaceChildren();
  picks.forEach((item,i)=>{
   const li=document.createElement('li');
   const text=document.createElement('span');text.textContent=item.text;
   const up=document.createElement('button');up.type='button';up.textContent='↑';up.setAttribute('aria-label','Đưa ý lên');up.disabled=i===0;
   up.onclick=()=>{[picks[i-1],picks[i]]=[picks[i],picks[i-1]];renderSelected();onSelectionChange()};
   const down=document.createElement('button');down.type='button';down.textContent='↓';down.setAttribute('aria-label','Đưa ý xuống');down.disabled=i===picks.length-1;
   down.onclick=()=>{[picks[i+1],picks[i]]=[picks[i],picks[i+1]];renderSelected();onSelectionChange()};
   const remove=document.createElement('button');remove.type='button';remove.textContent='Bỏ';remove.onclick=()=>{picks.splice(i,1);renderSelected();renderColumns();onSelectionChange()};
   li.append(text,up,down,remove);selected.append(li);
  });
  merge.disabled=!picks.length||!canMerge()||loading;
 };
 const renderColumns=()=>{
  columns.replaceChildren();
  drafts.forEach((items,slot)=>{
   const section=document.createElement('section');const h=document.createElement('h3');h.textContent='Bản nháp '+(slot+1);section.append(h);
   items.forEach(item=>{
    const id=(slot+1)+':'+item.id;
    const label=document.createElement('label');const cb=document.createElement('input');cb.type='checkbox';cb.checked=picks.some(p=>p.key===id);
    cb.onchange=()=>{if(cb.checked)picks.push({key:id,text:item.text,slot:slot+1});else picks=picks.filter(p=>p.key!==id);renderSelected();onSelectionChange()};
    label.append(cb,document.createTextNode(item.text));section.append(label);
   });columns.append(section);
  });
 };
 async function refresh(){
  if(loading)return;loading=true;merge.disabled=true;report('Đang tải hai bản nháp...');
  try{
   const result=await loadDrafts();if(!Array.isArray(result)||result.length!==2)throw Error('Expected two drafts');
   drafts=result.map(normalizeParagraphs);picks=[];renderColumns();renderSelected();report('Chọn ý từ hai bản nháp, sau đó sắp xếp lại');
  }catch(e){report('Không tải được: '+(e.message||e))}
  finally{loading=false;renderSelected()}
 }
 merge.onclick=async()=>{
  if(loading||!canMerge()||!picks.length)return;
  loading=true;merge.disabled=true;
  try{
   // Return plain text and provenance. The caller handles version checks and writes.
   await onMerge({text:picks.map(p=>p.text).join('\n\n'),sources:picks.map(p=>({slot:p.slot,id:p.key}))});
   report('Đã gửi nội dung ghép cho bước xác nhận/lưu');
  }catch(e){report('Chưa ghép được: '+(e.message||e))}
  finally{loading=false;renderSelected()}
 };
 root.append(title,status,columns,selected,merge);mount.replaceChildren(root);
 return {refresh,element:root};
}
global.createResearchCompareUI=createResearchCompareUI;
})(window);
