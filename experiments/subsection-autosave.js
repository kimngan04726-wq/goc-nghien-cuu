/* Experimental autosave controller; opt-in only, no production integration. */
(function(global){
'use strict';
function createSubsectionAutosave({readSnapshot,saveSnapshot,onStatus=()=>{},delay=2000}){
 if(typeof readSnapshot!=='function'||typeof saveSnapshot!=='function')throw Error('Missing autosave callbacks');
 let timer=null,revision=0,saving=false,disposed=false,pending=false;
 const notify=message=>onStatus(message);
 const schedule=()=>{
  if(disposed)return;
  revision++;pending=true;clearTimeout(timer);
  notify('Có thay đổi chưa lưu');
  timer=setTimeout(flush,delay);
 };
 const flush=async()=>{
  if(disposed||!pending||saving)return;
  clearTimeout(timer);timer=null;
  const startRevision=revision;
  const snapshot=readSnapshot();
  if(!snapshot)return;
  saving=true;notify('Đang lưu...');
  try{
   const result=await saveSnapshot(snapshot);
   if(disposed)return;
   if(startRevision===revision){pending=false;notify('Đã lưu phiên bản '+(result?.saved_version??''));}
   else{pending=true;notify('Có thay đổi mới, đang chờ lưu tiếp');}
  }catch(error){
   if(!disposed){pending=true;notify('Chưa lưu được. Giữ nội dung và thử lại sau: '+(error?.message||error));}
  }finally{
   saving=false;
   if(!disposed&&pending&&startRevision!==revision){clearTimeout(timer);timer=setTimeout(flush,delay);}
  }
 };
 const dispose=()=>{disposed=true;clearTimeout(timer)};
 return {schedule,flush,dispose,get pending(){return pending},get saving(){return saving}};
}
global.createSubsectionAutosave=createSubsectionAutosave;
})(window);
