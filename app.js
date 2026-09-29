const STORAGE="dev-curriculum-progress-v1";
let curriculum=[];
let progress=JSON.parse(localStorage.getItem(STORAGE)||"{}");
const $=id=>document.getElementById(id);

const fallback=[
["M001","01 Foundations",1,"JavaScript Runtime","Execution context, call stack, heap, event loop","Explain how JS code moves through the runtime instead of treating async behavior as magic.",6,"Deepen","MDN JavaScript Guide|https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide"],
["M002","01 Foundations",1,"JavaScript Runtime","Microtasks vs macrotasks; promises; async/await","Predict execution order for mixed sync, promise, timer, and async code.",5,"Deepen","MDN Promise|https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise"],
["M003","01 Foundations",2,"JavaScript Internals","Closures, lexical environments, prototypes","Explain closures and prototype lookup from first principles.",6,"Deepen","MDN Closures|https://developer.mozilla.org/en-US/docs/Web/JavaScript/Closures"],
["M004","01 Foundations",2,"JavaScript Internals","Garbage collection and memory leaks","Identify common browser/Node memory retention patterns.",5,"Deepen","MDN Memory Management|https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Memory_management"],
["M005","01 Foundations",3,"Algorithms","Big-O, amortized analysis, trade-offs","Estimate time and space complexity before implementing a solution.",5,"Core","MIT 6.006|https://ocw.mit.edu/courses/6-006-introduction-to-algorithms-fall-2011/"],
["M006","01 Foundations",3,"Data Structures","Hash tables, stacks, queues, trees, heaps","Choose data structures based on operations rather than familiarity.",6,"Core","VisuAlgo|https://visualgo.net/en"],
["M007","01 Foundations",4,"Computer Architecture","CPU, memory hierarchy, cache locality","Understand why memory access patterns can dominate performance.",5,"New","CS:APP|https://csapp.cs.cmu.edu/"],
["M008","01 Foundations",4,"Concurrency","Processes, threads, race conditions, synchronization","Distinguish concurrency from parallelism and reason about races.",6,"New","MDN Web Workers|https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API"]
].map(r=>({ID:r[0],Phase:r[1],Week:r[2],Module:r[3],Topic:r[4],Outcome:r[5],Hours:r[6],Level:r[7],Resources:r[8]}));

function esc(v){return String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]))}
function state(x){return progress[x.ID]||{status:"Not Started",notes:""}}

function parseCSV(text){
 const rows=[];let row=[],cell="",quoted=false;
 for(let i=0;i<text.length;i++){
  const c=text[i],next=text[i+1];
  if(c==='"'&&quoted&&next==='"'){cell+='"';i++;continue}
  if(c==='"'){quoted=!quoted;continue}
  if(c===","&&!quoted){row.push(cell);cell="";continue}
  if((c==="\n"||c==="\r")&&!quoted){
   if(c==="\r"&&next==="\n")i++;
   row.push(cell);cell="";
   if(row.some(v=>v.trim()!==""))rows.push(row);
   row=[];continue
  }
  cell+=c
 }
 if(cell!==""||row.length){row.push(cell);if(row.some(v=>v.trim()!==""))rows.push(row)}
 if(!rows.length)return [];
 const headers=rows.shift().map(v=>v.trim());
 return rows.map(r=>Object.fromEntries(headers.map((h,i)=>[h,(r[i]??"").trim()])));
}

function normalizeRows(rows){
 return rows.map((x,i)=>({
  ID:x.ID||x.id||`M${String(i+1).padStart(3,"0")}`,
  Phase:x.Phase||x.phase||"01 Foundations",
  Week:Number(x.Week||x.week||1),
  Module:x.Module||x.module||"",
  Topic:x.Topic||x.topic||"",
  Outcome:x.Outcome||x.outcome||"",
  Hours:Number(x.Hours||x.hours||0),
  Level:x.Level||x.level||"Core",
  Resources:x.Resources||x.resources||""
 })).filter(x=>x.Topic||x.Module)
}

async function load(){
 if(window.CURRICULUM_API_URL){
  try{
   const response=await fetch(window.CURRICULUM_API_URL,{cache:"no-store"});
   if(!response.ok)throw new Error("HTTP "+response.status);
   const text=await response.text();
   const rows=parseCSV(text);
   curriculum=normalizeRows(rows);
   if(!curriculum.length)throw new Error("No curriculum rows found");
   $("sourceState").textContent="Live curriculum loaded from Google Sheets";
   render();
   return;
  }catch(error){console.warn("Curriculum source unavailable:",error)}
 }
 useFallback();
}

function useFallback(){
 curriculum=fallback;
 $("sourceState").textContent="Demo curriculum active — connect Google Sheets in config.js.";
 render();
}

