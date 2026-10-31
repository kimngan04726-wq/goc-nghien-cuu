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
 const css=document.createElement('link');css.rel='stylesheet';css.href=(document.querySelector('script[src*="trang-a.js"]')?.src||'mvp/trang-a.js').replace(/trang-a\\.js(?:\\?.*)?$/,'trang-a.css');document.head.append(css);
 const box=document.createElement('div');box.id='mvpA';box.hidden=true;box.innerHTML=`
 <header class="mvpA-top"><div><h2>📚 Nơi làm việc</h2><p>Quản lý, theo dõi tiến độ và phối hợp nghiên cứu theo từng nhóm nội dung.</p></div><div class="mvpA-illustration" aria-label="Minh họa sách và cây">🌿📚</div><button class="mvpA-btn" id="mvpClose">✕ Đóng</button></header>
 <p id="mvpInfo" class="mvpA-muted" role="status"></p>
 <main id="mvpWorkspace"><div class="mvpA-actions"><button class="mvpA-btn mvpA-primary" disabled title="Sắp có">＋ Thêm nhóm nội dung</button></div><div id="mvpCards"></div></main>
 <main id="mvpDetail" hidden><div class="mvpA-view-head"><button class="mvpA-btn mvpA-back" data-view="workspace">← Quay lại</button><h2 id="mvpDetailTitle"></h2></div>
 <section class="mvpA-surface"><div class="mvpA-section-head"><div><h3>📋 Mô tả công việc</h3><p class="mvpA-muted">Nội dung nghiên cứu được chia thành các tiểu mục để phối hợp biên soạn.</p></div><button id="mvpDescription" class="mvpA-btn mvpA-primary" disabled title="Sắp có" hidden>✎ Sửa mô tả (Admin)</button></div></section>
 <section class="mvpA-surface"><h3>📋 Các bản nháp / tiểu mục</h3><p class="mvpA-muted">Dữ liệu hiện tại lưu theo tiểu mục, chưa hỗ trợ nhiều bản nháp độc lập.</p><div class="mvpA-drafts" id="mvpDraftCards"></div></section>
 <div class="mvpA-actions center"><button class="mvpA-btn mvpA-primary" disabled title="Sắp có">★ Tổng hợp</button><button class="mvpA-btn mvpA-primary" data-view="compare">⇄ So sánh và lọc ý</button></div>
 <section class="mvpA-surface"><div class="mvpA-section-head"><div><h3>📘 Bài tổng hợp</h3><p class="mvpA-muted">Chưa có chức năng tạo bài tổng hợp riêng.</p></div><button class="mvpA-btn mvpA-primary" disabled title="Sắp có">✎ Mở soạn thảo bài tổng hợp</button></div></section></main>
 <main id="mvpEditor" hidden><div class="mvpA-view-head"><button class="mvpA-btn mvpA-back" data-view="detail">← Quay lại</button><h2 id="mvpTitle"></h2></div>
 <div class="mvpA-surface"><div class="mvpA-controls"><label>Người phụ trách <select id="mvpOwner"></select></label><label>Trạng thái <select id="mvpStatus"></select></label><span id="mvpVersion"></span><span id="mvpWordCount" class="mvpA-muted"></span><span id="mvpSaveInfo" role="status" aria-live="polite"></span><button type="button" id="mvpRetry" class="mvpA-btn" hidden>Thử lại</button><button class="mvpA-btn" disabled title="Sắp có">◷ Lịch sử</button><button class="mvpA-btn" disabled title="Sắp có">⇩ Xuất</button><button class="mvpA-btn mvpA-primary" id="mvpSaveButton" type="button">▣ Lưu</button></div></div>
 <div class="mvpA-editor"><section><h3>Mục lục</h3><nav id="mvpList"></nav><button class="mvpA-btn" disabled title="Sắp có">＋ Thêm tiểu mục</button></section>
 <section><div class="mvpA-toolbar" aria-label="Công cụ định dạng sắp có"><button disabled title="Sắp có">↶</button><button disabled title="Sắp có">↷</button><button disabled title="Sắp có">Times New Roman</button><button disabled title="Sắp có">12</button><button disabled title="Sắp có"><b>B</b></button><button disabled title="Sắp có"><i>I</i></button><button disabled title="Sắp có"><u>U</u></button><button disabled title="Sắp có">☷</button><button disabled title="Sắp có">☰</button><button disabled title="Sắp có">▦</button></div><div class="mvpA-paper"><textarea id="mvpContent" placeholder="Viết nội dung tiểu mục..." aria-label="Nội dung tiểu mục"></textarea></div></section>
 <section><div class="mvpA-tabs"><button class="mvpA-btn mvpA-primary">Bản nháp</button><button class="mvpA-btn" disabled title="Sắp có">Tài liệu</button><button class="mvpA-btn" disabled title="Sắp có">Ghi chú</button><button class="mvpA-btn" disabled title="Sắp có">Bình luận</button></div><h3>Bản nháp của người khác</h3><p class="mvpA-disabled-note">Chưa có dữ liệu bản nháp độc lập theo người.</p><button class="mvpA-btn" disabled title="Sắp có">Xem song song</button><button class="mvpA-btn" data-view="compare">⇄ So sánh và lọc ý</button></section></div></main>
 <main id="mvpCompareView" hidden><div class="mvpA-view-head"><button class="mvpA-btn mvpA-back" data-view="detail">← Quay lại</button><h2 id="mvpCompareTitle"></h2></div><p>Chọn đoạn ý hay từ các bản nháp và đưa sang bài tổng hợp.</p><div class="mvpA-actions"><button class="mvpA-btn mvpA-primary" disabled title="Sắp có">✦ Tự động gợi ý</button></div><div class="mvpA-compare"><section><h3>📋 Nội dung tiểu mục</h3><div id="mvpCompareSource"></div></section><section><h3>📋 Bản nháp 2</h3><p class="mvpA-disabled-note">Chưa có bản nháp độc lập thứ hai.</p></section><section><h3>📗 Bài tổng hợp (đang xây dựng)</h3><p class="mvpA-disabled-note">Chưa có chức năng chuyển đoạn ý.</p></section></div><p class="mvpA-disabled-note">☑ Đã đưa sang bài tổng hợp　□ Chưa đưa sang　ⓘ Dấu ✓ chống trùng lặp sẽ có khi chức năng tổng hợp được xây dựng.</p></main>`;document.body.append(box);
 box.querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>showView(b.dataset.view));
 $('mvpSaveButton').onclick=()=>{if(dirty&&!loading)save()};
 $('mvpContent').addEventListener('input',()=>{$('mvpWordCount').textContent=wordCount($('mvpContent').value)+' từ'});
 const dialog=document.createElement('div');dialog.id='mvpConflict';dialog.hidden=true;dialog.setAttribute('role','dialog');dialog.setAttribute('aria-modal','true');dialog.setAttribute('aria-label','Có người vừa sửa');dialog.innerHTML='<h3>Có người vừa sửa</h3><p>Bản trên máy chủ đã thay đổi. Bạn muốn xử lý thế nào?</p><section id="mvpCompare" hidden><p><strong>Bản trên máy chủ (chỉ xem)</strong></p><pre id="mvpRemotePreview"></pre><p><strong>Bản bạn đang gõ (không bị thay đổi)</strong></p><pre id="mvpLocalPreview"></pre></section><button type="button" id="mvpSeeRemote">Xem bản mới</button><button type="button" id="mvpKeepMine">Giữ bản của tôi</button><button type="button" id="mvpCancelConflict">Hủy</button>';document.body.append(dialog);
 $('mvpClose').onclick=()=>{if(pending()){message('Có nội dung chưa lưu; hãy lưu hoặc xử lý xung đột trước khi đóng.');return}box.hidden=true};
 $('mvpContent').addEventListener('input',()=>{dirty=true;schedule()});
 $('mvpStatus').onchange=()=>{dirty=true;schedule()};
 $('mvpOwner').onchange=assignOwner;
 $('mvpRetry').onclick=()=>{if(dirty&&!loading)save()};
}
const wordCount=text=>String(text||'').trim().split(/\\s+/).filter(Boolean).length;
let mvpView='workspace',mvpTask=1;
function showView(view){if(view==='workspace'&&pending()){message('Có nội dung chưa lưu; hãy xử lý trước khi quay lại.');return}if(view==='detail'&&pending()){message('Có nội dung chưa lưu; hãy xử lý trước khi quay lại.');return}mvpView=view;['mvpWorkspace','mvpDetail','mvpEditor','mvpCompareView'].forEach((id,i)=>$(id).hidden!==undefined&&($(id).hidden=['workspace','detail','editor','compare'][i]!==view));if(view==='detail')renderDetail();if(view==='compare')renderCompare()}
function renderCards(){
 const groups=[rows.filter(r=>r.task_key<=3),rows.filter(r=>r.task_key>=4)];
 $('mvpCards').innerHTML=groups.map((group,i)=>'<section class="mvpA-surface"><h3 class="mvpA-group-title">📖 Nhóm nội dung '+(i+1)+'</h3><div class="mvpA-grid">'+[...new Set(group.map(r=>r.task_key))].map(task=>{const rs=rows.filter(r=>r.task_key===task),sum=summary(rs),cls=sum.status==='Đã duyệt'?'approved':sum.status==='Đang viết'?'writing':'';return '<button type="button" class="mvpA-card" data-task="'+task+'"><div class="mvpA-cover" aria-hidden="true">'+['📚','✍️','📖','📊','💻','📝','🏛️'][task-1]+'</div><div class="mvpA-card-body"><div class="mvpA-card-name">▤ '+esc(titles[task-1])+'</div><div class="mvpA-card-foot"><span class="mvpA-chip '+cls+'">'+esc(sum.status)+'</span><span>···</span></div><div class="mvpA-progress"><span class="'+cls+'" style="width:'+sum.percent+'%"></span></div><div style="text-align:right;font-size:12px">'+sum.percent+'%</div></div></button>'}).join('')+'</div></section>').join('');
 $('mvpCards').querySelectorAll('[data-task]').forEach(b=>b.onclick=()=>{mvpTask=Number(b.dataset.task);renderDetail();showView('detail')});
}
function renderDetail(){
 const group=rows.filter(r=>r.task_key===mvpTask);$('mvpDetailTitle').textContent='📚 '+titles[mvpTask-1];$('mvpDescription').hidden=!admin();
 $('mvpDraftCards').innerHTML=group.map(r=>{const owner=profiles.find(p=>p.user_id===r.owner_id);return '<article class="mvpA-draft"><h3>📋 '+esc(r.subsection_key+' · '+r.title)+'</h3><p>👤 Người phụ trách: <span class="mvpA-chip">'+esc(owner?.display_name||'Chưa giao')+'</span></p><p>▣ Nội dung: '+esc((r.content||'Chưa có nội dung').slice(0,110))+'</p><p class="mvpA-muted">Trạng thái: '+esc(r.status)+' · Phiên bản '+r.version+'</p><button class="mvpA-btn mvpA-primary" data-task="'+r.task_key+'" data-sub="'+esc(r.subsection_key)+'">✎ Mở soạn thảo</button> <button class="mvpA-btn" disabled title="Sắp có">▣</button> <button class="mvpA-btn" disabled title="Sắp có">📁</button></article>'}).join('');
 $('mvpDraftCards').querySelectorAll('button[data-sub]').forEach(b=>b.onclick=()=>{pick(Number(b.dataset.task),b.dataset.sub);if(selected?.subsection_key===b.dataset.sub)showView('editor')});
}
function renderCompare(){
 $('mvpCompareTitle').textContent='⇄ So sánh và lọc ý – '+titles[mvpTask-1];
 const rs=rows.filter(r=>r.task_key===mvpTask);$('mvpCompareSource').innerHTML=rs.map(r=>'<p><label><input type="checkbox" disabled title="Sắp có"> <span>'+esc(r.title+': '+(r.content||'Chưa có nội dung').slice(0,180))+'</span></label></p>').join('');
}
function renderList(){
 $('mvpList').innerHTML=rows.filter(r=>r.task_key===selected?.task_key).map(r=>'<button class="mvp-item '+(selected?.task_key===r.task_key&&selected?.subsection_key===r.subsection_key?'active':'')+'" data-task="'+r.task_key+'" data-sub="'+r.subsection_key+'">☐ '+esc(r.subsection_key+' '+r.title)+'</button>').join('');
 $('mvpList').querySelectorAll('button').forEach(b=>b.onclick=()=>pick(Number(b.dataset.task),b.dataset.sub));
 renderCards();
}
function pick(n,sub){
 if(pending()){message('Có thay đổi chưa lưu hoặc đang xử lý. Vui lòng thử lại sau.');return}
 selected=rows.find(r=>r.task_key===n&&(!sub||r.subsection_key===sub));if(!selected)return;
 renderList();$('mvpTitle').textContent=titles[selected.task_key-1]+' / '+selected.title;$('mvpContent').value=selected.content;
 $('mvpVersion').textContent='Phiên bản '+selected.version; $('mvpWordCount').textContent=wordCount(selected.content)+' từ'; mvpTask=selected.task_key;
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
 conflictOpen=true;const dialog=$('mvpConflict');$('mvpCompare').hidden=true;dialog.hidden=false;
 const close=()=>{dialog.hidden=true;conflictOpen=false};
 $('mvpSeeRemote').onclick=()=>{if(typeof data.content!=='string'){message('Không đọc được bản mới; chữ đang gõ vẫn được giữ.');return}$('mvpRemotePreview').textContent=data.content;$('mvpLocalPreview').textContent=$('mvpContent').value;$('mvpCompare').hidden=false;message('Đang so sánh hai bản; chữ bạn gõ không bị thay đổi.')};
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
async function open(n){ensure();if(pending()){message('Có thay đổi chưa lưu. Vui lòng xử lý trước khi mở lại.');return}$('mvpA').hidden=false;$('mvpInfo').textContent='Đang tải...';selected=null;await refresh();if(n&&rows.length){pick(n);mvpTask=n;showView('detail')}else showView('workspace')}
window.openMvpResearchA=open;
const boot=()=>{try{ensure();setInterval(async()=>{try{if(!$('app')||$('app').classList.contains('hidden'))return;if(rows.length){refreshBadges();return}if(initializing)return;initializing=true;await refresh()}catch(e){console.error('Trang A:',e)}finally{initializing=false}},3000)}catch(e){console.error('Trang A không khởi tạo được:',e)}};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();