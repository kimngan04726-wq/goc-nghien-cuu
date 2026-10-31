/* Trang A MVP — chỉ dùng bảng mvp_subsections; không ghi vào bảng cũ */
(function(){
'use strict';
const titles=['Lý do chọn đề tài','Mục đích, mục tiêu và câu hỏi nghiên cứu','Cơ sở lý thuyết','Mô hình nghiên cứu và giả thuyết','Các biến nghiên cứu','Thang đo và phương án đo lường','Các nội dung khác'];
const statuses=['Chưa viết','Đang viết','Chờ duyệt','Đã duyệt'];
let rows=[],selected=null,dirty=false,timer=null,loading=false;
const $=id=>document.getElementById(id);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const client=()=>typeof db!=='undefined'?db:null;
const currentUser=async()=>{const {data}=await client().auth.getUser();return data?.user?.id};
const admin=()=>typeof isAdmin!=='undefined'&&isAdmin;
function ensure(){
 if($('mvpA'))return;
 const style=document.createElement('style');style.textContent='#mvpA{position:fixed;inset:3%;z-index:99999;background:white;overflow:auto;padding:24px;border:2px solid #19364e;border-radius:12px;box-shadow:0 0 0 100vmax #0008}#mvpA[hidden]{display:none}#mvpA .mvp-layout{display:grid;grid-template-columns:minmax(200px,1fr) 2fr;gap:20px}#mvpA textarea{width:100%;min-height:300px;padding:12px}#mvpA .mvp-item{display:block;width:100%;text-align:left;background:#f3f1ec;color:#19364e}#mvpA .mvp-item.active{background:#19364e;color:white}#mvpA .mvp-controls{display:flex;flex-wrap:wrap;gap:10px;align-items:center}#mvpA select{max-width:100%}@media(max-width:700px){#mvpA .mvp-layout{grid-template-columns:1fr}}';document.head.append(style);
 const box=document.createElement('div');box.id='mvpA';box.hidden=true;box.innerHTML='<div style="display:flex;justify-content:space-between"><h2>Trang A · Soạn thảo 7 nhiệm vụ</h2><button id="mvpClose">Đóng</button></div><p id="mvpInfo"></p><div class="mvp-layout"><nav id="mvpList"></nav><div><h3 id="mvpTitle"></h3><div class="mvp-controls"><label>Người phụ trách <select id="mvpOwner"></select></label><label>Trạng thái <select id="mvpStatus"></select></label><span id="mvpVersion"></span></div><textarea id="mvpContent" placeholder="Viết nội dung tiểu mục..."></textarea><p id="mvpSaveInfo"></p></div></div>';document.body.append(box);
 $('mvpClose').onclick=()=>{if(dirty&&!confirm('Có nội dung chưa lưu. Đóng?'))return;box.hidden=true};
 $('mvpContent').addEventListener('input',()=>{dirty=true;schedule()});
 $('mvpStatus').onchange=()=>{dirty=true;schedule()};
 $('mvpOwner').onchange=assignOwner;
}
function renderList(){
 $('mvpList').innerHTML=rows.map(r=>'<button class="mvp-item '+(selected?.task_key===r.task_key?'active':'')+'" data-task="'+r.task_key+'">'+esc(r.task_key+'. '+r.title)+' · '+esc(r.status)+'</button>').join('');
 $('mvpList').querySelectorAll('button').forEach(b=>b.onclick=()=>pick(Number(b.dataset.task)));
}
function pick(n){
 if(dirty){alert('Đang có thay đổi chưa lưu. Vui lòng chờ lưu xong.');return}
 selected=rows.find(r=>r.task_key===n);if(!selected)return;
 renderList();$('mvpTitle').textContent=selected.title;$('mvpContent').value=selected.content;
 $('mvpVersion').textContent='Phiên bản '+selected.version;
 $('mvpStatus').innerHTML=statuses.map(s=>'<option>'+s+'</option>').join('');$('mvpStatus').value=selected.status;
 const can=admin()||selected.owner_id===window.mvpUserId;
 $('mvpContent').disabled=!can;$('mvpStatus').disabled=!can||(!admin()&&selected.status==='Đã duyệt');
 if(!admin())$('mvpStatus').querySelector('option[value="Đã duyệt"]').disabled=true;
 $('mvpOwner').disabled=!admin();$('mvpOwner').innerHTML='<option value="">Chưa giao</option>'+((window.mvpProfiles||[]).map(p=>'<option value="'+esc(p.user_id)+'">'+esc(p.display_name||p.user_id)+'</option>').join(''));
 $('mvpOwner').value=selected.owner_id||'';
 $('mvpSaveInfo').textContent=can?'Tự lưu sau 1,2 giây':'Chỉ đọc — chưa được phân công';
}
function schedule(){clearTimeout(timer);timer=setTimeout(save,1200)}
async function save(){
 if(!selected||loading||!dirty)return;loading=true;
 const r=selected,content=$('mvpContent').value,status=$('mvpStatus').value,version=r.version;
 $('mvpSaveInfo').textContent='Đang lưu...';
 const {data,error}=await client().rpc('mvp_save_subsection',{p_task_key:r.task_key,p_subsection_key:r.subsection_key,p_expected_version:version,p_content:content,p_status:status});
 loading=false;
 if(error){$('mvpSaveInfo').textContent='Lưu lỗi: '+error.message;return}
 if(data?.result==='conflict'){
  $('mvpSaveInfo').textContent='Có người vừa sửa';
  const choice=prompt('Có người vừa sửa. Chọn: 1 = Xem bản mới / 2 = Giữ bản của tôi / 3 = Hủy','1');
  if(choice==='1'){r.version=data.version;r.content=data.content;r.status=data.status;dirty=false;pick(r.task_key)}
  else if(choice==='2'){r.version=data.version;dirty=true;schedule()}
  else $('mvpSaveInfo').textContent='Đã hủy thao tác. Bản của bạn vẫn ở ô soạn thảo';
  return;
 }
 if(data?.result!=='saved'){$('mvpSaveInfo').textContent='Không lưu: '+(data?.result||'không rõ');return}
 r.version=data.version;r.content=content;r.status=status;
 dirty=$('mvpContent').value!==content||$('mvpStatus').value!==status;
 $('mvpVersion').textContent='Phiên bản '+r.version;$('mvpSaveInfo').textContent='Đã lưu';
 renderList();refreshBadges();if(dirty)schedule();
}
async function assignOwner(){
 if(!admin()||!selected)return;
 const old=selected.owner_id,next=$('mvpOwner').value||null;
 const {data,error}=await client().from('mvp_subsections').update({owner_id:next}).eq('task_key',selected.task_key).eq('subsection_key',selected.subsection_key).select('owner_id').single();
 if(error){alert('Không thể giao: '+error.message);$('mvpOwner').value=old||'';return}
 selected.owner_id=data.owner_id;
}
async function refresh(){
 const c=client();if(!c)return;
 const [{data,error},{data:profiles}]=await Promise.all([c.from('mvp_subsections').select('*').order('task_key'),c.from('group_profiles').select('user_id,display_name,role')]);
 if(error){$('mvpInfo').textContent='Không tải được: '+error.message;return}
 rows=data||[];window.mvpProfiles=profiles||[];window.mvpUserId=await currentUser();
 $('mvpInfo').textContent=rows.length+' tiểu mục · '+rows.filter(r=>r.status==='Đã duyệt').length+' đã duyệt';
 dirty=false;renderList();pick(selected?.task_key||1);refreshBadges();
}
function refreshBadges(){
 document.querySelectorAll('#researchDetail .research-work-box').forEach(box=>{
  const page=typeof editingPageId!=='undefined'&&editingPageId?Number(editingPageId):Number(document.querySelector('#research .card.active')?.dataset?.pageId||0);
  const r=rows.find(x=>x.task_key===page);if(!r)return;
  let b=box.querySelector('.mvpWorkBadge');if(!b){b=document.createElement('div');b.className='mvpWorkBadge';box.prepend(b)}
  b.textContent='Tiến độ '+(r.status==='Đã duyệt'?'100':'0')+'% · '+r.status;
 });
 document.querySelectorAll('#research .card').forEach((card,i)=>{
  const r=rows.find(x=>x.task_key===i+1);if(!r)return;
  let badge=card.querySelector('.mvpBadge');if(!badge){badge=document.createElement('div');badge.className='mvpBadge';card.append(badge)}
  badge.textContent=(r.status==='Đã duyệt'?'100':'0')+'% · '+r.status;
  if(!card.querySelector('.mvpOpen')){const b=document.createElement('button');b.className='mvpOpen';b.textContent='Mở soạn thảo';b.onclick=e=>{e.stopPropagation();open(i+1)};card.append(b)}
 });
}
async function open(n){ensure();$('mvpA').hidden=false;$('mvpInfo').textContent='Đang tải...';selected=null;await refresh();if(n)pick(n)}
window.openMvpResearchA=open;
document.addEventListener('DOMContentLoaded',()=>{ensure();setInterval(()=>{if($('app')&&!$('app').classList.contains('hidden')&&rows.length)refreshBadges()},3000)});
})();