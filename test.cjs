const assert=require("node:assert/strict");
globalThis.Papa=require("./vendor/papaparse.min.js");
require("./engine.js");
require("./sample.js");
const d=Dispatch;
const demo=d.reviewData(PUBLIC_REVIEWS);
assert.equal(demo.riskCount,0);
assert.equal(demo.ordinaryCount,1);
assert.deepEqual(demo.list.map(x=>x.key).sort(),["pack","service"]);
const header=["评价ID","平台","店铺","品牌","内部SKU","商品名称","星级","评价内容","来源链接"];
const rows=[
 ["001","京东","店甲","测试品牌","UT1","测试洗面奶","5","洗完脸红肿又刺痛但物流挺快","https://example.org/a?token=secret"],
 ["002","天猫","店乙","测试品牌","UT1","测试洗面奶","2","收到漏液，客服回复敷衍；我的手机号13812345678",""],
 ["003","京东","店甲","测试品牌","UT1","测试洗面奶","5","用了没有过敏，没有任何的刺激，物流快",""],
 ["004","京东","店甲","测试品牌","UT1","测试洗面奶","1","用完刺痛，快过期，感觉没效果",""],
 ["005","京东","店甲","测试品牌","UT1","测试洗面奶","3","真的很一般",""],
 ["006","京东","店甲","测试品牌","UT2","测试乳液","2","不像正品，查不到防伪",""],
 ["007","京东","店甲","测试品牌","UT1","测试洗面奶","5","之前担心会不会过敏，实际用完没过敏",""],
 ["008","京东","店甲","测试品牌","UT1","测试洗面奶","1","发货慢，发错货，不符合预期，洗不干净",""],
 ["002","天猫","店乙","测试品牌","UT1","测试洗面奶","2","重复行",""]
];
const loaded=d.ingest(d.csv([header,...rows]),"review");
assert.equal(loaded.duplicates,1);
assert.equal(loaded.data.length,8);
assert.ok(!loaded.data[0].source.includes("token"));
assert.ok(!loaded.data[1].text.includes("13812345678"));
const result=d.reviewData(loaded.data);
assert.equal(result.riskCount,3);
assert.equal(result.ordinaryCount,2);
assert.equal(result.unidentified,1);
assert.equal(result.list.find(x=>x.key==="reaction").rows.length,2);
const categories=new Set(result.list.map(x=>x.category||x.title));
for(const [,title] of d.ordinaryLabel)assert.ok(categories.has(title),title);
assert.equal(d.ingest(d.csv([header,rows[0]]),"review",loaded.data).duplicates,1);
const q=d.ingest(d.csv([["问题","回答数","内部SKU","品牌"],["会不会过敏？","0","UT1","测试品牌"],["敏感肌能用吗？","0","UT1","测试品牌"],["孕妇能用吗？","0","UT1","测试品牌"],["敏感肌能用吗？","","UT1","测试品牌"]]),"question");
const qgroups=d.questionData(q.data);
assert.equal(qgroups[0].topic,"敏感肌适用");
assert.equal(qgroups[0].unanswered,2);
assert.equal(qgroups[0].unknown,1);
assert.equal(qgroups[1].topic,"孕期与哺乳期");
assert.match(d.csv([[" \t=1+1"]]),/' \t=1\+1/);
console.log("Public evidence and both handoffs, seven categories, adverse reaction, negations, duplicate ID and Q&A semantics verified.");

assert.equal(d.coverage(PUBLIC_REVIEWS).eligible,0);
const provenanceFields=["评价ID","平台","评价内容","采样来源","购得方式","店铺经营类型","人工归因","人工风险"];
const full="  封口掉了，客服回复敷衍。\r\n联系电话 13812345678。  ";
const verified=d.ingest(d.csv([provenanceFields,
  ["v1","京东",full,"商品评价区","零元拼购","第三方","包装","无"],
  ["v2","京东","用完刺痛","授权后台导出","POP","","产品品质","疑似不良反应"],
  ["v3","京东","快过期","公开聚合页","","","真伪临期","临期反馈"],
  ["","京东","物流很慢","商品评价区","","","物流时效","无"]
]),"review").data;
assert.equal(verified[0].original,full);
assert.equal(verified[0].channel,"零元拼购");
assert.equal(verified[0].sellerType,"第三方");
assert.ok(!verified[0].text.includes("13812345678"));
assert.equal(verified[1].channel,"");
assert.equal(verified[1].sellerType,"POP");
const validated=d.coverage(verified);
assert.equal(validated.eligible,2);
assert.equal(validated.labeled,2);
assert.equal(validated.ordinaryRows.find(x=>x.label==="包装").hit,1);
assert.equal(validated.ordinaryRows.find(x=>x.label==="客服服务").extra,1);
assert.equal(validated.ordinaryRows.find(x=>x.label==="真伪临期").annotated,0);
assert.equal(validated.riskRows.find(x=>x.label==="疑似不良反应").hit,1);
console.log("Original text, purchase channels, seller types, non-eligible sources and manual validation metrics verified.");

