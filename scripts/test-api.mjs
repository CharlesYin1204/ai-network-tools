import { readFile,writeFile } from 'node:fs/promises';
import { query,db } from '../lib/db.mjs';
const base=process.env.TEST_BASE_URL||'http://127.0.0.1:3051';
const access=JSON.parse(await readFile(new URL('../data/access.json',import.meta.url),'utf8'));
const checks=[],users=[];let adminCookie='',aCookie='',bCookie='';
async function request(path,{method='GET',body,cookie,expected=200,origin,form}={}){
 const response=await fetch(base+'/api/'+path,{method,headers:{...(body?{'content-type':'application/json'}:{}),...(cookie?{cookie}:{}),...(origin?{origin}:{})},body:form|| (body?JSON.stringify(body):undefined)});
 const type=response.headers.get('content-type');const data=type?.includes('json')?await response.json():await response.arrayBuffer();
 if(response.status!==expected)throw new Error(`${method} ${path}: expected ${expected}, got ${response.status}: ${data.error||'unexpected response'}`);
 checks.push({method,path,status:response.status,success:true});return {data,cookie:response.headers.get('set-cookie')?.split(';')[0],response};
}
try{
 await request('health');await request('public/config');const publicRows=(await request('resources')).data.items;if(publicRows.length<12)throw new Error('Expected 12 demonstration resources');
 await request('admin/users',{expected:401});await request('auth/login',{method:'POST',body:access.admin,origin:'https://evil.example',expected:403});
 adminCookie=(await request('auth/login',{method:'POST',body:access.admin})).cookie;
 const stamp=Date.now();
 for(const label of ['a','b']){const r=await request('auth/register',{method:'POST',body:{name:'集成验证 '+label,email:`qa-${stamp}-${label}@example.com`,password:'QA-Integration2026!'},expected:201});users.push(r.data.user.id);if(label==='a')aCookie=r.cookie;else bCookie=r.cookie;}
 await request('admin/users',{cookie:aCookie,expected:403});
 await request('profile',{method:'PATCH',cookie:aCookie,body:{company:'演示验证公司',industry:'设计',title:'品牌顾问',skills:['品牌设计'],visibility:'public'}});
 const published=(await request('resources',{method:'POST',cookie:aCookie,body:{title:'集成验证资源',category:'专业服务',description:'此临时记录用于验证发布和审核闭环。',price:120,unit:'次',visibility:'public',tags:['验证']},expected:201})).data.item;
 if(published.status!=='pending')throw new Error('New resource must await moderation');
 await request('resources/'+published.id,{cookie:bCookie,expected:404});
 await request('resources/'+published.id,{method:'PATCH',cookie:bCookie,body:{title:'unauthorized'},expected:403});
 await request('admin/resources/'+published.id,{method:'PATCH',cookie:adminCookie,body:{status:'approved'}});
 await request('resources/'+published.id,{cookie:bCookie});await request('resources/'+published.id+'/favorite',{method:'POST',cookie:bCookie});
 const fav=(await request('resources?favorites=1',{cookie:bCookie})).data.items;if(!fav.some(v=>v.id===published.id))throw new Error('Favorite missing');
 const demand=(await request('demands',{method:'POST',cookie:bCookie,body:{title:'集成验证需求',category:'专业服务',description:'需要品牌设计咨询',budget:500,location:'深圳'},expected:201})).data.item;
 const match=(await request('matches',{method:'POST',cookie:bCookie,body:{resourceId:published.id,message:'希望合作验证流程'},expected:201})).data;
 await request('matches/'+match.id,{method:'PATCH',cookie:bCookie,body:{status:'accepted'},expected:403});
 await request('matches/'+match.id,{method:'PATCH',cookie:aCookie,body:{status:'accepted'}});
 await request('messages',{method:'POST',cookie:bCookie,body:{recipientId:users[0],content:'已接受合作后的测试消息'},expected:201});
 const messages=(await request('messages?with='+users[1],{cookie:aCookie})).data.items;if(!messages.length)throw new Error('Message not persisted');
 await request('matches/'+match.id,{method:'PATCH',cookie:aCookie,body:{status:'completed'}});
 await request('contacts',{method:'POST',cookie:aCookie,body:{userId:users[1],message:'建立验证好友关系'}});
 const contact=(await request('contacts',{cookie:bCookie})).data.items.find(v=>v.requesterId===users[0]);
 await request('contacts/'+contact.id,{method:'PATCH',cookie:bCookie,body:{status:'accepted'}});
 await request('contacts/'+contact.id,{method:'PATCH',cookie:aCookie,body:{starred:true}});
 let net=(await request('network',{cookie:aCookie})).data;if(!net.items.some(v=>v.id===users[1]&&v.degree===1))throw new Error('Accepted friend not visible as degree 1');
 await request('resources/'+published.id,{method:'PATCH',cookie:aCookie,body:{visibility:'contacts'}});
 await request('admin/resources/'+published.id,{method:'PATCH',cookie:adminCookie,body:{status:'approved'}});
 await request('resources/'+published.id,{expected:404});await request('resources/'+published.id,{cookie:bCookie});
 await request('contacts/'+contact.id,{method:'PATCH',cookie:aCookie,body:{hidden:true}});
 await request('resources/'+published.id,{cookie:bCookie,expected:404});
 await request('profile',{method:'PATCH',cookie:bCookie,body:{visibility:'hidden'}});
 net=(await request('network',{cookie:aCookie})).data;if(net.items.some(v=>v.id===users[1]))throw new Error('Hidden profile leaked into network');
 await request('notifications',{cookie:aCookie});await request('notifications',{method:'PATCH',cookie:aCookie,body:{all:true}});await request('dashboard',{cookie:aCookie});
 await request('demands/'+demand.id,{method:'PATCH',cookie:bCookie,body:{status:'closed'}});
 for(const route of ['stats','users','resources','demands','matches','leads','settings','ai-logs','apk'])await request('admin/'+route,{cookie:adminCookie});
 const models=(await request('admin/models',{cookie:adminCookie})).data.items;if(models.some(v=>'apiKey'in v||'api_key'in v))throw new Error('Model secret exposed');
 const ai=(await request('ai',{method:'POST',cookie:aCookie,body:{action:'chat',message:'请用一句话说明你能帮我做什么。'}})).data;if(!ai.answer)throw new Error('AI answer missing');
 await request('ai/conversations/'+ai.conversationId,{cookie:aCookie});await request('ai/conversations/'+ai.conversationId,{cookie:bCookie,expected:404});
 const added=(await request('admin/models',{method:'POST',cookie:adminCookie,body:{name:'QA disposable disabled model',model:'test-disabled',baseUrl:'https://api.apilio.ai/v1',apiKey:'test-key-unused',enabled:false},expected:201})).data.item;
 await request('admin/models/'+added.id,{method:'PATCH',cookie:adminCookie,body:{name:'QA updated'}});await request('admin/models/'+added.id,{method:'DELETE',cookie:adminCookie});
 const apk=(await request('apk/download')).data;if(Buffer.from(apk).subarray(0,2).toString()!=='PK')throw new Error('APK is not a ZIP package');await request('apk/download?file=../../.env.local',{expected:404});
 const cfg=(await request('admin/apk',{cookie:adminCookie})).data.config;await request('admin/apk',{method:'PATCH',cookie:adminCookie,body:cfg});
 const built=(await request('admin/apk/build',{method:'POST',cookie:adminCookie,body:{}})).data.build;if(built.status!=='success')throw new Error('APK build did not succeed');
 await request('admin/users/'+users[0],{method:'PATCH',cookie:adminCookie,body:{status:'disabled'}});await request('profile',{cookie:aCookie,expected:401});
 await request('auth/logout',{method:'POST',cookie:bCookie});
 console.log('PASS:',checks.length,'HTTP integration checks');
}catch(error){checks.push({success:false,error:error.message});console.error('FAIL:',error.message);process.exitCode=1;}
finally{
 for(const uid of users){
  await query('DELETE FROM ai_daily_usage WHERE user_id=?',[uid]);
  await query('DELETE am FROM ai_messages am JOIN ai_conversations ac ON ac.id=am.conversation_id WHERE ac.user_id=?',[uid]);await query('DELETE FROM ai_conversations WHERE user_id=?',[uid]);await query('UPDATE ai_logs SET user_id=NULL WHERE user_id=?',[uid]);
  await query('DELETE FROM messages WHERE sender_id=? OR recipient_id=?',[uid,uid]);await query('DELETE FROM notifications WHERE user_id=?',[uid]);await query('DELETE FROM introductions WHERE requester_id=? OR connector_id=? OR target_id=?',[uid,uid,uid]);await query('DELETE FROM contacts WHERE requester_id=? OR recipient_id=?',[uid,uid]);await query('DELETE FROM matches WHERE requester_id=? OR owner_id=?',[uid,uid]);await query('DELETE f FROM favorites f JOIN resources r ON r.id=f.resource_id WHERE r.user_id=? OR f.user_id=?',[uid,uid]);await query('DELETE FROM resources WHERE user_id=?',[uid]);await query('DELETE FROM demands WHERE user_id=?',[uid]);await query('DELETE FROM users WHERE id=?',[uid]);
 }
 await writeFile(new URL('../data/api-test-results.json',import.meta.url),JSON.stringify({testedAt:new Date().toISOString(),base,checks},null,2));await db().end();
}
