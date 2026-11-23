(() => {
"use strict";
const teams={supply:"供应链与品控",service:"客服与运营"};
const ordinary=[
 ["quality","产品品质","supply","核对同 SKU 与批次留样，复核配方性状或使用体验。",/结块|分层|有异物|有杂质|变质|发臭|异味|洗不干净|清洁力差|拔干|太油腻|假滑|搓泥|不好用/gu],
 ["pack","包装","supply","核对封口、瓶盖与泵头，按批次抽查出库包装。",/封口.{0,8}(?:掉了|脱落|开了|破了|不严)|没有封口|瓶盖.{0,6}(?:掉了|坏了|破了)|漏液|漏了|漏出来|瓶身破损|外盒(?:压坏|破损|压扁)|泵头(?:坏了|按不出)|挤不出来|压不出来|包装(?:破损|压坏|漏了)/gu],
 ["delivery","物流时效","service","核对揽收与签收节点，定位仓库或承运环节。",/(?:发货|物流|快递|派送)(?:很|太|真|有点)?慢|迟迟不发货|没发货|迟到|延误|超时|丢件|没收到|等了.{0,8}(?:天|周)|一直没到/gu],
 ["service","客服服务","service","复查咨询记录和承诺，按售后流程补齐跟进。",/客服.{0,15}(?:不回|没回|不理|不满意|答非所问|推诿|敷衍|态度差)|(?:商家|客服).{0,15}回复.{0,12}(?:不满意|不令人满意|敷衍)|售后.{0,8}(?:没人管|不处理|推诿)|不让退|拒绝退款/gu],
 ["listing","描述不符","service","协同商品运营核对详情、规格图和实发商品。",/描述不符|与描述不一致|和描述不一样|货不对板|图文不符|规格不符|发错|少发|和图片不一样|与实物不符/gu],
 ["expectation","买家预期","service","复核预期差异及使用说明，整理选购提示。",/比想象中(?:小|差|油|贵)|跟我想的不一样|和想象不一样|不符合预期|不喜欢这个(?:味道|香味|肤感)|味道太(?:香|浓)|太小了|不值这个价/gu],
 ["trace","真伪临期","supply","核对进货凭证、批次和效期，保留页面证据。",null]
];
const risks=[
 ["reaction","疑似不良反应","supply","优先交品控，保存原文并核对商品批次、使用与症状时间线，按企业流程评估是否上报。",/红肿|刺痛|起疹|起痘|爆痘|烂脸|脸.{0,3}痒|眼睛.{0,4}肿|过敏(?:了|反应|严重)|疑似过敏|(?:用完|用了|使用后|洗完|涂完)(?:就|立刻|当晚|后|出现了?|疑似|直接|还是){0,3}过敏/gu],
 ["auth","真伪质疑","supply","截取原始证据，查批次、采购渠道及防伪记录。",/假货|疑似仿品|不像正品|不是真品|查不到防伪|防伪码.{0,8}(?:无效|查不到)/gu],
 ["expiry","临期反馈","supply","核对照片、批号、有效期和发货记录，按仓储流程处理。",/临期|快过期|快到期|已经过期|收到就过期|有效期只剩|日期太旧|日期旧/gu],
 ["efficacy","功效质疑","service","协同商品运营复核原页面功效表述、证据与用户实际语境。",/没效果|没有效果|毫无效果|看不到效果|没作用|白不了|没变白|不见效|智商税|毫无作用/gu]
];
const topics=[
 ["敏感肌适用",/敏感肌|敏感皮|敏感肤质|会不会过敏|容易过敏|刺不刺激|会刺激吗/u],
 ["孕期与哺乳期",/孕妇|怀孕|孕期|哺乳|备孕/u],
 ["肤感与香味",/油腻|清爽|香味|香精|味道|肤感|搓泥/u],
 ["使用方式与搭配",/怎么用|先用|后用|搭配|一天几次|需不需要卸|要卸妆/u],
 ["功效与适用场景",/美白|防晒|防水|控油|补水|有没有效果|效果怎么样/u],
 ["规格、批次与效期",/多大|多少[克毫]|保质期|有效期|临期|规格|批号|批次/u],
 ["物流与售后",/发货|多久到|退货|退款|快递/u]
];
const aliases={
 review_id:["评价ID","评价编号","评论ID","review_id"],question_id:["问题ID","提问ID","question_id"],
 platform:["平台","渠道","platform"],shop:["店铺","店铺名称","shop"],brand:["品牌","brand"],
 sku:["内部SKU","标准SKU","商品SKU","SKU","sku"],platformSku:["平台SKU","平台商品编号","platform_sku"],product:["商品","商品名称","产品","产品名","product"],
 rating:["星级","评分","rating"],text:["评价内容","评论内容","原文","评价","review","text"],
 date:["评价日期","日期","提问日期","review_date","date"],source:["来源链接","来源","source_url"],
 batch:["批次","批号","产品批号","batch"],question:["问题","提问","问题内容","question"],
 answers:["回答数","已答数","答案数","answer_count","answers"],
 channel:["购得方式","获取方式","渠道属性","channel"],
 sellerType:["店铺经营类型","经营类型","seller_type"],
 sourceKind:["采样来源","来源类型","source_kind"],
 cohort:["采样分组","样本组","cohort"],
 expected:["人工归因","人工归因类别","expected_categories"],
 expectedRisk:["人工风险","人工风险类别","expected_risks"]
};
const normalize=x=>String(x??"").replace(/^\uFEFF/,"").normalize("NFKC").trim();
const tidy=x=>normalize(x).replace(/\s+/g," ");
const scrub=x=>String(x??"").replace(/(?<!\d)1[3-9]\d{9}(?!\d)/g,"[手机号已遮蔽]").replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi,"[邮箱已遮蔽]");
const limit=(x,n)=>tidy(x).slice(0,n);
const headerKey=x=>normalize(x).toLowerCase().replace(/[\s_\-]+/g,"");
function sourceUrl(s){
  try{
    const u=new URL(s);
    if(!["https:","http:"].includes(u.protocol)||u.username||u.password)return "";
    for(const key of [...u.searchParams.keys()])if(/token|session|authorization|password|secret|signature|^key$/i.test(key))u.searchParams.delete(key);
    return u.href;
  }catch{return "";}
}
const sourceKinds=["商品评价区","授权后台导出","公开聚合页","来源待核","测试样本"];
function sourceKind(value){
  const marked=tidy(value);
  return sourceKinds.includes(marked)?marked:"来源待核";
}
function expectedTags(value,allowed){
  const raw=tidy(value);
  if(!raw)return null;
  if(raw==="无")return [];
  const tags=[...new Set(raw.split(/[、,;；/|]+/).map(x=>x.trim()))];
  return tags.every(x=>allowed.includes(x))?tags:null;
}
function ingest(input,kind,existing=[]){
  const parsed=Papa.parse(input.replace(/^\uFEFF/,""),{skipEmptyLines:"greedy"});
  const delimiterOnly=parsed.data[0]?.length===1;
  if(parsed.errors.some(e=>!(delimiterOnly&&e.code==="UndetectableDelimiter")))throw Error("CSV 格式有误，请检查引号与分隔符。");
  const [header,...body]=parsed.data;
  if(!header?.length||!body.length)throw Error("CSV 没有数据行。");
  if(body.length>10000)throw Error("单个文件最多 10,000 行。");
  const names=header.map(headerKey);
  if(new Set(names).size!==names.length)throw Error("表头有重复列，请先修改。");
  const mapping=Object.fromEntries(Object.entries(aliases).map(([field,choices])=>[field,names.findIndex(n=>choices.some(alias=>headerKey(alias)===n))]));
  const content=kind==="review"?"text":"question";
  if(mapping[content]<0)throw Error("缺少 "+(kind==="review"?"评价内容":"问题")+" 列，请下载模板核对。");
  const data=[],notes=[],ids=new Set(existing.filter(x=>x.key).map(x=>x.key));
  let duplicates=0,rejected=0;
  for(const [idx,row] of body.entries()){
    const warn=text=>notes.push("第 "+(idx+2)+" 行 · "+text);
    if(row.length!==header.length){rejected++;warn("列数与表头不一致。");continue;}
    const get=field=>row[mapping[field]]??"";
    const original=String(get(content)), text=scrub(original);
    if(!text.trim()||text.length>5000){rejected++;warn("正文为空或超过 5,000 字。");continue;}
    const sku=limit(get("sku"),100), platformSku=limit(get("platformSku"),100), product=limit(get("product"),140);
    const platform=limit(get("platform"),35), shop=limit(get("shop"),90), brand=limit(get("brand"),70);
    const rawId=limit(get(kind==="review"?"review_id":"question_id"),120);
    const key=rawId&&platform ? JSON.stringify([platform,shop,rawId]) : "";
    if(key&&ids.has(key)){duplicates++;continue;}
    if(key)ids.add(key);
    const rawRating=tidy(get("rating")), rawAnswers=tidy(get("answers"));
    const rating=/^[1-5](?:\.0)?(?:星|分)?$/.test(rawRating)?parseInt(rawRating,10):null;
    const answers=/^\d{1,6}$/.test(rawAnswers)?Number(rawAnswers):null;
    if(kind==="review"&&rawRating&&rating==null)warn("星级格式未确认，按未知处理。");
    if(kind==="question"&&rawAnswers&&answers==null)warn("回答数无法识别，按未知处理。");
    if(!sku)warn("缺内部 SKU，划分为待核 SKU。");
    const channelLabel=limit(get("channel"),70), sellerLabel=limit(get("sellerType"),70);
    const channel= /^(自营|POP|第三方)$/i.test(channelLabel)?"":channelLabel;
    const sellerType=sellerLabel||(!channel&&channelLabel?channelLabel:"");
    const origin=sourceKind(get("sourceKind"));
    const expected=expectedTags(get("expected"),ordinary.map(r=>r[1]));
    const expectedRisk=expectedTags(get("expectedRisk"),risks.map(r=>r[1]));
    if(get("sourceKind")&&origin==="来源待核"&&tidy(get("sourceKind"))!==origin)warn("采样来源值未识别，按来源待核处理。");
    if(kind==="review"&&((get("expected")&&expected===null)||(get("expectedRisk")&&expectedRisk===null)))warn("人工标签未识别，不计入覆盖验收。");
    const id="R"+(existing.length+data.length+1);
    data.push({id,key,platform,shop,brand,sku,platformSku,product,text,original,rating,answers,date:limit(get("date"),37),
      batch:limit(get("batch"),70),source:sourceUrl(get("source")),evidence:"导入原文",platformId:rawId,
      channel,sellerType,origin,cohort:limit(get("cohort"),60),expected,expectedRisk});
  }
  return {data,notes,duplicates,rejected};
}

function hits(raw,pattern){
  const clauses=normalize(raw).split(/[，。！？；,!?;\n]|但是|不过|可是|(?<!不)但/u).map(x=>x.trim()).filter(Boolean);
  const matches=[];
  for(const clause of clauses){
    if(/(?:会不会|能不能|是否会|会过敏吗|怕过敏|担心过敏)/u.test(clause)&&!/(?:已经|确实|出现了|用了以后|用了之后).{0,12}(?:刺痛|红肿|过敏|起痘)/u.test(clause))continue;
    for(const match of clause.matchAll(pattern)){
      const prefix=clause.slice(0,match.index).slice(-19);
      if(/(?:没有|没|未|无|不会|不曾|不是|并非|从未|不会有|不)(?:出现|感觉|觉得|引起|导致|任何|明显|一点|什么|的|有|很|太|那么|\s){0,6}$/u.test(prefix))continue;
      matches.push(match[0]);
    }
  }
  return [...new Set(matches)];
}
function analyze(record){
  const flags=[];
  for(const [key,title,team,action,pattern] of risks){
    const evidence=hits(record.text,pattern);
    if(evidence.length)flags.push({key,title,team,action,evidence,category:["auth","expiry"].includes(key)?"真伪临期":"产品品质",type:"risk",priority:key==="reaction"?"P1":"P2"});
  }
  return flags;
}
function classify(record,flags){
  const result=[];
  for(const [key,title,team,action,pattern] of ordinary){
    const evidence=pattern?hits(record.text,pattern):flags.filter(f=>["auth","expiry"].includes(f.key)).flatMap(f=>f.evidence);
    if(evidence.length)result.push({key,title,team,action,evidence,type:"ordinary",priority:"P3"});
  }
  return result;
}
function coverage(records){
  const ordinaryRows=ordinary.map(([,label])=>({label,annotated:0,hit:0,extra:0}));
  const riskRows=risks.map(([,label])=>({label,annotated:0,hit:0,extra:0}));
  let eligible=0, labeled=0, riskLabeled=0;
  const compare=(table,expected,predicted)=>{
    if(!Array.isArray(expected))return;
    for(const entry of table){
      const wanted=expected.includes(entry.label), found=predicted.has(entry.label);
      if(wanted){entry.annotated++;if(found)entry.hit++;}
      else if(found)entry.extra++;
    }
  };
  for(const record of records){
    const traceable=(record.source&&record.date)||(record.platform&&record.platformId);
    if(!["商品评价区","授权后台导出"].includes(record.origin)||!traceable)continue;
    eligible++;
    if(Array.isArray(record.expected))labeled++;
    if(Array.isArray(record.expectedRisk))riskLabeled++;
    if(!Array.isArray(record.expected)&&!Array.isArray(record.expectedRisk))continue;
    const flags=analyze(record);
    compare(ordinaryRows,record.expected,new Set([...classify(record,flags).map(x=>x.title),...flags.map(x=>x.category)]));
    compare(riskRows,record.expectedRisk,new Set(flags.map(x=>x.title)));
  }
  return {eligible,labeled,riskLabeled,ordinaryRows,riskRows};
}
function itemKey(record){
  if(record.sku)return ["sku",record.brand||"未知品牌",record.sku];
  return ["unknown",record.platform,record.shop,record.brand,record.platformSku||record.product||record.id];
}
function reviewData(records){
  const groups=new Map();
  let unidentified=0, ordinaryCount=0, riskCount=0, lowCount=0,ratedCount=0;
  function add(record,matched){
    const id=JSON.stringify([...itemKey(record),matched.type,matched.key]);
    if(!groups.has(id))groups.set(id,{...matched,id,sku:record.sku,platformSku:record.platformSku,platform:record.platform,product:record.product,brand:record.brand,rows:[]});
    groups.get(id).rows.push({...record,matched:matched.evidence});
  }
  for(const record of records){
    if(record.rating!=null){ratedCount++;if(record.rating<=2)lowCount++;}
    const flags=analyze(record);
    const matches=classify(record,flags);
    if(flags.length){riskCount++;for(const f of flags)add(record,f);}
    else if(matches.length)ordinaryCount++;
    else if(record.rating!=null&&record.rating<=3){
      unidentified++;
      add(record,{key:"review",title:"待人工归因",team:"service",action:"核对完整评价与售后记录，确认责任口。",evidence:[],type:"pending",priority:"待核"});
    }
    for(const m of matches){
      if(m.key==="trace"&&flags.some(f=>["auth","expiry"].includes(f.key)))continue;
      add(record,m);
    }
  }
  const priority={"P1":1,"P2":2,"待核":3,"P3":4};
  const list=[...groups.values()].sort((a,b)=>priority[a.priority]-priority[b.priority]||b.rows.length-a.rows.length||a.title.localeCompare(b.title,"zh"));
  return {list,unidentified,ordinaryCount,riskCount,lowCount,ratedCount};
}
function questionData(records){
  const groups=new Map();
  for(const row of records){
    const match=topics.filter(([,pattern])=>pattern.test(row.text));
    const tags=match.length?match.map(([name])=>name):["其他问题"];
    for(const topic of tags){
      const id=JSON.stringify([...itemKey(row),topic]);
      if(!groups.has(id))groups.set(id,{topic,sku:row.sku,product:row.product,brand:row.brand,rows:[],unanswered:0,unknown:0});
      const g=groups.get(id);
      g.rows.push(row);
      if(row.answers===0)g.unanswered++;
      if(row.answers==null)g.unknown++;
    }
  }
  return [...groups.values()].sort((a,b)=>Number(b.unanswered>=2)-Number(a.unanswered>=2)||b.unanswered-a.unanswered||b.rows.length-a.rows.length);
}
const ordinaryLabel=ordinary.map(([key,title])=>[key,title]);
const csv=matrix=>"\uFEFF"+Papa.unparse(matrix,{escapeFormulae:/^[\s\u0000-\u001f]*[=+\-@]|^[\t\r\n]/});
globalThis.Dispatch={teams,ordinaryLabel,ingest,reviewData,questionData,sourceUrl,csv,coverage,sourceKinds};
})();
