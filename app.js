"use strict";
const D=globalThis.Dispatch,$=id=>document.getElementById(id);
const el=(tag,value,cls)=>{const n=document.createElement(tag);if(value!=null)n.textContent=value;if(cls)n.className=cls;return n;};
const dot=(...values)=>values.filter(Boolean).join(" · ");
let isPublic=true,reviews=[],questions=[],current=[],queue=[],category="",chosen=null,reviewSession=0,qSession=0;
const dispositions=new Map();
const reviewHeaders=["评价ID","平台","店铺","品牌","内部SKU","平台商品编号","商品名称","星级","评价内容","评价日期","来源链接","批号",
  "采样来源","采样分组","购得方式","店铺经营类型","人工归因","人工风险"];
const qHeaders=["问题ID","平台","店铺","品牌","内部SKU","平台商品编号","商品名称","问题","回答数","提问日期","来源链接"];
const riskCatalog=[["reaction","疑似不良反应"],["efficacy","功效质疑"],["auth","真伪质疑"],["expiry","临期反馈"]];
const escapeTitle=v=>v||"商品待核";
const sourceLink=record=>{
  if(!record.source)return null;
  const a=el("a","查看来源","source-link");a.href=record.source;a.target="_blank";a.rel="noopener noreferrer";return a;
};
function download(name,contents,mime){
  const url=URL.createObjectURL(new Blob([contents],{type:mime}));
  const link=el("a");link.href=url;link.download=name;link.click();
  setTimeout(()=>URL.revokeObjectURL(url),800);
}
function fileDownload(name,rows){download(name,D.csv(rows),"text/csv;charset=utf-8");}
function setStatus(id,value,bad=false){const n=$(id);n.textContent=value;n.classList.toggle("error",bad);}
const dispositionKey=task=>JSON.stringify([isPublic,task.id,task.rows.map(row=>row.id)]);
function statusOf(task){return dispositions.get(dispositionKey(task))?.state||"待复核";}
function teamOf(task){return dispositions.get(dispositionKey(task))?.team||task.team;}
function selection(node,values,title){
  const old=node.value;
  node.replaceChildren(new Option(title,""),...values.map(value=>new Option(value,value)));
  if(values.includes(old))node.value=old;
}
function context(){
  const active=isPublic?globalThis.PUBLIC_REVIEWS:reviews;
  const collect=key=>[...new Set([...active,...questions].map(row=>row[key]).filter(Boolean))].sort();
  selection($("brand"),collect("brand"),"全部品牌");
  selection($("platform"),collect("platform"),"全部平台");
  const reviewOptions=key=>[...new Set(active.map(row=>row[key]).filter(Boolean))].sort();
  selection($("channel"),reviewOptions("channel"),"全部方式");
  selection($("seller-type"),reviewOptions("sellerType"),"全部类型");
  const brand=$("brand").value,platform=$("platform").value,search=$("search").value.toLowerCase().trim();
  const channel=$("channel").value,seller=$("seller-type").value;
  const matches=row=>(!brand||row.brand===brand)&&(!platform||row.platform===platform)&&
    (!search||[row.brand,row.sku,row.platformSku,row.product].join(" ").toLowerCase().includes(search));
  return {reviews:active.filter(row=>matches(row)&&(!channel||row.channel===channel)&&(!seller||row.sellerType===seller)),questions:questions.filter(matches)};
}
function showDialog(title,kicker,action,rows,task=null){
  chosen=task;
  $("detail-kicker").textContent=kicker;
  $("detail-title").textContent=title;
  $("detail-action").textContent=action;
  $("detail-controls").hidden=!task;
  if(task){$("review-state").value=statusOf(task);$("detail-team").value=teamOf(task);}
  $("detail-body").replaceChildren(...rows.slice(0,120).map(row=>{
    const article=el("article",null,"evidence");
    const meta=el("p",dot(row.id,row.evidence,row.platform,row.shop,row.date,row.rating!=null?row.rating+" 星":"",row.batch?"批号 "+row.batch:"",row.answers===0?"0 个回答":row.answers>0?row.answers+" 个回答":""));
    const quote=el("blockquote",row.text);
    article.append(meta,quote);
    if(row.origin||row.channel||row.sellerType||row.cohort)article.append(el("p",dot(row.origin,row.cohort,row.channel?"购得方式 "+row.channel:"",row.sellerType?"店铺 "+row.sellerType:""),"hit"));
    if(row.context)article.append(el("p",row.context));
    if(row.original!=null&&row.original!==row.text){
      const more=el("details");
      more.append(el("summary","查看未遮蔽原文（仅本机）"),el("blockquote",row.original));
      article.append(more);
    }
    if(row.matched?.length)article.append(el("p","命中 · "+row.matched.join(" / "),"hit"));
    const link=sourceLink(row);
    if(link)article.append(link);
    return article;
  }));
  if(rows.length>120)$("detail-body").append(el("p","仅显示前 120 条，工单 CSV 包含全部证据。","small"));
  if(!$("detail").open)$("detail").showModal();
}
function taskDetail(task){showDialog(escapeTitle(task.product),dot(task.priority,task.title,D.teams[teamOf(task)]),task.action,task.rows,task);}
function emptyTable(body,cols,message){const tr=el("tr"),td=el("td",message,"empty");td.colSpan=cols;tr.append(td);body.replaceChildren(tr);}
function showCoverage(records){
  const bySource=new Map();
  const byCohort=new Map();
  for(const row of records){
    const origin=row.origin||"来源待核";
    bySource.set(origin,(bySource.get(origin)||0)+1);
    if(row.cohort)byCohort.set(row.cohort,(byCohort.get(row.cohort)||0)+1);
  }
  const explain=map=>[...map].map(([key,count])=>key+" "+count+" 条").join(" · ");
  $("source-profile").textContent=bySource.size?"当前筛选 · "+explain(bySource)+(byCohort.size?"；分组 "+explain(byCohort):""):"当前筛选没有样本。";
  const check=D.coverage(records);
  $("coverage-total").textContent="可追溯商品页 / 授权样本 "+check.eligible+" 条 · 已标注归因 "+check.labeled+" 条 · 已标注风险 "+check.riskLabeled+" 条";
  const rows=[...check.ordinaryRows,...check.riskRows];
  $("coverage-rows").replaceChildren(...rows.map((check,i)=>{
    const node=el("tr");
    const scope=i>=D.ordinaryLabel.length?"风险":"归因";
    const status=check.annotated>=2?"达到最低样本量":"缺 "+(2-check.annotated)+" 条";
    node.append(el("td",scope+" · "+check.label),el("td",check.annotated),
      el("td",check.annotated?check.hit+" / "+check.annotated:"—"),el("td",check.extra),el("td",status));
    return node;
  }));
}
function render(){
  const view=context();
  current=view.reviews;
  const overview=D.reviewData(current);
  queue=overview.list;
  $("total").textContent=current.length;
  $("low").textContent=overview.ratedCount?((overview.lowCount*100)/overview.ratedCount).toFixed(1)+"%":"—";
  $("low").title=overview.ratedCount?overview.lowCount+" / "+overview.ratedCount+" 条有可用星级":"没有可核实的星级";
  $("scope").textContent=isPublic?"京东聚合页样本 · 用于回查原文和演示派单":"已导入 "+reviews.length+" 条评价 · 可继续追加其他平台";
  $("load-public").textContent=isPublic&&reviews.length?"切换到已导入评价":"查看京东公开样本";
  $("clear").hidden=!reviews.length&&!questions.length;
  $("archive-original").hidden=isPublic||!reviews.length;
  $("view-source").disabled=!current.length;
  $("view-source").textContent=isPublic?"查看公开样本与来源":"查看当前评价原文";
  const active=queue.filter(t=>statusOf(t)!=="撤销误判");
  const risks=active.filter(t=>t.type==="risk");
  const riskIds=new Set(risks.flatMap(task=>task.rows.map(row=>row.id)));
  const ordinaryIds=new Set(active.filter(task=>task.type==="ordinary").flatMap(task=>
    task.rows.filter(row=>!riskIds.has(row.id)).map(row=>row.id)));
  $("risk-count").textContent=riskIds.size;
  $("ordinary").textContent=ordinaryIds.size;
  showCoverage(current);
  $("risk-grid").replaceChildren(...riskCatalog.map(([key,title])=>{
    const card=el("article",null,key==="reaction"?"risk-card priority":"risk-card");
    const count=risks.filter(t=>t.key===key).reduce((num,t)=>num+t.rows.length,0);
    card.append(el("span",title),el("strong",count),el("small",key==="reaction"?"P1 · 交品控":"P2 · 待核查"));
    return card;
  }));
  $("risk-items").replaceChildren();
  if(!risks.length)$("risk-items").append(el("p","当前范围没有命中风险词的评价。","small"));
  for(const task of risks.slice(0,8)){
    const row=el("div",null,"risk-row"), link=el("button","查看证据","text-btn");
    link.addEventListener("click",()=>taskDetail(task));
    row.append(el("strong",dot(task.priority,task.title,escapeTitle(task.product))),el("span",task.rows.length+" 条"),link);
    $("risk-items").append(row);
  }
  if(risks.length>8)$("risk-items").append(el("p","其余风险工单见派单表。","small"));
  const tally=key=>active.filter(t=>t.key===key||t.category===D.ordinaryLabel.find(([k])=>k===key)?.[1]).length;
  $("category-pills").replaceChildren(...[["","全部",active.length],...D.ordinaryLabel.map(([key,title])=>[key,title,tally(key)])].map(([key,title,n])=>{
    const button=el("button",title+" "+n);
    button.setAttribute("aria-pressed",String(category===key));
    button.addEventListener("click",()=>{category=key;render();});
    return button;
  }));
  const team=$("team").value;
  const nameOfCategory=D.ordinaryLabel.find(([key])=>key===category)?.[1];
  const list=queue.filter(t=>(!team||teamOf(t)===team)&&(!category||t.key===category||t.category===nameOfCategory));
  $("tasks").replaceChildren();
  const rows=list.slice(0,160).map(task=>{
    const tr=el("tr"), product=el("td"), title=el("td"), detail=el("button","看证据","text-btn");
    product.append(el("strong",escapeTitle(task.product)),el("small",dot(task.brand,task.sku||"内部 SKU 待核")));
    if(!task.sku&&task.platformSku)product.append(el("small",dot(task.platform+"商品编号",task.platformSku)));
    title.append(el("strong",task.title),el("small",dot(task.priority,task.type==="risk"?task.category:"",task.type==="pending"?"待人工":"")));
    if(task.type==="risk")title.className="risk-text";
    detail.addEventListener("click",()=>taskDetail(task));
    const box=el("td");box.append(detail,el("small",statusOf(task)));
    tr.append(product,title,el("td",D.teams[teamOf(task)]),el("td",String(task.rows.length)),el("td",task.action),box);
    return tr;
  });
  if(rows.length)$("tasks").append(...rows);
  else emptyTable($("tasks"),6,"当前筛选下没有派单项。");
  $("task-note").textContent=(list.length>160?"表格显示前 160 条，":"")+"交接导出按当前品牌、平台及搜索范围生成，提高风险优先级并排除已撤销工单。";
  for(const btn of document.querySelectorAll("[data-export]"))btn.disabled=!active.some(t=>teamOf(t)===btn.dataset.export);

  const qb=D.questionData(view.questions);
  $("q-rows").replaceChildren();
  const qrows=qb.slice(0,120).map(group=>{
    const tr=el("tr"), title=el("td",escapeTitle(group.product)), action=el("button","查看问题","text-btn"), cell=el("td");
    title.append(el("small",dot(group.brand,group.sku||"SKU 待核")));
    action.addEventListener("click",()=>showDialog(escapeTitle(group.product),group.topic,"共 "+group.rows.length+" 条，明确零回答 "+group.unanswered+" 条。",group.rows));
    cell.append(action);
    tr.append(title,el("td",group.topic+(group.unanswered>=2?" · 优先补答":"")),el("td",group.rows.length),el("td",group.unanswered),el("td",group.unknown),cell);
    return tr;
  });
  if(qrows.length)$("q-rows").append(...qrows);
  else emptyTable($("q-rows"),6,questions.length?"当前筛选下没有问答。":"等待导入真实问答数据。");
}
async function readCSV(file){
  if(file.size>8_000_000)throw Error("文件超过 8 MB。");
  const data=await file.arrayBuffer();
  try{return new TextDecoder("utf-8",{fatal:true}).decode(data);}
  catch{return new TextDecoder("gb18030",{fatal:true}).decode(data);}
}
async function readInput(kind,file){
  if(!file)return;
  const review=kind==="review",sequence=review?++reviewSession:++qSession,field=review?"review-status":"q-status";
  try{
    const input=await readCSV(file);
    if(sequence!==(review?reviewSession:qSession))return;
    const existing=review?reviews:questions;
    const result=D.ingest(input,kind,existing);
    if(existing.length+result.data.length>25000)throw Error("工作区每种数据最多 25,000 条。");
    existing.push(...result.data);
    if(review){
      $("import-problems").replaceChildren(...result.notes.slice(0,45).map(n=>el("li",n)));
      if(result.notes.length>45)$("import-problems").append(el("li","还有 "+(result.notes.length-45)+" 条行级提示。"));
      $("import-details").hidden=!result.notes.length;
      if(result.data.length)isPublic=false;
    }
    setStatus(field,file.name+" · 新增 "+result.data.length+" · 重复 "+result.duplicates+" · 未导入 "+result.rejected,result.rejected>0);
    if(review&&result.data.length){
      $("brand").value="";$("platform").value="";$("channel").value="";$("seller-type").value="";$("search").value="";$("team").value="";category="";
    }
    render();
  }catch(error){if(sequence===(review?reviewSession:qSession))setStatus(field,error.message,true);}
}
$("review-file").addEventListener("change",e=>{const file=e.target.files[0];e.target.value="";readInput("review",file);});
$("q-file").addEventListener("change",e=>{const file=e.target.files[0];e.target.value="";readInput("question",file);});
$("review-template").addEventListener("click",()=>fileDownload("评价导入模板.csv",[reviewHeaders]));
$("archive-original").addEventListener("click",()=>{
  const records=current.filter(row=>typeof row.original==="string");
  if(!records.length){setStatus("review-status","当前筛选没有导入原文。",true);return;}
  if(!confirm("原文档案会完整保留你导入的文字，可能含个人信息。将当前筛选的 "+records.length+" 条保存到本机？"))return;
  const archive=records.map(({text,...record})=>record);
  download("评价原文档案.json",JSON.stringify({version:1,records:archive},null,2),"application/json;charset=utf-8");
});
$("q-template").addEventListener("click",()=>fileDownload("问答导入模板.csv",[qHeaders]));
$("load-public").addEventListener("click",()=>{
  isPublic=(!isPublic||!reviews.length);
  $("brand").value="";$("platform").value="";$("channel").value="";$("seller-type").value="";$("team").value="";$("search").value="";category="";
  setStatus("review-status",isPublic?"当前查看京东公开聚合页样本。":"已返回导入的评价。");
  render();
});
$("clear").addEventListener("click",()=>{
  if(!confirm("清空本标签页导入的评价、问答和复核状态？"))return;
  ++reviewSession;++qSession;reviews=[];questions=[];dispositions.clear();isPublic=true;category="";
  $("search").value="";$("team").value="";$("brand").value="";$("platform").value="";$("channel").value="";$("seller-type").value="";
  $("import-details").hidden=true;setStatus("review-status","已清空本次导入。");setStatus("q-status","等待导入问答数据。");render();
});
$("view-source").addEventListener("click",()=>showDialog("评价证据",isPublic?"京东公开聚合页":"导入原文",current.length+" 条，同一评价可能命中多个工单。",current));
$("set-state").addEventListener("click",()=>{
  if(!chosen)return;
  dispositions.set(dispositionKey(chosen),{state:$("review-state").value,team:$("detail-team").value});
  $("detail").close();render();
});
for(const control of ["brand","platform","channel","seller-type","search","team"])$(control).addEventListener("input",render);
for(const btn of document.querySelectorAll("[data-export]"))btn.addEventListener("click",()=>{
  const team=btn.dataset.export, name=team==="supply"?"供应链":"客服";
  const matrix=[["责任口","优先级","基础归因","风险/归因","品牌","内部SKU","商品","同组评价数","处理状态","建议动作","证据编号","平台","店铺","星级","批号","评价日期","证据类型","原文或公开节选","命中依据","来源链接","平台商品编号","平台评价ID","采样来源","采样分组","购得方式","店铺经营类型","证据上下文"]];
  for(const task of queue){
    if(teamOf(task)!==team||statusOf(task)==="撤销误判")continue;
    for(const row of task.rows)matrix.push([D.teams[team],task.priority,task.category||task.title,task.title,row.brand,row.sku||"待核对",row.product,task.rows.length,statusOf(task),task.action,
      row.id,row.platform,row.shop,row.rating??"",row.batch,row.date,row.evidence,row.text,row.matched.join(" / "),row.source,row.platformSku,
      row.platformId,row.origin,row.cohort,row.channel,row.sellerType,row.context]);
  }
  if(matrix.length>1)fileDownload((isPublic?"公开样本-":"")+name+"交接清单.csv",matrix);
});
render();

