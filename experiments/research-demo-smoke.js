/* Browser smoke checks for the in-memory research demo; no production data. */
(function(){
'use strict';
const results=[];
function check(name,condition){results.push({name,passed:!!condition});if(!condition)console.error('FAIL:',name)}
function run(){
 check('Editor UI available',typeof window.createResearchSubsectionUI==='function');
 check('Comparison UI available',typeof window.createResearchCompareUI==='function');
 check('Merge bridge available',typeof window.createResearchCompareBridge==='function');
 check('Preview UI available',typeof window.createResearchMergePreview==='function');
 check('Editor rendered',!!document.querySelector('.subsection-workspace textarea'));
 check('Three-column structure',!!document.querySelector('.sw-nav')&&!!document.querySelector('.sw-main')&&!!document.querySelector('.sw-side'));
 check('Two draft selection',!!document.querySelector('.subsection-workspace select option[value="1"]')&&!!document.querySelector('.subsection-workspace select option[value="2"]'));
 check('Comparison rendered',!!document.querySelector('.research-compare'));
 check('Preview rendered',!!document.querySelector('.research-merge-preview'));
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
