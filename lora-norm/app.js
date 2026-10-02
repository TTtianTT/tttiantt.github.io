'use strict';
const NS = 'http://www.w3.org/2000/svg';
const BLUE = '#244be6', GRAY = '#aab5c9', LINE = '#e6eaf2';
const $ = id => document.getElementById(id);
const sum = values => values.reduce((a,b) => a+b,0);
const clamp = x => Math.max(0,Math.min(1,x));
const ease = x => {x=clamp(x);return x*x*(3-2*x);};
function svgNode(tag,attrs={},text) {
  const node=document.createElementNS(NS,tag);
  Object.entries(attrs).forEach(([key,value])=>node.setAttribute(key,String(value)));
  if(text!==undefined)node.textContent=text;
  return node;
}
function append(svg,tag,attrs,text){const node=svgNode(tag,attrs,text);svg.append(node);return node;}
const sigma=[.35,.18,.12,.08,.06,.045,.035,.028,.024,.02,.016,.014,.011,.009,.005,.003];
const fast=x=>x*(3.4445-4.7750*x*x+2.0315*x**4);
const stable=x=>x*(2-1.5*x*x+.5*x**4);
const norm=Math.max(Math.hypot(...sigma),1e-7);
const stageNames=['Trained LoRA','L₂ normalization','Fast · 1 / 4','Fast · 2 / 4','Fast · 3 / 4','Fast · 4 / 4','Stable · 1 / 1','Restore nuclear mass'];
const stages=[sigma.slice(),sigma.map(x=>x/norm)];
for(let i=0;i<4;i++)stages.push(stages.at(-1).map(fast));
stages.push(stages.at(-1).map(x=>Math.max(stable(x),0)));
stages.push(stages.at(-1).map(x=>x*sum(sigma)/sum(stages.at(-1))));
const stageDuration=[1800,1500,1400,1400,1400,1400,1800,3000];
const stageOffsets=stageDuration.map((_,i)=>sum(stageDuration.slice(0,i)));
const cycle=sum(stageDuration);
const reducedMotion=window.matchMedia('(prefers-reduced-motion: reduce)');
let moving=!reducedMotion.matches;
let spectrumTime=0,manualStage=null,lastStage=-1,currentGains=sigma.slice(),spectrumGeometry;
let summaryTime=0,diagnosticTime=0,taskTime=0;
let model='qwen',metric='target';
const visible={spectrum:false,summary:false,task:false,diagnostics:false};
const summaryNodes=[];
const diagnosticNodes=[];
let taskBars=[];
const stageButtons=stageNames.map((name,i)=>{
  const button=document.createElement('button');
  button.textContent=['0','N','1','2','3','4','S','R'][i];
  button.setAttribute('title',name);button.setAttribute('aria-label',name);button.setAttribute('aria-pressed','false');
  button.addEventListener('click',()=>{manualStage=i;currentGains=stages[i].slice();drawSpectrum(currentGains,i);});
  $('stage-buttons').append(button);return button;
});
function buildSpectrum(){
  const narrow=window.innerWidth<=600;
  const W=narrow?420:900,H=300,left=narrow?43:54,right=narrow?12:22,top=28,bottom=244;
  const chart=$('spectrum');chart.replaceChildren();chart.setAttribute('viewBox',`0 0 ${W} ${H}`);
  append(chart,'title',{id:'spectrum-title'},'LoRA-Norm gain transformation');
  append(chart,'desc',{id:'spectrum-desc'},'Schematic rank-16 gains through L2 normalization, four fast steps, one stable step, and nuclear-mass restoration. U and V stay fixed.');
  const y=value=>bottom-(Math.log10(Math.max(value,1e-3))+3)/(Math.log10(2)+3)*(bottom-top);
  [.001,.01,.1,1].forEach(value=>{
    const yy=y(value);append(chart,'line',{x1:left,y1:yy,x2:W-right,y2:yy,stroke:LINE});
    append(chart,'text',{x:left-10,y:yy+4,'text-anchor':'end','font-size':narrow?16:13},String(value));
  });
  const step=(W-left-right)/16,bw=step*.63;
  const bars=sigma.map((value,i)=>{
    const x=left+step*i+(step-bw)/2;
    append(chart,'rect',{x,y:y(value),width:bw,height:bottom-y(value),fill:'none',stroke:'#bbc5d8','stroke-width':1.2,rx:1});
    return append(chart,'rect',{x,y:y(value),width:bw,height:bottom-y(value),fill:BLUE,'fill-opacity':.77,rx:1});
  });
  [0,3,7,11,15].forEach(i=>append(chart,'text',{x:left+step*(i+.5),y:bottom+24,'text-anchor':'middle','font-size':narrow?16:13},String(i+1)));
  append(chart,'text',{x:(left+W-right)/2,y:bottom+48,'text-anchor':'middle','font-size':narrow?16:13},'Source direction');
  spectrumGeometry={bars,y,bottom};
  drawSpectrum(currentGains,lastStage<0?0:lastStage);
}
function drawSpectrum(values,index){
  const {bars,y,bottom}=spectrumGeometry;
  bars.forEach((bar,i)=>{const yy=y(values[i]);bar.setAttribute('y',yy);bar.setAttribute('height',bottom-yy);});
  $('mass-value').textContent=sum(values).toFixed(3);
  $('mass-status').textContent=index===7?(Math.abs(sum(values)-sum(sigma))<1e-6?'restored':'restoring'):'';
  if(index!==lastStage){
    lastStage=index;$('stage-name').textContent=stageNames[index];
    $('gain-symbol').textContent=index===0?'σ':index===7?'t':'x';
    stageButtons.forEach((button,i)=>{button.classList.toggle('active',i===index);button.setAttribute('aria-pressed',String(i===index));});
  }
}
function spectralFrame(){
  if(manualStage!==null)return;
  const within=spectrumTime%cycle;
  let index=stageOffsets.findLastIndex(offset=>within>=offset);
  const local=within-stageOffsets[index];
  const from=index===0?(spectrumTime<cycle?stages[0]:stages[7]):stages[index-1];
  const to=stages[index];
  const p=ease(local/650);
  currentGains=to.map((value,i)=>from[i]+(value-from[i])*p);
  drawSpectrum(currentGains,index);
}
$('replay-spectrum').addEventListener('click',()=>{
  manualStage=null;spectrumTime=0;lastStage=-1;
  if(!moving){manualStage=7;currentGains=stages[7].slice();drawSpectrum(currentGains,7);}
  else spectralFrame();
});
function buildSummary(){
  summaryNodes.length=0;
  ['target','off','fg'].forEach(key=>{
    const svg=$('summary-'+key);svg.replaceChildren();
    append(svg,'line',{x1:18,y1:33,x2:282,y2:33,stroke:LINE,'stroke-width':2});
    const track=append(svg,'line',{x1:18,y1:33,x2:18,y2:33,stroke:BLUE,'stroke-width':2});
    append(svg,'circle',{cx:18,cy:33,r:5,fill:GRAY});
    append(svg,'circle',{cx:282,cy:33,r:5,fill:'white',stroke:BLUE,'stroke-width':1.5});
    const dot=append(svg,'circle',{cx:18,cy:33,r:6,fill:BLUE});
    summaryNodes.push({track,dot});
  });
}
function drawSummary(){
  const p=moving?ease(summaryTime/1800):1;
  const x=18+264*p;
  summaryNodes.forEach(({track,dot})=>{track.setAttribute('x2',x);dot.setAttribute('cx',x);});
}
function buildDiagnostics(){
  diagnosticNodes.length=0;
  [{id:'pr-chart',from:2.02,to:7.35,max:16,ticks:[0,4,8,12,16]},
   {id:'energy-chart',from:1,to:.0972,max:1,ticks:[0,.25,.5,.75,1]}].forEach(data=>{
    const svg=$(data.id);svg.replaceChildren();
    const left=100,right=412,top=35,bottom=93,width=right-left;
    data.ticks.forEach(tick=>{
      const x=left+width*tick/data.max;
      append(svg,'line',{x1:x,y1:18,x2:x,y2:116,stroke:LINE});
      append(svg,'text',{x,y:137,'text-anchor':'middle','font-size':15},String(tick));
    });
    append(svg,'text',{x:0,y:top+5,'font-size':15},'LoRA');
    append(svg,'text',{x:0,y:bottom+5,'font-size':15,style:`fill:${BLUE}`},'LoRA-Norm');
    append(svg,'rect',{x:left,y:top-8,width:width*data.from/data.max,height:16,fill:GRAY,rx:2});
    const bar=append(svg,'rect',{x:left,y:bottom-8,width:width*data.from/data.max,height:16,fill:BLUE,rx:2});
    diagnosticNodes.push({...data,bar,width});
  });
}
function drawDiagnostics(){
  const p=moving?ease(diagnosticTime/1900):1;
  diagnosticNodes.forEach(data=>data.bar.setAttribute('width',data.width*(data.from+(data.to-data.from)*p)/data.max));
}
$('replay-diagnostics').addEventListener('click',()=>{diagnosticTime=0;drawDiagnostics();});
function buildTaskChart(){
  taskBars=[];
  const narrow=window.innerWidth<=600,W=narrow?420:920,H=narrow?335:310;
  const left=narrow?41:52,right=narrow?9:24,top=32,bottom=H-65;
  const chart=$('task-chart');chart.replaceChildren();chart.setAttribute('viewBox',`0 0 ${W} ${H}`);
  const metricName=metric==='target'?'target-task':metric==='off'?'off-task':'forgetting-gap';
  chart.setAttribute('aria-label',`${model==='qwen'?'Qwen3-8B':'Llama-3.1-8B-Instruct'} ${metricName} results for Magicoder, MetaMath, and Tulu. Mean and sample standard deviation over three runs.`);
  const max=metric==='fg'?10:100;
  const y=value=>bottom-value/max*(bottom-top);
  const ticks=metric==='fg'?[0,2,4,6,8,10]:[0,20,40,60,80,100];
  ticks.forEach(tick=>{const yy=y(tick);append(chart,'line',{x1:left,y1:yy,x2:W-right,y2:yy,stroke:LINE});append(chart,'text',{x:left-9,y:yy+4,'text-anchor':'end','font-size':narrow?16:13},String(tick));});
  append(chart,'text',{x:left-9,y:17,'text-anchor':'end','font-size':narrow?16:13},metric==='fg'?'pp':'%');
  const span=(W-left-right)/3,bw=narrow?28:53,gap=narrow?7:11;
  results[model].forEach((row,index)=>{
    const center=left+span*(index+.5);
    row[metric].forEach((value,series)=>{
      const x=center+(series===0?-bw-gap/2:gap/2),start=row[metric][0];
      const bar=append(chart,'rect',{x,y:y(start),width:bw,height:bottom-y(start),fill:series===0?GRAY:BLUE,rx:2});
      const cx=x+bw/2;
      const error=append(chart,'g',{stroke:series===0?'#8898b3':BLUE,'stroke-width':1.4});
      const errLine=append(error,'line',{x1:cx,x2:cx,y1:y(value+row[metric+'SD'][series]),y2:y(Math.max(0,value-row[metric+'SD'][series]))});
      const errTop=append(error,'line',{x1:cx-4,x2:cx+4,y1:y(value+row[metric+'SD'][series]),y2:y(value+row[metric+'SD'][series])});
      const errBottom=append(error,'line',{x1:cx-4,x2:cx+4,y1:y(Math.max(0,value-row[metric+'SD'][series])),y2:y(Math.max(0,value-row[metric+'SD'][series]))});
      const label=append(chart,'text',{x:cx+(narrow?(series===0?-2:2):0),y:y(value+row[metric+'SD'][series])-9,'text-anchor':narrow?(series===0?'end':'start'):'middle','font-size':narrow?15:17,style:`fill:${series===0?'#7c8ba5':BLUE}`},value.toFixed(2));
      taskBars.push({bar,error,errLine,errTop,errBottom,label,y,bottom,start,end:value,sd:row[metric+'SD'][series],series});
    });
    append(chart,'text',{x:center,y:bottom+26,'text-anchor':'middle','font-size':narrow?15:15,style:'fill:#384258'},row.task);
    let delta=row[metric][1]-row[metric][0];if(metric==='target'&&row.gain!==undefined)delta=row.gain;
    append(chart,'text',{x:center,y:bottom+49,'text-anchor':'middle','font-size':narrow?16:13,style:`fill:${BLUE}`},`${delta>=0?'+':'−'}${Math.abs(delta).toFixed(2)} pp`);
  });
  taskTime=0;drawTaskChart();
}
function drawTaskChart(){
  const p=moving?ease(taskTime/1300):1;
  taskBars.forEach(data=>{
    const value=data.series===0?data.end:data.start+(data.end-data.start)*p;
    const yy=data.y(value);
    data.bar.setAttribute('y',yy);data.bar.setAttribute('height',Math.max(0,data.bottom-yy));
    data.error.setAttribute('opacity',data.series===0||p>=.999?'1':'0');
    data.label.setAttribute('opacity',data.series===0||p>=.999?'1':'0');
  });
}
function fillTables(){
  $('results-table').innerHTML=results[model].map(row=>`<tr><th scope="row">${row.task}</th>${['target','off','fg'].map(key=>row[key].map((value,i)=>`<td${i===1?' class="ours"':''}>${value.toFixed(2)}<span class="small-sd">±${row[key+'SD'][i].toFixed(2)}</span></td>`).join('')).join('')}</tr>`).join('');
}
const baselines=[['Base',66.47,69.99,0],['LoRA',68,69.55,2.71],['PARA · ε = .90',68.78,70.01,2.37],['PARA · ε = .95',68.58,69.64,2.7],['PARA · ε = .99',68.44,69.78,2.56],['Spectral Surgery',68.76,68.28,3.72],['LoRA-Norm',72.08,72.79,.34]];
const controls=[['LoRA',67.998,69.551,2.708],['LoRA-Norm',72.083,72.792,.344],['Scalar-F',70.643,71.558,1.111],['Scalar-E',72.700,72.470,.525],['Flat-E',72.273,72.566,.396]];
function tableRows(rows,digits){return rows.map(row=>`<tr${row[0]==='LoRA-Norm'?' class="ours-row"':''}><th scope="row">${row[0]}</th>${row.slice(1).map(value=>`<td>${value.toFixed(digits)}</td>`).join('')}</tr>`).join('');}
$('baseline-table').innerHTML=tableRows(baselines,2);
$('control-table').innerHTML=tableRows(controls,3);
function selectControl(selector,key,value){document.querySelectorAll(selector).forEach(button=>{const selected=button.dataset[key]===value;button.classList.toggle('selected',selected);button.setAttribute('aria-pressed',String(selected));});}
document.querySelectorAll('[data-model]').forEach(button=>button.addEventListener('click',()=>{model=button.dataset.model;selectControl('[data-model]','model',model);fillTables();buildTaskChart();}));
document.querySelectorAll('[data-metric]').forEach(button=>button.addEventListener('click',()=>{metric=button.dataset.metric;selectControl('[data-metric]','metric',metric);buildTaskChart();}));
function updateMotionButton(){
  $('motion-label').textContent=moving?'Pause animation':'Play animation';
  $('motion-toggle').setAttribute('aria-pressed',String(!moving));
  document.querySelector('.motion-icon').textContent=moving?'Ⅱ':'▷';
}
function motionPreference(){
  moving=!reducedMotion.matches;
  if(!moving){manualStage=7;currentGains=stages[7].slice();drawSpectrum(currentGains,7);}
  else{manualStage=null;spectrumTime=0;}
  drawSummary();drawDiagnostics();drawTaskChart();updateMotionButton();
}
$('motion-toggle').addEventListener('click',()=>{
  moving=!moving;
  if(moving){manualStage=null;summaryTime=0;diagnosticTime=0;taskTime=0;}
  updateMotionButton();
});
reducedMotion.addEventListener('change',motionPreference);
buildSpectrum();buildSummary();buildDiagnostics();buildTaskChart();fillTables();
if(!moving){manualStage=7;currentGains=stages[7].slice();drawSpectrum(currentGains,7);}
drawSummary();drawDiagnostics();updateMotionButton();
const sceneElements=[['spectrum',$('method')],['summary',$('summary-grid')],['task',$('task-chart')],['diagnostics',$('diagnostics')]];
const observer=new IntersectionObserver(entries=>entries.forEach(entry=>{
  const scene=sceneElements.find(([,element])=>element===entry.target)?.[0];
  if(scene)visible[scene]=entry.isIntersecting;
}),{threshold:.08});
sceneElements.forEach(([,element])=>observer.observe(element));
let lastTime=null;
function frame(now){
  const delta=lastTime===null?0:Math.min(now-lastTime,80);lastTime=now;
  if(moving&&!document.hidden){
    if(visible.spectrum&&manualStage===null){spectrumTime+=delta;spectralFrame();}
    if(visible.summary&&summaryTime<1900){summaryTime+=delta;drawSummary();}
    if(visible.task&&taskTime<1400){taskTime+=delta;drawTaskChart();}
    if(visible.diagnostics&&diagnosticTime<2000){diagnosticTime+=delta;drawDiagnostics();}
  }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
let narrow=window.innerWidth<=600;
window.addEventListener('resize',()=>{const next=window.innerWidth<=600;if(next!==narrow){narrow=next;buildSpectrum();buildTaskChart();}});
$('copy-citation').addEventListener('click',async()=>{
  const button=$('copy-citation'),status=$('copy-status'),citation=$('bibtex').textContent;
  try{
    if(navigator.clipboard&&window.isSecureContext)await navigator.clipboard.writeText(citation);
    else{const text=document.createElement('textarea');text.value=citation;text.style.position='fixed';text.style.opacity='0';document.body.append(text);text.select();const ok=document.execCommand('copy');text.remove();if(!ok)throw new Error('Clipboard unavailable');}
    button.textContent='Copied';status.textContent='BibTeX copied.';setTimeout(()=>{button.textContent='Copy BibTeX';status.textContent='';},2200);
  }catch{
    $('bibtex').closest('details').open=true;
    const selection=window.getSelection(),range=document.createRange();range.selectNodeContents($('bibtex'));selection.removeAllRanges();selection.addRange(range);status.textContent='Select and copy the citation below.';
  }
});
