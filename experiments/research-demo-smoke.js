/* Browser smoke checks for the in-memory research demo; no production data. */
(function(){
'use strict';
const results=[];
function check(name,condition){results.push({name,passed:!!condition});if(!condition)console.error('FAIL:',name)}
function run(){
 results.length=0;
 check('Editor UI available',typeof window.createResearchSubsectionUI==='function');
 check('Comparison UI available',typeof window.createResearchCompareUI==='function');
 check('Merge bridge available',typeof window.createResearchCompareBridge==='function');
 check('Preview UI available',typeof window.createResearchMergePreview==='function');
 check('Editor rendered',!!document.querySelector('.subsection-workspace textarea'));
 check('Three-column structure',!!document.querySelector('.sw-nav')&&!!document.querySelector('.sw-main')&&!!document.querySelector('.sw-side'));
 check('Two draft selection',!!document.querySelector('.subsection-workspace select option[value="1"]')&&!!document.querySelector('.subsection-workspace select option[value="2"]'));
 check('Comparison rendered',!!document.querySelector('.research-compare'));
 check('Preview rendered',!!document.querySelector('.research-merge-preview'));
 if(typeof window.researchDiffForTests==='function'){
  const diff=window.researchDiffForTests;
  function scenario(name,a,b,expectedLeft,expectedRight){
   const left=document.createElement('pre'),right=document.createElement('pre');
   diff(a,b,left,right);
   check(name,left.querySelectorAll('.sw-diff-changed').length===expectedLeft&&right.querySelectorAll('.sw-diff-changed').length===expectedRight&&left.textContent.replace(/\n$/,'')===a&&right.textContent.replace(/\n$/,'')===b);
  }
  scenario('Identical Vietnamese lines','Tiếng Việt\nNghiên cứu','Tiếng Việt\nNghiên cứu',0,0);
  scenario('Changed survey count','Khảo sát 100 người','Khảo sát 150 người',1,1);
  scenario('Added line','A','A\nB',0,1);
  scenario('Removed line','A\nB','A',1,0);
  scenario('Multiple edits','A\nB\nC','A\nX\nC\nD',1,2);
  const left=document.createElement('pre'),right=document.createElement('pre');
  const long=Array(251).fill('dòng').join('\n');
  const message=diff(long,'ngắn',left,right);
  check('Long document fallback',message.includes('250')&&left.textContent===long&&right.textContent==='ngắn');
 }else check('Line diff available',false);
 const report=document.createElement('section');report.setAttribute('aria-label','Kết quả kiểm tra giao diện');
 const title=document.createElement('h2');title.textContent='Kiểm tra cấu trúc demo';
 const list=document.createElement('ul');
 results.forEach(r=>{const li=document.createElement('li');li.textContent=(r.passed?'ĐẠT: ':'LỖI: ')+r.name;list.append(li)});
 report.append(title,list);document.querySelector('main')?.append(report);
 console.table(results);return results;
}
window.runResearchDemoSmokeTests=run;
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',run,{once:true});else run();
})();
