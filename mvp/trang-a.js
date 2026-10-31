/* Trang A MVP — chỉ dùng bảng mvp_subsections; không ghi vào bảng cũ */
(function(){
'use strict';
const titles=['Lý do chọn đề tài','Mục đích, mục tiêu và câu hỏi nghiên cứu','Cơ sở lý thuyết','Mô hình nghiên cứu và giả thuyết','Các biến nghiên cứu','Thang đo và phương án đo lường','Phương pháp nghiên cứu'];
const statuses=['Chưa viết','Đang viết','Chờ duyệt','Đã duyệt'];
let rows=[],selected=null,dirty=false,timer=null,loading=false,conflictOpen=false,initializing=false,userId=null,profiles=[];
const weight={'Chưa viết':0,'Đang viết':25,'Chờ duyệt':75,'Đã duyệt':100};
const summary=group=>{const percent=Math.round(group.reduce((n,r)=>n+weight[r.status],0)/group.length);const status=group.every(r=>r.status==='Chưa viết')?'Chưa viết':group.every(r=>r.status==='Đã duyệt')?'Đã duyệt':group.every(r=>weight[r.status]>=75)?'Chờ duyệt':'Đang viết';return {percent,status}};
const $=id=>document.getElementById(id);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const client=()=>typeof db!=='undefined'?db:null;
const currentUser=async()=>{const c=client();if(!c)return null;try{const {data}=await c.auth.getUser();return data?.user?.id||null}catch{return null}};
const admin=()=>typeof isAdmin!=='undefined'&&isAdmin;
const message=(text)=>{if($('mvpSaveInfo'))$('mvpSaveInfo').textContent=text;if($('mvpRetry'))$('mvpRetry').hidden=!text.startsWith('Lưu thất bại')};
const pending=()=>dirty||loading||conflictOpen;
window.addEventListener('beforeunload',e=>{if(pending()){e.preventDefault();e.returnValue=''}});
function ensure(){
 if($('mvpA'))return;
 const style=document.createElement('style');style.textContent='#mvpA{position:fixed;inset:3%;z-index:99999;background:white;overflow:auto;padding:24px;border:2px solid #19364e;border-radius:12px;box-shadow:0 0 0 100vmax #0008}#mvpA[hidden]{display:none}#mvpA .mvp-layout{display:grid;grid-template-columns:minmax(200px,1fr) 2fr;gap:20px}#mvpA textarea{width:100%;min-height:300px;padding:12px}#mvpA .mvp-item{display:block;width:100%;text-align:left;background:#f3f1ec;color:#19364e}#mvpA .mvp-item.active{background:#19364e;color:white}#mvpA .mvp-controls{display:flex;flex-wrap:wrap;gap:10px;align-items:center}#mvpA select{max-width:100%}@media(max-width:700px){#mvpA .mvp-layout{grid-template-columns:1fr}}';document.head.append(style);
 const box=document.createElement('div');box.id='mvpA';box.hidden=true;box.innerHTML='<div style="display:flex;justify-content:space-between"><h2>Trang A · Soạn thảo 7 nhiệm vụ</h2><button id="mvpClose">Đóng</button></div><p id="mvpInfo"></p><div class="mvp-layout"><nav id="mvpList"></nav><div><h3 id="mvpTitle"></h3><div class="mvp-controls"><label>Người phụ trách <select id="mvpOwner"></select></label><label>Trạng thái <select id="mvpStatus"></select></label><span id="mvpVersion"></span></div><textarea id="mvpContent" placeholder="Viết nội dung tiểu mục..."></textarea><p id="mvpSaveInfo"></p><button type="button" id="mvpRetry" hidden>Thử lại</button></div></div>';document.body.append(box);
 const dialog=document.createElement('div');dialog.id='mvpConflict';dialog.hidden=true;dialog.setAttribute('role','dialog');dialog.setAttribute('aria-modal','true');dialog.setAttribute('aria-label','Có người vừa sửa');dialog.innerHTML='<h3>Có người vừa sửa</h3><p>Bản trên máy chủ đã thay đổi. Bạn muốn xử lý thế nào?</p><button type="button" id="mvpSeeRemote">Xem bản mới</button><button type="button" id="mvpKeepMine">Giữ bản của tôi</button><button type="button" id="mvpCancelConflict">Hủy</button>';document.body.append(dialog);
 const conflictStyle=document.createElement('style');conflictStyle.textContent='#mvpConflict:not([hidden]){position:fixed;z-index:100001;top:35%;left:50%;transform:translateX(-50%);width:min(94vw,480px);background:white;border:2px solid #19364e;border-radius:12px;padding:24px;box-shadow:0 0 0 100vmax #0009}';document.head.append(conflictStyle);
 $('mvpClose').onclick=()=>{if(pending()){message('Có nội dung chưa lưu; hãy lưu hoặc xử lý xung đột trước khi đóng.');return}box.hidden=true};
 $('mvpContent').addEventListener('input',()=>{dirty=true;schedule()});
 $('mvpStatus').onchange=()=>{dirty=true;schedule()};
 $('mvpOwner').onchange=assignOwner;
 $('mvpRetry').onclick=()=>{if(dirty&&!loading)save()};
}
function renderList(){
 $('mvpList').innerHTML=rows.map(r=>'<button class="mvp-item '+(selected?.task_key===r.task_key&&selected?.subsection_key===r.subsection_key?'active':'')+'" data-task="'+r.task_key+'" data-sub="'+r.subsection_key+'">'+esc(r.task_key+'.'+r.subsection_key+' '+r.title)+' · '+esc(r.status)+'</button>').join('');
 $('mvpList').querySelectorAll('button').forEach(b=>b.onclick=()=>pick(Number(b.dataset.task),b.dataset.sub));
}
function pick(n,sub){
 if(pending()){message('Có thay đổi chưa lưu hoặc đang xử lý. Vui lòng thử lại sau.');return}
 selected=rows.find(r=>r.task_key===n&&(!sub||r.subsection_key===sub));if(!selected)return;
 renderList();$('mvpTitle').textContent=titles[selected.task_key-1]+' / '+selected.title;$('mvpContent').value=selected.content;
 $('mvpVersion').textContent='Phiên bản '+selected.version;
 $('mvpStatus').innerHTML=statuses.map(s=>'<option>'+s+'</option>').join('');$('mvpStatus').value=selected.status;
 const can=!!userId&&(admin()||(selected.owner_id===userId&&selected.status!=='Đã duyệt'));
 $('mvpContent').disabled=!can;$('mvpStatus').disabled=!can||(!admin()&&selected.status==='Đã duyệt');
 if(!admin())$('mvpStatus').querySelector('option[value="Đã duyệt"]').disabled=true;
 $('mvpOwner').disabled=!admin();$('mvpOwner').innerHTML='<option value="">Chưa giao</option>'+(profiles.map(p=>'<option value="'+esc(p.user_id)+'">'+esc(p.display_name||p.user_id)+'</option>').join(''));
 $('mvpOwner').value=selected.owner_id||'';
 $('mvpSaveInfo').textContent=can?'Tự lưu sau 1,2 giây':'Chỉ đọc — chưa được phân công';
}
function schedule(){clearTimeout(timer);if(!conflictOpen)timer=setTimeout(save,1200)}
function showConflict(r,data){
 conflictOpen=true;const dialog=$('mvpConflict');dialog.hidden=false;
 const close=()=>{dialog.hidden=true;conflictOpen=false};
 $('mvpSeeRemote').onclick=()=>{close();if(!Number.isSafeInteger(data.version)||typeof data.content!=='string'||!statuses.includes(data.status)){message('Không đọc được bản mới; bản đang gõ vẫn được giữ.');dirty=true;return}const draft=$('mvpContent').value;r.version=data.version;r.content=data.content;r.status=data.status;dirty=false;pick(r.task_key,r.subsection_key);$('mvpContent').dataset.mvpDraft=draft;message('Đã xem bản mới. Bản bạn gõ được giữ trong bộ nhớ phiên này; chưa lưu.');};
 $('mvpKeepMine').onclick=()=>{close();if(!Number.isSafeInteger(data.version)){dirty=true;message('Không có phiên bản máy chủ hợp lệ; không ghi đè.');return}r.version=data.version; // CAS lần nữa với version máy chủ vừa trả; nếu có thay đổi mới sẽ lại conflict
 // Không ghi đè nội dung người dùng có thể vừa gõ thêm trong khi hộp thoại mở.
 dirty=true;message('Đang lưu lại bản của bạn với phiên bản máy chủ mới nhất...');save()};
 $('mvpCancelConflict').onclick=()=>{close();dirty=true;message('Đã hủy xử lý xung đột. Chữ bạn đang gõ vẫn được giữ lại; chưa lưu.')};
}
async function save(){
 if(!selected||loading||!dirty||conflictOpen)return;
 const c=client();if(!c){message('Lưu thất bại – Thử lại (chưa kết nối Supabase). Nội dung vẫn còn.');return}
 loading=true;const r=selected,content=$('mvpContent').value,status=$('mvpStatus').value,version=r.version;
 if(!Number.isSafeInteger(version)||version<0){loading=false;message('Không xác định được phiên bản; không gửi yêu cầu lưu.');return}
 message('Đang lưu...');
 try{
  const {data,error}=await c.rpc('mvp_save_subsection',{p_task_key:r.task_key,p_subsection_key:r.subsection_key,p_expected_version:version,p_content:content,p_status:status});
  if(error){message('Lưu thất bại – Thử lại. '+error.message+' (nội dung vẫn còn)');return}
  switch(data?.result){
   case 'saved':
    r.version=data.version;r.content=content;r.status=data.status||status;
    dirty=$('mvpContent').value!==content||$('mvpStatus').value!==status;
    $('mvpVersion').textContent='Phiên bản '+r.version;message(dirty?'Đã lưu bản trước, đang lưu thay đổi mới...':'Đã lưu lúc '+new Date().toLocaleTimeString('vi-VN',{hour:'2-digit',minute:'2-digit'}));
    renderList();refreshBadges();break;
   case 'conflict':
    message('Có người vừa sửa. Vui lòng chọn cách xử lý.');
    showConflict(r,data);break;
   case 'forbidden':message('Không có quyền lưu tiểu mục này. Nội dung đang gõ vẫn được giữ lại.');break;
   case 'not_found':message('Tiểu mục không còn tồn tại. Không thể lưu; nội dung vẫn còn.');break;
   case 'invalid_status':message('Trạng thái không hợp lệ. Hãy chọn một trong bốn trạng thái.');break;
   default:message('Lưu thất bại – Thử lại (phản hồi không xác định). Nội dung vẫn còn.');
  }
 }catch(e){message('Lưu thất bại – Thử lại. '+(e?.message||'Mất kết nối')+'; nội dung vẫn còn.')}
 finally{loading=false;if(dirty&&!conflictOpen&&r.version!==version)schedule()}
}
async function assignOwner(){
 if(!admin()||!selected||loading||dirty){message('Hãy lưu nội dung trước khi giao người phụ trách.');return}
 const old=selected.owner_id,next=$('mvpOwner').value||null;
 let data,error;try{({data,error}=await client().from('mvp_subsections').update({owner_id:next}).eq('task_key',selected.task_key).eq('subsection_key',selected.subsection_key).select('owner_id').single())}catch(e){error=e}
 if(error){message('Không thể giao người phụ trách: '+error.message);$('mvpOwner').value=old||'';return}
 selected.owner_id=data.owner_id;
}
async function refresh(){
 if(pending())return;
 const c=client();if(!c){$('mvpInfo').textContent='Không thể kết nối Supabase. Vui lòng tải lại trang.';return}
 const uid=await currentUser();if(!uid){rows=[];userId=null;profiles=[];selected=null;clearTimeout(timer);dirty=false;$('mvpContent').value='';$('mvpInfo').textContent='Khách chưa đăng nhập: cần đăng nhập để xem và soạn thảo Trang A.';$('mvpList').replaceChildren();$('mvpTitle').textContent='Vui lòng đăng nhập';$('mvpContent').disabled=true;$('mvpStatus').disabled=true;$('mvpOwner').disabled=true;return}
 let data,error,loadedProfiles;try{const results=await Promise.all([c.from('mvp_subsections').select('*').order('task_key').order('subsection_key'),c.from('group_profiles').select('user_id,display_name,role')]);({data,error}=results[0]);loadedProfiles=results[1].data}catch(e){$('mvpInfo').textContent='Không tải được Trang A: '+(e?.message||'Lỗi mạng');return}
 if(error){$('mvpInfo').textContent='Không tải được: '+error.message;return}
 rows=data||[];profiles=loadedProfiles||[];userId=uid;
 $('mvpInfo').textContent=rows.length+' tiểu mục · '+rows.filter(r=>r.status==='Đã duyệt').length+' đã duyệt';
 dirty=false;renderList();pick(selected?.task_key||1,selected?.subsection_key);refreshBadges();
}
function refreshBadges(){
 document.querySelectorAll('#researchDetail .research-work-box').forEach(box=>{
  const page=typeof editingPageId!=='undefined'&&editingPageId?Number(editingPageId):Number(document.querySelector('#research .card.active')?.dataset?.pageId||0);
  const group=rows.filter(x=>x.task_key===page);if(!group.length)return;
  let b=box.querySelector('.mvpWorkBadge');if(!b){b=document.createElement('div');b.className='mvpWorkBadge';box.prepend(b)}
  const sum=summary(group);b.textContent='Tiến độ '+sum.percent+'% · '+sum.status;
 });
 document.querySelectorAll('#research .card').forEach((card,i)=>{
  const group=rows.filter(x=>x.task_key===i+1);if(!group.length)return;
  let badge=card.querySelector('.mvpBadge');if(!badge){badge=document.createElement('div');badge.className='mvpBadge';card.append(badge)}
  const sum=summary(group);badge.textContent='Tiến độ '+sum.percent+'% · '+sum.status;
  if(!card.querySelector('.mvpOpen')){const b=document.createElement('button');b.className='mvpOpen';b.textContent='Mở soạn thảo';b.onclick=e=>{e.stopPropagation();open(i+1)};card.append(b)}
 });
}
async function open(n){ensure();if(pending()){message('Có thay đổi chưa lưu. Vui lòng xử lý trước khi mở lại.');return}$('mvpA').hidden=false;$('mvpInfo').textContent='Đang tải...';selected=null;await refresh();if(n&&rows.length)pick(n)}
window.openMvpResearchA=open;
const boot=()=>{try{ensure();setInterval(async()=>{try{if(!$('app')||$('app').classList.contains('hidden'))return;if(rows.length){refreshBadges();return}if(initializing)return;initializing=true;await refresh()}catch(e){console.error('Trang A:',e)}finally{initializing=false}},3000)}catch(e){console.error('Trang A không khởi tạo được:',e)}};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();