function renderFilters(){
 const ps=[...new Set(curriculum.map(x=>x.Phase))];
 $("phase").innerHTML='<option value="">All phases</option>'+ps.map(p=>'<option>'+esc(p)+'</option>').join("");
}

function render(){
 renderFilters();
 const q=$("search").value.toLowerCase(),ph=$("phase").value,st=$("status").value,lv=$("level").value;
 const data=curriculum.filter(x=>{
  const s=state(x),hay=[x.Module,x.Topic,x.Outcome,x.Phase].join(" ").toLowerCase();
  return(!q||hay.includes(q))&&(!ph||x.Phase===ph)&&(!st||s.status===st)&&(!lv||x.Level===lv)
 });
 if(!data.length){
  $("curriculum").innerHTML='<div class="empty">No lessons match your filters.</div>';
  stats();return;
 }
 const phases=[...new Set(data.map(x=>x.Phase))];
 $("curriculum").innerHTML=phases.map(p=>{
  const items=data.filter(x=>x.Phase===p),weeks=[...new Set(items.map(x=>x.Week))];
  return '<section><h2 class="phase">'+esc(p)+' <small>'+items.length+' lessons</small></h2>'+
   weeks.map(w=>{
    const a=items.filter(x=>x.Week===w),d=a.filter(x=>state(x).status==="Completed").length,h=a.reduce((n,x)=>n+Number(x.Hours||0),0);
    return '<div class="week"><div class="week-head"><span class="week-title">Week '+esc(w)+'</span><span class="week-meta">'+d+'/'+a.length+' complete · '+h+'h planned</span></div>'+a.map(lesson).join("")+'</div>'
   }).join("")+'</section>'
 }).join("");
 stats();
}

function lesson(x){
 const s=state(x),links=String(x.Resources||"").split(";").filter(Boolean).map(v=>{
  const [n,u]=v.split("|");
  return '<a class="resource" target="_blank" rel="noopener" href="'+esc(u)+'">'+esc(n)+'</a>'
 }).join("");
 return '<article class="lesson '+(s.status==="Completed"?"completed":"")+'" data-id="'+esc(x.ID)+'">'+
  '<input class="check" type="checkbox" aria-label="Mark '+esc(x.Topic)+' as completed" '+(s.status==="Completed"?"checked":"")+' onchange="toggle(\''+esc(x.ID)+'\',this.checked)">'+
  '<div><div class="lesson-module">'+esc(x.Module)+'</div><div class="lesson-title">'+esc(x.Topic)+'</div><div class="lesson-outcome">'+esc(x.Outcome)+'</div><div class="resources">'+links+'</div></div>'+
  '<div class="lesson-actions"><span class="badge">'+esc(x.Level)+'</span><span class="badge">'+Number(x.Hours||0)+'h</span><button class="note-btn" onclick="notes(\''+esc(x.ID)+'\')">Notes</button></div>'+
  '<textarea class="notes" aria-label="Notes for '+esc(x.Topic)+'" placeholder="What did you learn? What confused you?">'+esc(s.notes)+'</textarea></article>'
}

function toggle(id,on){
 progress[id]={...(progress[id]||{}),status:on?"Completed":"In Progress",completedAt:on?new Date().toISOString():""};
 localStorage.setItem(STORAGE,JSON.stringify(progress));render();
}

function notes(id){
 const e=document.querySelector('[data-id="'+CSS.escape(id)+'"]');
 e.classList.toggle("expanded");
 const t=e.querySelector(".notes");
 t.oninput=()=>{progress[id]={...(progress[id]||{}),notes:t.value};localStorage.setItem(STORAGE,JSON.stringify(progress))}
}

function stats(){
 const total=curriculum.length,done=curriculum.filter(x=>state(x).status==="Completed"),th=curriculum.reduce((n,x)=>n+Number(x.Hours||0),0),dh=done.reduce((n,x)=>n+Number(x.Hours||0),0),pct=total?Math.round(done.length/total*100):0;
 $("overall").textContent=pct+"%";$("completed").textContent=done.length+" / "+total;$("hours").textContent=dh+" / "+th;$("progressFill").style.width=pct+"%";
 const cur=curriculum.find(x=>state(x).status!=="Completed");$("currentWeek").textContent=cur?cur.Week:"—";
}

["search","phase","status","level"].forEach(id=>$(id).addEventListener("input",render));
$("exportBtn").onclick=()=>{const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([JSON.stringify(progress,null,2)],{type:"application/json"}));a.download="curriculum-progress.json";a.click();URL.revokeObjectURL(a.href)};
$("resetBtn").onclick=()=>{if(confirm("Reset all local progress?")){progress={};localStorage.removeItem(STORAGE);render()}};
load();