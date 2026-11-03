import {readFile,writeFile,chown} from 'node:fs/promises';
import bcrypt from 'bcryptjs';
import {query,db} from '../lib/db.mjs';

const base=process.env.TEST_BASE_URL||'http://127.0.0.1:3050';
const access=JSON.parse(await readFile(new URL('../data/access.json',import.meta.url),'utf8'));
const checks=[],fixtures=[];let adminCookie,savedSettings;
async function req(path,{method='GET',body,cookie,expected=200}={}){
 const response=await fetch(base+'/api/'+path,{method,headers:{...(body!==undefined?{'Content-Type':'application/json'}:{}),...(cookie?{cookie}:{})},body:body!==undefined?JSON.stringify(body):undefined});
 const data=await response.json();if(response.status!==expected)throw new Error(`${method} ${path}: expected ${expected}, got ${response.status}: ${data.error||''}`);
 checks.push({method,path,status:response.status,success:true});return {data,cookie:response.headers.get('set-cookie')?.split(';')[0]};
}
function assert(value,message){if(!value)throw new Error(message);}
async function link(from,to){await req('contacts',{method:'POST',cookie:from.cookie,body:{userId:to.id,message:'本轮合同验证好友'}});const contact=(await req('contacts',{cookie:to.cookie})).data.items.find(v=>v.requesterId===from.id);await req('contacts/'+contact.id,{method:'PATCH',cookie:to.cookie,body:{status:'accepted'}});return contact.id;}
try{
 const apk=(await req('apk')).data.apk;assert(apk?.downloadUrl,'Public APK alias missing');
 const categories=(await req('public/config')).data.categories;assert(categories.includes('专业技能')&&!categories.includes('专业服务'),'Categories were not migrated');
 assert((await req('posts')).data.items.length>=3,'Three demonstration posts missing');
 adminCookie=(await req('auth/login',{method:'POST',body:access.admin})).cookie;
 savedSettings=(await req('admin/settings',{cookie:adminCookie})).data;
 const stamp=Date.now(),password='Contract-QA-2026!';
 for(const label of ['A','B','C']){
  const email=`contract-${stamp}-${label}@example.com`;
  const inserted=await query('INSERT INTO users(name,email,password_hash,bio,skills) VALUES(?,?,?,?,?)',['合同验证 '+label,email,await bcrypt.hash(password,10),'临时集成测试用户','[]']);
  const fixture={id:inserted.insertId,email};fixtures.push(fixture);fixture.cookie=(await req('auth/login',{method:'POST',body:{email,password}})).cookie;
 }
 const [a,b,c]=fixtures;
 await req('profile',{method:'PATCH',cookie:a.cookie,body:null,expected:400});
 const profile=(await req('profile',{method:'PATCH',cookie:c.cookie,body:{location:'杭州',title:'隐私验证职位',skills:'产品规划，数据分析、资源整合',hideTitle:'true'}})).data.user;
 assert(profile.location==='杭州'&&profile.city==='杭州'&&profile.skills.length===3&&profile.hideTitle===true,'Profile aliases or normalization failed');
 await link(a,b);await link(b,c);
 await req('profile',{method:'PATCH',cookie:c.cookie,body:{visibility:'second_degree'}});
 const netA=(await req('network',{cookie:a.cookie})).data.items.find(v=>v.id===c.id),netB=(await req('network',{cookie:b.cookie})).data.items.find(v=>v.id===c.id);
 assert(netA?.degree===2&&netA.title===''&&netB?.title==='隐私验证职位','Title visibility leaked or direct title missing');
 const demands=(await req('demands',{method:'POST',cookie:c.cookie,body:{title:'合同验证私有需求',category:'专业技能',description:'仅限好友看到的临时需求',budget:100,visibility:'contacts'},expected:201})).data.item;
 assert(!(await req('demands',{cookie:a.cookie})).data.items.some(v=>v.id===demands.id),'Contacts demand leaked to second degree');
 assert((await req('demands',{cookie:b.cookie})).data.items.some(v=>v.id===demands.id),'Direct contact demand missing');
 await req('matches',{method:'POST',cookie:a.cookie,body:{demandId:demands.id,message:'不应该成功的越权请求'},expected:404});
 await req('demands/'+demands.id,{method:'PATCH',cookie:c.cookie,body:{visibility:'second_degree',status:'active'}});
 assert((await req('demands',{cookie:a.cookie})).data.items.some(v=>v.id===demands.id&&v.status==='active'),'Second-degree demand not visible');
 await req('admin/settings',{method:'PATCH',cookie:adminCookie,body:{requireReview:'false',supportEmail:'qa@example.com',aiDailyLimit:'50',announcement:'临时验证公告'}});
 let resource=(await req('resources',{method:'POST',cookie:a.cookie,body:{title:'合同验证资源',description:'用于确认审核开关与状态别名的临时资源',category:'专业技能',price:0},expected:201})).data.item;
 assert(resource.status==='approved'&&resource.ownerId===a.id,'Review switch or ownerId alias failed');
 await req('resources/'+resource.id,{method:'PATCH',cookie:a.cookie,body:{status:'closed'}});
 assert((await req('resources?mine=1',{cookie:a.cookie})).data.items.find(v=>v.id===resource.id)?.status==='closed','Closed resource alias missing');
 await req('resources/'+resource.id,{method:'PATCH',cookie:a.cookie,body:{status:'pending'}});
 await req('admin/settings',{method:'PATCH',cookie:adminCookie,body:{requireReview:true}});
 await req('resources/'+resource.id,{method:'PATCH',cookie:a.cookie,body:{description:'内容更新应重新进入审核队列'}});
 await req('admin/resources/'+resource.id,{method:'PATCH',cookie:adminCookie,body:{status:'rejected',reason:'请补充可提供的具体时间'}});
 assert((await req('resources?mine=1',{cookie:a.cookie})).data.items.find(v=>v.id===resource.id)?.reviewNote==='请补充可提供的具体时间','Moderation reason not persisted');
 await req('admin/resources/'+resource.id,{method:'PATCH',cookie:adminCookie,body:{status:'published'}});
 const post=(await req('posts',{method:'POST',cookie:a.cookie,body:{title:'合同验证动态',content:'这是用于测试动态互动与权限的临时内容。',type:'insight',visibility:'public',industry:'互联网'},expected:201})).data.item;
 await req('posts/'+post.id+'/like',{method:'POST',cookie:b.cookie});
 await req('posts/'+post.id+'/comments',{method:'POST',cookie:b.cookie,body:{content:'临时验证评论'},expected:201});
 const publicPost=(await req('posts/'+post.id)).data.item;assert(publicPost.likeCount===1&&publicPost.commentCount===1,'Post interaction counters incorrect');
 await req('posts/'+post.id,{method:'PATCH',cookie:a.cookie,body:{visibility:'contacts'}});
 await req('posts/'+post.id+'/comments',{cookie:c.cookie,expected:404});
 await req('posts/'+post.id,{method:'PATCH',cookie:a.cookie,body:{visibility:'second_degree'}});await req('posts/'+post.id+'/comments',{cookie:c.cookie});
 await req('posts/'+post.id,{method:'PATCH',cookie:b.cookie,body:{content:'越权内容'},expected:403});
 await req('admin/posts/'+post.id,{method:'PATCH',cookie:adminCookie,body:{status:'hidden'}});
 await req('posts/'+post.id,{cookie:b.cookie,expected:404});await req('posts/'+post.id+'/comments',{method:'POST',cookie:b.cookie,body:{content:'隐藏后评论'},expected:404});
 await req('posts/'+post.id,{method:'PATCH',cookie:a.cookie,body:{status:'published'},expected:403});
 await req('admin/posts/'+post.id,{method:'PATCH',cookie:adminCookie,body:{status:'published'}});
 await req('posts/'+post.id,{method:'PATCH',cookie:a.cookie,body:{status:'closed'}});
 assert((await req('posts?mine=1',{cookie:a.cookie})).data.items.find(v=>v.id===post.id)?.status==='closed','Owner close action failed');
 await req('admin/posts',{cookie:adminCookie});
 const intro=(await req('introductions',{method:'POST',cookie:a.cookie,body:{targetId:c.id,message:'请共同好友帮助引荐'}})).data;
 assert(!(await req('introductions',{cookie:c.cookie})).data.items.some(v=>v.id===intro.id),'Unapproved introduction leaked to target');
 await req('introductions/'+intro.id,{method:'PATCH',cookie:a.cookie,body:{status:'accepted'},expected:403});
 await req('introductions/'+intro.id,{method:'PATCH',cookie:b.cookie,body:{status:'accepted'}});
 const targetContact=(await req('contacts',{cookie:c.cookie})).data.items.find(v=>v.requesterId===a.id);
 assert(targetContact?.status==='pending','Connector approval must create target confirmation request');
 assert(!('hiddenBy' in targetContact)&&!('starredBy' in targetContact),'Private contact preferences leaked');
 await req('contacts/'+targetContact.id,{method:'PATCH',cookie:c.cookie,body:{status:'accepted'}});
 assert((await req('network',{cookie:a.cookie})).data.items.some(v=>v.id===c.id&&v.degree===1),'Introduction loop did not establish direct relation');
 await req('profile',{method:'PATCH',cookie:c.cookie,body:{visibility:'hidden'}});
 assert(!(await req('network',{cookie:a.cookie})).data.items.some(v=>v.id===c.id),'Hidden profile leaked');
 await req('admin/settings',{method:'PATCH',cookie:adminCookie,body:{aiDailyLimit:1}});
 const ai=(await req('ai',{method:'POST',cookie:a.cookie,body:{action:'chat',message:'请用一句话回答：我可以在这里分享什么？'}})).data;assert(ai.answer,'Real AI response missing');
 await req('ai',{method:'POST',cookie:a.cookie,body:{action:'chat',message:'本次应被每日限额阻止'},expected:429});
 console.log('PASS:',checks.length,'new contract/community/privacy HTTP checks; one real AI call.');
}catch(error){checks.push({success:false,error:error.message});console.error('FAIL:',error.message);process.exitCode=1;}
finally{
 if(savedSettings&&adminCookie)try{await req('admin/settings',{method:'PATCH',cookie:adminCookie,body:savedSettings});}catch(error){console.error('Could not restore settings:',error.message);process.exitCode=1;}
 for(const u of fixtures){
  const uid=u.id;await query('DELETE l FROM post_likes l JOIN posts p ON p.id=l.post_id WHERE p.user_id=? OR l.user_id=?',[uid,uid]);await query('DELETE c FROM post_comments c JOIN posts p ON p.id=c.post_id WHERE p.user_id=? OR c.user_id=?',[uid,uid]);await query('DELETE FROM posts WHERE user_id=?',[uid]);
  await query('DELETE am FROM ai_messages am JOIN ai_conversations ac ON ac.id=am.conversation_id WHERE ac.user_id=?',[uid]);await query('DELETE FROM ai_conversations WHERE user_id=?',[uid]);await query('DELETE FROM ai_daily_usage WHERE user_id=?',[uid]);await query('UPDATE ai_logs SET user_id=NULL WHERE user_id=?',[uid]);
  await query('DELETE FROM messages WHERE sender_id=? OR recipient_id=?',[uid,uid]);await query('DELETE FROM notifications WHERE user_id=?',[uid]);await query('DELETE FROM introductions WHERE requester_id=? OR connector_id=? OR target_id=?',[uid,uid,uid]);await query('DELETE FROM contacts WHERE requester_id=? OR recipient_id=?',[uid,uid]);await query('DELETE FROM matches WHERE requester_id=? OR owner_id=?',[uid,uid]);await query('DELETE f FROM favorites f JOIN resources r ON r.id=f.resource_id WHERE r.user_id=? OR f.user_id=?',[uid,uid]);await query('DELETE FROM resources WHERE user_id=?',[uid]);await query('DELETE FROM demands WHERE user_id=?',[uid]);await query('DELETE FROM users WHERE id=?',[uid]);
 }
 await writeFile(new URL('../data/contract-test-results.json',import.meta.url),JSON.stringify({testedAt:new Date().toISOString(),base,checks},null,2));await db().end();
}
