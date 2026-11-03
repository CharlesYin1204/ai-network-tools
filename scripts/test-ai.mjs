import { writeFile } from 'node:fs/promises';
import { query,db,record } from '../lib/db.mjs';
import { testModel,runAI } from '../lib/ai.mjs';

const tests=[];
const models=await query('SELECT * FROM ai_models ORDER BY id');
for(const model of models){
  console.log('Testing configured model:',model.model);
  const started=Date.now();
  try{const r=await testModel(model);tests.push({type:'connection',model:model.model,success:true,answer:r.answer,durationMs:r.durationMs});console.log(model.model,'success',r.durationMs+'ms');}
  catch(error){tests.push({type:'connection',model:model.model,success:false,error:error.message,durationMs:Date.now()-started});console.log(model.model,'failed:',error.message);}
}
const good=tests.find(v=>v.success);
if(good){
 const chosen=models.find(v=>v.model===good.model);await query('UPDATE ai_models SET is_default=IF(id=?,1,0)',[chosen.id]);
 const user=record((await query("SELECT * FROM users WHERE email='demo@xunfu.local'"))[0]);
 const actions={chat:'我有品牌设计能力，希望从熟人资源开始找合作，请给我两个具体建议。',publish:'我提供初创品牌 Logo 与视觉设计，深圳线上线下均可，预算从 2800 元起。请生成发布文案。',recommend:'深圳的教育社区需要品牌设计，希望预算不超过 6000 元，请找适合的资源。',valuation:'一套面向初创公司的品牌视觉方案，包含 Logo 和基础应用，设计师有 3 年经验，深圳，请评估参考价。',demand:'我想在深圳周末举办 15 人产品交流活动，预算 800 元，需要场地 3 小时，请帮我梳理需求。',people:'我需要一位擅长数据分析的讲师。请在可见人脉中找人，并说明需要谁引荐。'};
 for(const [action,message]of Object.entries(actions)){
  console.log('Testing AI feature:',action);const started=Date.now();
  try{const r=await runAI(user,{action,message,modelId:chosen.id});tests.push({type:'feature',action,model:r.model,success:true,answer:r.answer,durationMs:r.durationMs,conversationId:r.conversationId});console.log(action,'success',r.durationMs+'ms');}
  catch(error){tests.push({type:'feature',action,model:chosen.model,success:false,error:error.message,durationMs:Date.now()-started});console.log(action,'failed:',error.message);}
 }
}
await writeFile(new URL('../data/ai-test-results.json',import.meta.url),JSON.stringify({testedAt:new Date().toISOString(),tests},null,2));
await db().end();
