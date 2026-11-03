import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { query, record, json } from '../../../lib/db.mjs';
import { ApiError, fail, string, strings, boolean, requireString, id, amount, currentUser, requireUser, requireAdmin, checkOrigin, rateLimit, token, encrypt, safeModel, notify } from '../../../lib/security.mjs';
import { resources, demands, posts, network, categories, normalizeCategory, resourceStatus, demandStatus } from '../../../lib/platform.mjs';
import { runAI, testModel, validateBaseUrl } from '../../../lib/ai.mjs';
import { getApkConfig, saveApkConfig, listApkBuilds, buildApk, registerUploadedApk, getPublishedApk, readApkDownload } from '../../../lib/apk.mjs';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 120;
const result = (data,status=200) => NextResponse.json(data,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
const oneOf = (value,values,label='状态') => { if(!values.includes(value))fail(`不支持的${label}`); return value; };
const list = rows => ({items:rows.map(record)});
const number = v => Number(v)||0;
async function bodyOf(req) {
  if(Number(req.headers.get('content-length')||0)>100000)fail('请求内容过长',413);
  const chunks=[];let size=0;const reader=req.body?.getReader();
  if(reader)while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>100000){await reader.cancel();fail('请求内容过长',413);}chunks.push(value);}
  const text=Buffer.concat(chunks).toString('utf8');let parsed;try{parsed=text?JSON.parse(text):{};}catch{fail('JSON 格式不正确');}
  if(!parsed||Array.isArray(parsed)||typeof parsed!=='object')fail('请求正文必须为 JSON 对象');return parsed;
}
async function settings() {const rows=await query('SELECT * FROM settings');return Object.fromEntries(rows.map(v=>[v.setting_key,json(v.setting_value,null)]));}
async function resourceOwned(user,resourceId) {const r=await query('SELECT * FROM resources WHERE id=?',[resourceId]);if(!r[0])fail('资源不存在',404);if(r[0].user_id!==user.id&&user.role!=='admin')fail('无权编辑此资源',403);return r[0];}
function publicUser(user){return user;}
const flags = ['public','contacts','second_degree'];

async function handler(req, context) {
  try {
    checkOrigin(req);
    const {path=[]}=await context.params;const route=path.join('/');const method=req.method;
    const url=new URL(req.url);const search=url.searchParams;
    const user=await currentUser(req);
    const b=['POST','PATCH','PUT','DELETE'].includes(method)&&!req.headers.get('content-type')?.includes('multipart/form-data')?await bodyOf(req):{};
    if(route==='health'&&method==='GET'){await query('SELECT 1');return result({ok:true,database:'connected',service:'xunfu'});}
    if(route==='session'&&method==='GET')return result({user:publicUser(user)});
    if(route==='public/config'&&method==='GET')return result({...await settings(),categories,apk:await getPublishedApk()});
    if(route==='apk'&&method==='GET')return result({apk:await getPublishedApk()});
    if(route==='apk/download'&&method==='GET'){
      try {const file=await readApkDownload(search.get('file')||undefined);return new Response(file.buffer,{headers:{'Content-Type':'application/vnd.android.package-archive','Content-Disposition':`attachment; filename="${file.fileName}"`,'Content-Length':String(file.buffer.length),'Cache-Control':'public,max-age=3600','X-Content-Type-Options':'nosniff','ETag':file.sha256}});}catch(error){fail(error.message,error.code==='APK_NOT_FOUND'?404:400);}
    }
    if(route==='auth/login'&&method==='POST'){
      rateLimit('login:'+req.headers.get('x-forwarded-for'),12,15*60000);
      const email=requireString(b.email,'邮箱',190).toLowerCase();const password=requireString(b.password,'密码',150);
      const rows=await query('SELECT * FROM users WHERE email=?',[email]);
      if(!rows[0]||!await bcrypt.compare(password,rows[0].password_hash))fail('邮箱或密码不正确',401);
      if(rows[0].status!=='active')fail('账号已停用，请联系管理员',403);
      const u=record(rows[0]);const response=result({user:u});response.cookies.set('xunfu_session',await token(u),{httpOnly:true,sameSite:'lax',secure:url.protocol==='https:',path:'/',maxAge:7*86400});return response;
    }
    if(route==='auth/register'&&method==='POST'){
      rateLimit('register:'+req.headers.get('x-forwarded-for'),6,3600000);
      const site=await settings();if(site.registrationEnabled===false)fail('暂未开放注册',403);
      const name=requireString(b.name,'姓名',80),email=requireString(b.email,'邮箱',190).toLowerCase(),password=requireString(b.password,'密码',150);
      if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))fail('请输入有效邮箱');if(password.length<8)fail('密码至少需要 8 位');
      if((await query('SELECT id FROM users WHERE email=?',[email])).length)fail('该邮箱已被注册',409);
      const insert=await query('INSERT INTO users(name,email,password_hash,bio,skills) VALUES(?,?,?,?,?)',[name,email,await bcrypt.hash(password,12),'','[]']);
      const u=record((await query('SELECT * FROM users WHERE id=?',[insert.insertId]))[0]);await notify(u.id,'欢迎来到询赋','完善名片、发布资源或告诉小赋你的需求，开始连接有价值的人脉。');
      const response=result({user:u},201);response.cookies.set('xunfu_session',await token(u),{httpOnly:true,sameSite:'lax',secure:url.protocol==='https:',path:'/',maxAge:7*86400});return response;
    }
    if(route==='auth/logout'&&method==='POST'){const response=result({ok:true});response.cookies.set('xunfu_session','',{httpOnly:true,sameSite:'lax',path:'/',maxAge:0});return response;}
    if(route==='resources'&&method==='GET'){
      if(search.has('mine')||search.has('favorites'))requireUser(user);
      return result({items:await resources(user,{q:string(search.get('q'),100),category:string(search.get('category'),60),type:string(search.get('type'),60),mine:search.get('mine')==='1',favorites:search.get('favorites')==='1'})});
    }
    if(path[0]==='resources'&&path.length===2&&method==='GET'){
      const rows=await resources(user,{id:id(path[1])});let item=rows[0];if(!item&&user){const own=await resources(user,{id:id(path[1]),mine:true});item=own[0];}if(!item)fail('资源不存在或无权访问',404);return result({item});
    }
    if(route==='resources'&&method==='POST'){
      requireUser(user);rateLimit('publish:'+user.id,15,3600000);
      const title=requireString(b.title,'资源标题',180),description=requireString(b.description,'资源描述',10000),category=normalizeCategory(requireString(b.category,'分类',60));
      const visibility=oneOf(b.visibility||'public',flags,'可见范围');const tags=Array.isArray(b.tags)?b.tags.slice(0,8).map(v=>string(v,30)).filter(Boolean):[];
      const requireReview=boolean((await settings()).requireReview,true);const status=user.role==='admin'||!requireReview?'approved':'pending';
      const ins=await query('INSERT INTO resources(user_id,title,category,type,description,location,price,unit,tags,image,visibility,status) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)',[user.id,title,category,string(b.type||'resource',60),description,string(b.location,120),amount(b.price),string(b.unit||'次',40),JSON.stringify(tags),string(b.image,1000),visibility,status]);
      return result({item:record((await query('SELECT * FROM resources WHERE id=?',[ins.insertId]))[0]),message:status==='approved'?'资源已发布':'资源已提交，审核通过后将展示'},201);
    }
    if(path[0]==='resources'&&path.length===2&&method==='PATCH'){
      requireUser(user);const rid=id(path[1]);const old=await resourceOwned(user,rid);
      const fields=[],values=[];
      for(const key of ['title','category','type','description','location','unit','image'])if(b[key]!==undefined){fields.push(key+'=?');values.push(key==='title'||key==='description'?requireString(b[key],key==='title'?'标题':'描述',key==='description'?10000:180):key==='category'?normalizeCategory(string(b[key],60)):string(b[key],key==='image'?1000:180));}
      if(b.price!==undefined){fields.push('price=?');values.push(amount(b.price));}
      if(b.tags!==undefined){fields.push('tags=?');values.push(JSON.stringify(Array.isArray(b.tags)?b.tags.slice(0,8).map(v=>string(v,30)):[]));}
      if(b.visibility!==undefined){fields.push('visibility=?');values.push(oneOf(b.visibility,flags,'可见范围'));}
      if(b.status!==undefined)oneOf(resourceStatus(b.status),['archived','pending']);
      if(resourceStatus(b.status)==='archived'){fields.push('status=?');values.push('archived');}
      else if(b.status==='pending'||(fields.length&&user.role!=='admin')){fields.push('status=?');values.push(boolean((await settings()).requireReview,true)?'pending':'approved');}
      if(!fields.length)fail('没有可更新的内容');await query(`UPDATE resources SET ${fields.join(',')} WHERE id=?`,[...values,rid]);return result({item:record((await query('SELECT * FROM resources WHERE id=?',[rid]))[0])});
    }
    if(path[0]==='resources'&&path[2]==='favorite'&&method==='POST'){
      requireUser(user);const rid=id(path[1]);if(!(await resources(user,{id:rid})).length)fail('资源不存在或无权访问',404);
      const old=await query('SELECT 1 FROM favorites WHERE user_id=? AND resource_id=?',[user.id,rid]);if(old.length)await query('DELETE FROM favorites WHERE user_id=? AND resource_id=?',[user.id,rid]);else await query('INSERT IGNORE INTO favorites(user_id,resource_id) VALUES(?,?)',[user.id,rid]);return result({favorited:!old.length});
    }
    if(route==='demands'&&method==='GET'){
      const mine=search.get('mine')==='1';if(mine)requireUser(user);
      return result({items:await demands(user,{mine,q:string(search.get('q'),100),category:string(search.get('category'),60)})});
    }
    if(route==='demands'&&method==='POST'){
      requireUser(user);rateLimit('demand:'+user.id,15,3600000);
      const ins=await query('INSERT INTO demands(user_id,title,category,description,budget,location,visibility) VALUES(?,?,?,?,?,?,?)',[user.id,requireString(b.title,'需求标题',180),normalizeCategory(requireString(b.category,'分类',60)),requireString(b.description,'需求描述',10000),amount(b.budget),string(b.location,120),oneOf(b.visibility||'public',flags,'可见范围')]);return result({item:record((await query('SELECT * FROM demands WHERE id=?',[ins.insertId]))[0])},201);
    }
    if(route==='posts'&&method==='GET'){
      const mine=search.get('mine')==='1';if(mine)requireUser(user);return result({items:await posts(user,{mine,q:string(search.get('q'),100),type:string(search.get('type'),30),industry:string(search.get('industry'),100)})});
    }
    if(path[0]==='posts'&&path.length===2&&method==='GET'){
      const pid=id(path[1]);let item=(await posts(user,{id:pid}))[0];if(!item&&user)item=(await posts(user,{id:pid,mine:true}))[0];if(!item)fail('动态不存在或无权查看',404);return result({item});
    }
    if(path[0]==='posts'&&path[2]==='comments'&&method==='GET'){
      const pid=id(path[1]);let item=(await posts(user,{id:pid}))[0];if(!item&&user)item=(await posts(user,{id:pid,mine:true}))[0];if(!item)fail('动态不存在或无权查看',404);
      return result(list(await query("SELECT c.*,u.name AS owner_name,u.avatar AS owner_avatar FROM post_comments c JOIN users u ON u.id=c.user_id WHERE c.post_id=? AND u.status='active' ORDER BY c.id ASC LIMIT 100",[pid])));
    }
    if(path[0]==='demands'&&path.length===2&&method==='PATCH'){
      requireUser(user);const did=id(path[1]);const d=(await query('SELECT * FROM demands WHERE id=?',[did]))[0];if(!d)fail('需求不存在',404);if(d.user_id!==user.id&&user.role!=='admin')fail('无权修改此需求',403);
      await query('UPDATE demands SET title=?,description=?,budget=?,location=?,status=?,visibility=? WHERE id=?',[b.title!==undefined?requireString(b.title,'标题',180):d.title,b.description!==undefined?requireString(b.description,'描述',10000):d.description,b.budget!==undefined?amount(b.budget):d.budget,b.location!==undefined?string(b.location,120):d.location,b.status?oneOf(demandStatus(b.status),['open','closed']):d.status,b.visibility?oneOf(b.visibility,flags):d.visibility,did]);return result({item:record((await query('SELECT * FROM demands WHERE id=?',[did]))[0])});
    }
    if(route==='leads'&&method==='POST'){
      rateLimit('lead:'+req.headers.get('x-forwarded-for'),5,3600000);const phone=requireString(b.phone,'联系方式',80);if(phone.length<5)fail('请输入有效联系方式');
      const insert=await query('INSERT INTO leads(name,phone,company,message) VALUES(?,?,?,?)',[requireString(b.name,'姓名',80),phone,string(b.company,160),requireString(b.message,'咨询内容',3000)]);return result({ok:true,id:insert.insertId,message:'已收到你的咨询，管理员将在后台查看。'},201);
    }
    requireUser(user);
    if(route==='posts'&&method==='POST'){
      rateLimit('posts:'+user.id,20,3600000);const ins=await query('INSERT INTO posts(user_id,title,content,type,visibility,industry) VALUES(?,?,?,?,?,?)',[user.id,requireString(b.title,'动态标题',180),requireString(b.content,'动态内容',10000),oneOf(b.type||'insight',['resource','demand','insight'],'动态类型'),oneOf(b.visibility||'public',flags,'可见范围'),string(b.industry,100)]);return result({item:(await posts(user,{id:ins.insertId,mine:true}))[0]},201);
    }
    if(path[0]==='posts'&&path.length===2&&method==='PATCH'){
      const pid=id(path[1]),post=(await query('SELECT * FROM posts WHERE id=?',[pid]))[0];if(!post)fail('动态不存在',404);if(post.user_id!==user.id)fail('无权修改这条动态',403);
      const status=b.status?oneOf(b.status,['published','closed']):post.status;if(post.status==='hidden'&&b.status==='published')fail('此动态已被管理员隐藏，不能自行恢复',403);
      await query('UPDATE posts SET title=?,content=?,type=?,visibility=?,industry=?,status=? WHERE id=?',[b.title!==undefined?requireString(b.title,'标题',180):post.title,b.content!==undefined?requireString(b.content,'内容',10000):post.content,b.type?oneOf(b.type,['resource','demand','insight']):post.type,b.visibility?oneOf(b.visibility,flags):post.visibility,b.industry!==undefined?string(b.industry,100):post.industry,post.status==='hidden'?'hidden':status,pid]);return result({item:(await posts(user,{id:pid,mine:true}))[0]});
    }
    if(path[0]==='posts'&&path[2]==='like'&&method==='POST'){
      const pid=id(path[1]);if(!(await posts(user,{id:pid})).length)fail('动态不存在或无权操作',404);const old=await query('SELECT 1 FROM post_likes WHERE post_id=? AND user_id=?',[pid,user.id]);if(old.length)await query('DELETE FROM post_likes WHERE post_id=? AND user_id=?',[pid,user.id]);else await query('INSERT IGNORE INTO post_likes(post_id,user_id) VALUES(?,?)',[pid,user.id]);return result({liked:!old.length,likeCount:(await query('SELECT COUNT(*) AS n FROM post_likes WHERE post_id=?',[pid]))[0].n});
    }
    if(path[0]==='posts'&&path[2]==='comments'&&method==='POST'){
      rateLimit('comments:'+user.id,20,60000);const pid=id(path[1]);const post=(await posts(user,{id:pid}))[0];if(!post)fail('动态不存在或无权评论',404);
      const content=requireString(b.content,'评论内容',2000);const ins=await query('INSERT INTO post_comments(post_id,user_id,content) VALUES(?,?,?)',[pid,user.id,content]);if(post.userId!==user.id)await notify(post.userId,'动态收到新评论',`${user.name} 评论了「${post.title}」`,'/community');return result({item:{id:ins.insertId,postId:pid,userId:user.id,ownerName:user.name,ownerAvatar:user.avatar,content,createdAt:new Date().toISOString()}},201);
    }
    if(route==='profile'&&method==='GET')return result({user});
    if(route==='profile'&&method==='PATCH'){
      if(b.location!==undefined&&b.city===undefined)b.city=b.location;
      const fields=[],values=[];for(const [key,max] of [['name',80],['avatar',500],['bio',2000],['company',160],['city',100],['industry',100],['title',120]])if(b[key]!==undefined){fields.push(key+'=?');values.push(key==='name'?requireString(b[key],'姓名',max):string(b[key],max));}
      if(b.skills!==undefined){fields.push('skills=?');values.push(JSON.stringify(strings(b.skills)));}
      if(b.visibility!==undefined){fields.push('visibility=?');values.push(oneOf(b.visibility,['public','contacts','second_degree','hidden'],'名片可见性'));}
      if(b.hideTitle!==undefined){fields.push('hide_title=?');values.push(boolean(b.hideTitle)?1:0);}
      if(b.password){if(!b.currentPassword||!await bcrypt.compare(b.currentPassword,(await query('SELECT password_hash FROM users WHERE id=?',[user.id]))[0].password_hash))fail('原密码不正确',400);if(string(b.password).length<8)fail('新密码至少 8 位');fields.push('password_hash=?');values.push(await bcrypt.hash(string(b.password,150),12));}
      if(!fields.length)fail('没有可更新的内容');await query(`UPDATE users SET ${fields.join(',')} WHERE id=?`,[...values,user.id]);return result({user:record((await query('SELECT * FROM users WHERE id=?',[user.id]))[0])});
    }
    if(route==='dashboard'&&method==='GET'){
      const stats=(await query(`SELECT (SELECT COUNT(*) FROM resources WHERE user_id=?) AS resources,(SELECT COUNT(*) FROM favorites WHERE user_id=?) AS favorites,(SELECT COUNT(*) FROM demands WHERE user_id=?) AS demands,(SELECT COUNT(*) FROM matches WHERE requester_id=? OR owner_id=?) AS matches,(SELECT COUNT(*) FROM contacts WHERE (requester_id=? OR recipient_id=?) AND status='accepted') AS contacts,(SELECT COUNT(*) FROM notifications WHERE user_id=? AND read_at IS NULL) AS notifications,(SELECT COUNT(*) FROM messages WHERE recipient_id=? AND read_at IS NULL) AS unread_messages`,[...Array(9).fill(user.id)]))[0];
      return result({stats:record(stats),resources:(await resources(user,{mine:true})).slice(0,6),notifications:(await query('SELECT * FROM notifications WHERE user_id=? ORDER BY id DESC LIMIT 5',[user.id])).map(record)});
    }
    if(route==='network'&&method==='GET')return result(await network(user));
    if(route==='contacts'&&method==='GET'){
      const rows=await query('SELECT c.*,u.id AS contact_user_id,u.name,u.avatar,u.company,u.title,u.city,u.industry,u.skills,u.hide_title FROM contacts c JOIN users u ON u.id=IF(c.requester_id=?,c.recipient_id,c.requester_id) WHERE c.requester_id=? OR c.recipient_id=? ORDER BY c.id DESC',[user.id,user.id,user.id]);return result({items:rows.map(v=>{const safe=record(v);delete safe.starredBy;delete safe.hiddenBy;return {...safe,title:v.hide_title&&v.status!=='accepted'?'':v.title,userId:v.contact_user_id,starred:json(v.starred_by).includes(user.id),hidden:json(v.hidden_by).includes(user.id),incoming:v.recipient_id===user.id};})});
    }
    if(route==='contacts'&&method==='POST'){
      const target=b.userId?(await query("SELECT id,name,visibility FROM users WHERE id=? AND status='active'",[id(b.userId)]))[0]:(await query("SELECT id,name,visibility FROM users WHERE email=? AND status='active'",[requireString(b.email,'好友邮箱',190).toLowerCase()]))[0];
      if(!target||target.visibility==='hidden')fail('未找到可添加的用户',404);if(target.id===user.id)fail('不能添加自己');
      const visible=(await network(user)).items.find(v=>v.id===target.id);if(!visible)fail('未找到可添加的用户',404);
      if(visible.degree===2){
        if((await query("SELECT id FROM introductions WHERE requester_id=? AND target_id=? AND status='pending'",[user.id,target.id])).length)fail('已有待处理的引荐申请',409);
        const intro=await query('INSERT INTO introductions(requester_id,connector_id,target_id,message) VALUES(?,?,?,?)',[user.id,visible.connectorId,target.id,string(b.message,1500)||'希望认识这位朋友，请帮忙引荐。']);await notify(visible.connectorId,'收到人脉引荐申请',`${user.name} 希望你引荐 ${target.name}`,'/network');return result({ok:true,introduction:true,id:intro.insertId,message:'已向共同好友发送引荐申请'});
      }
      const old=await query('SELECT id,status FROM contacts WHERE (requester_id=? AND recipient_id=?) OR (requester_id=? AND recipient_id=?)',[user.id,target.id,target.id,user.id]);
      if(old.length&&old[0].status!=='rejected')fail(old[0].status==='accepted'?'你们已经是好友':'好友申请已存在',409);
      if(old.length)await query("UPDATE contacts SET requester_id=?,recipient_id=?,status='pending',message=? WHERE id=?",[user.id,target.id,string(b.message,1000),old[0].id]);
      else await query("INSERT INTO contacts(requester_id,recipient_id,message,starred_by,hidden_by) VALUES(?,?,?,'[]','[]')",[user.id,target.id,string(b.message,1000)]);
      await notify(target.id,'新的好友申请',`${user.name} 请求与你建立联系`,'/dashboard/network');return result({ok:true,message:'好友申请已发送'});
    }
    if(path[0]==='contacts'&&path.length===2&&method==='PATCH'){
      const cid=id(path[1]),c=(await query('SELECT * FROM contacts WHERE id=?',[cid]))[0];if(!c||![c.requester_id,c.recipient_id].includes(user.id))fail('好友关系不存在',404);
      if(b.status){if(c.recipient_id!==user.id||c.status!=='pending')fail('只有收件人可以处理待确认申请',403);await query('UPDATE contacts SET status=? WHERE id=?',[oneOf(b.status,['accepted','rejected']),cid]);await notify(c.requester_id,'好友申请已处理',`${user.name} ${b.status==='accepted'?'接受':'拒绝'}了你的好友申请`,'/dashboard/network');}
      for(const [key,col] of [['starred','starred_by'],['hidden','hidden_by']])if(typeof b[key]==='boolean'){let values=json(c[col]).filter(v=>v!==user.id);if(b[key])values.push(user.id);await query(`UPDATE contacts SET ${col}=? WHERE id=?`,[JSON.stringify(values),cid]);}
      return result({ok:true});
    }
    if(route==='introductions'&&method==='GET')return result(list(await query("SELECT i.*,a.name AS requester_name,b.name AS connector_name,c.name AS target_name FROM introductions i JOIN users a ON a.id=i.requester_id JOIN users b ON b.id=i.connector_id JOIN users c ON c.id=i.target_id WHERE i.requester_id=? OR i.connector_id=? OR (i.target_id=? AND i.status='accepted') ORDER BY i.id DESC",[user.id,user.id,user.id])));
    if(route==='introductions'&&method==='POST'){
      const net=await network(user);const target=net.items.find(v=>v.id===id(b.targetId)&&v.degree===2);if(!target)fail('该用户不在当前可引荐的二度人脉中',403);
      if((await query("SELECT id FROM introductions WHERE requester_id=? AND target_id=? AND status='pending'",[user.id,target.id])).length)fail('已有待处理的引荐申请',409);
      const ins=await query('INSERT INTO introductions(requester_id,connector_id,target_id,message) VALUES(?,?,?,?)',[user.id,target.connectorId,target.id,requireString(b.message,'引荐说明',1500)]);await notify(target.connectorId,'收到人脉引荐申请',`${user.name} 希望你引荐 ${target.name}`,'/dashboard/network');return result({ok:true,id:ins.insertId});
    }
    if(path[0]==='introductions'&&path.length===2&&method==='PATCH'){
      const iid=id(path[1]),intro=(await query('SELECT * FROM introductions WHERE id=?',[iid]))[0];if(!intro||intro.connector_id!==user.id)fail('无权处理此引荐',403);if(intro.status!=='pending')fail('此引荐已处理',409);
      const status=oneOf(b.status,['accepted','rejected']);
      if(status==='accepted'){
        const requester=record((await query("SELECT * FROM users WHERE id=? AND status='active'",[intro.requester_id]))[0]);
        if(!requester||(await network(requester)).items.find(v=>v.id===intro.target_id&&v.connectorId===user.id&&v.degree===2)===undefined)fail('人脉关系或可见权限已变化，无法继续引荐',409);
        const existing=await query('SELECT id,status FROM contacts WHERE (requester_id=? AND recipient_id=?) OR (requester_id=? AND recipient_id=?)',[intro.requester_id,intro.target_id,intro.target_id,intro.requester_id]);
        if(!existing.length)await query("INSERT INTO contacts(requester_id,recipient_id,message,starred_by,hidden_by) VALUES(?,?,?,'[]','[]')",[intro.requester_id,intro.target_id,`由 ${user.name} 引荐：${intro.message}`]);
        else if(existing[0].status==='rejected')await query("UPDATE contacts SET requester_id=?,recipient_id=?,status='pending',message=? WHERE id=?",[intro.requester_id,intro.target_id,`由 ${user.name} 引荐：${intro.message}`,existing[0].id]);
        await notify(intro.target_id,'好友为你引荐了新朋友',`${user.name} 同意了引荐，请在好友申请中确认是否建立联系`,'/dashboard/network');
      }
      await query('UPDATE introductions SET status=? WHERE id=?',[status,iid]);await notify(intro.requester_id,'引荐申请已处理',`${user.name} ${status==='accepted'?'同意':'婉拒'}了你的引荐申请`,'/dashboard/network');return result({ok:true});
    }
    if(route==='matches'&&method==='GET')return result(list(await query('SELECT m.*,r.title AS resource_title,d.title AS demand_title,a.name AS requester_name,o.name AS owner_name FROM matches m LEFT JOIN resources r ON r.id=m.resource_id LEFT JOIN demands d ON d.id=m.demand_id JOIN users a ON a.id=m.requester_id JOIN users o ON o.id=m.owner_id WHERE m.requester_id=? OR m.owner_id=? ORDER BY m.id DESC',[user.id,user.id])));
    if(route==='matches'&&method==='POST'){
      if(Boolean(b.resourceId)===Boolean(b.demandId))fail('请选择一个资源或需求进行对接');
      let owner,title,rid=null,did=null;
      if(b.resourceId){rid=id(b.resourceId);const r=(await resources(user,{id:rid}))[0];if(!r)fail('资源不存在或无权访问',404);owner=r.userId;title=r.title;}
      else {did=id(b.demandId);const d=(await demands(user,{id:did}))[0];if(!d)fail('需求不可对接',404);owner=d.userId;title=d.title;}
      if(owner===user.id)fail('不能对接自己的资源或需求');
      const existing=await query("SELECT id FROM matches WHERE requester_id=? AND ((resource_id IS NOT NULL AND resource_id=?) OR (demand_id IS NOT NULL AND demand_id=?)) AND status IN ('pending','accepted')",[user.id,rid,did]);if(existing.length)fail('已有进行中的对接申请',409);
      const ins=await query('INSERT INTO matches(requester_id,owner_id,resource_id,demand_id,message) VALUES(?,?,?,?,?)',[user.id,owner,rid,did,requireString(b.message,'对接说明',2000)]);await notify(owner,'收到新的合作申请',`${user.name} 希望对接「${title}」`,'/dashboard/matches');return result({ok:true,id:ins.insertId},201);
    }
    if(path[0]==='matches'&&path.length===2&&method==='PATCH'){
      const mid=id(path[1]),m=(await query('SELECT * FROM matches WHERE id=?',[mid]))[0];if(!m||![m.requester_id,m.owner_id].includes(user.id))fail('对接记录不存在',404);
      const next=oneOf(b.status,['accepted','rejected','cancelled','completed']);
      if(next==='accepted'||next==='rejected'){if(m.owner_id!==user.id||m.status!=='pending')fail('只有发布者能处理待确认申请',403);}
      else if(next==='cancelled'){if(!['pending','accepted'].includes(m.status))fail('当前状态无法取消');}
      else if(m.status!=='accepted')fail('只有已接受的对接可以完成');
      await query('UPDATE matches SET status=? WHERE id=?',[next,mid]);await notify(m.requester_id===user.id?m.owner_id:m.requester_id,'合作状态已更新',`${user.name} 将对接状态更新为 ${ {accepted:'已接受',rejected:'已婉拒',cancelled:'已取消',completed:'已完成'}[next]}`,'/dashboard/matches');return result({ok:true});
    }
    if(route==='conversations'&&method==='GET'){
      const rows=await query('SELECT m.*,u.name,u.avatar,u.company FROM messages m JOIN (SELECT MAX(id) AS id FROM messages WHERE sender_id=? OR recipient_id=? GROUP BY IF(sender_id=?,recipient_id,sender_id)) latest ON latest.id=m.id JOIN users u ON u.id=IF(m.sender_id=?,m.recipient_id,m.sender_id) ORDER BY m.id DESC',[user.id,user.id,user.id,user.id]);
      const unread=await query('SELECT sender_id,COUNT(*) AS count FROM messages WHERE recipient_id=? AND read_at IS NULL GROUP BY sender_id',[user.id]);return result({items:rows.map(v=>({...record(v),userId:v.sender_id===user.id?v.recipient_id:v.sender_id,unread:unread.find(u=>u.sender_id===(v.sender_id===user.id?v.recipient_id:v.sender_id))?.count||0}))});
    }
    if(route==='messages'&&method==='GET'){
      const withId=id(search.get('with'));const items=await query('SELECT m.*,u.name AS sender_name FROM messages m JOIN users u ON u.id=m.sender_id WHERE (sender_id=? AND recipient_id=?) OR (sender_id=? AND recipient_id=?) ORDER BY m.id ASC LIMIT 300',[user.id,withId,withId,user.id]);await query('UPDATE messages SET read_at=NOW() WHERE sender_id=? AND recipient_id=? AND read_at IS NULL',[withId,user.id]);return result(list(items));
    }
    if(route==='messages'&&method==='POST'){
      rateLimit('message:'+user.id,30);const recipient=id(b.recipientId);if(recipient===user.id)fail('不能给自己发消息');
      const related=await query("SELECT id FROM contacts WHERE ((requester_id=? AND recipient_id=?) OR (requester_id=? AND recipient_id=?)) AND status='accepted' UNION SELECT id FROM matches WHERE ((requester_id=? AND owner_id=?) OR (requester_id=? AND owner_id=?)) AND status IN ('accepted','completed') LIMIT 1",[user.id,recipient,recipient,user.id,user.id,recipient,recipient,user.id]);
      if(!related.length)fail('建立好友关系或接受合作后才能发送消息',403);
      if(!(await query("SELECT id FROM users WHERE id=? AND status='active'",[recipient])).length)fail('收件人不可用',404);
      const ins=await query('INSERT INTO messages(sender_id,recipient_id,content) VALUES(?,?,?)',[user.id,recipient,requireString(b.content,'消息内容',5000)]);return result({item:record((await query('SELECT * FROM messages WHERE id=?',[ins.insertId]))[0])},201);
    }
    if(route==='notifications'&&method==='GET')return result(list(await query('SELECT * FROM notifications WHERE user_id=? ORDER BY id DESC LIMIT 100',[user.id])));
    if(route==='notifications'&&method==='PATCH'){if(b.all)await query('UPDATE notifications SET read_at=NOW() WHERE user_id=? AND read_at IS NULL',[user.id]);else await query('UPDATE notifications SET read_at=NOW() WHERE user_id=? AND id=?',[user.id,id(b.id)]);return result({ok:true});}
    if(route==='ai'&&method==='POST'){rateLimit('ai:'+user.id,12,60000);return result(await runAI(user,b));}
    if(route==='ai/models'&&method==='GET')return result(list(await query('SELECT id,name,model,is_default FROM ai_models WHERE enabled=1 ORDER BY is_default DESC,id')));
    if(route==='ai/conversations'&&method==='GET')return result(list(await query('SELECT * FROM ai_conversations WHERE user_id=? ORDER BY id DESC LIMIT 100',[user.id])));
    if(path[0]==='ai'&&path[1]==='conversations'&&path.length===3&&method==='GET'){
      const cid=id(path[2]),conversation=(await query('SELECT * FROM ai_conversations WHERE id=? AND user_id=?',[cid,user.id]))[0];if(!conversation)fail('会话不存在',404);return result({conversation:record(conversation),items:(await query('SELECT * FROM ai_messages WHERE conversation_id=? ORDER BY id',[cid])).map(record)});
    }
    if(path[0]!=='admin')fail('接口不存在',404);
    requireAdmin(user);
    const part=path[1];
    if(route==='admin/stats'&&method==='GET'){
      const row=(await query("SELECT (SELECT COUNT(*) FROM users) AS users,(SELECT COUNT(*) FROM resources) AS resources,(SELECT COUNT(*) FROM resources WHERE status='pending') AS pending_resources,(SELECT COUNT(*) FROM demands) AS demands,(SELECT COUNT(*) FROM matches) AS matches,(SELECT COUNT(*) FROM leads) AS leads,(SELECT COUNT(*) FROM ai_logs) AS ai_calls,(SELECT COUNT(*) FROM ai_logs WHERE status='success') AS ai_success,(SELECT COUNT(*) FROM contacts WHERE status='accepted') AS connections"))[0];
      const trends=await query("SELECT DATE(created_at) AS date,COUNT(*) AS count FROM ai_logs WHERE created_at>=DATE_SUB(NOW(),INTERVAL 7 DAY) GROUP BY DATE(created_at) ORDER BY date");return result({stats:record(row),trends,categories:await query('SELECT category,COUNT(*) AS count FROM resources GROUP BY category'),recentLogs:(await query('SELECT l.*,m.name AS model_name FROM ai_logs l LEFT JOIN ai_models m ON m.id=l.model_id ORDER BY l.id DESC LIMIT 8')).map(record)});
    }
    if(route==='admin/users'&&method==='GET')return result(list(await query('SELECT * FROM users ORDER BY id DESC LIMIT 300')));
    if(part==='users'&&path.length===3&&method==='PATCH'){
      const uid=id(path[2]);if(uid===user.id&&(b.status==='disabled'||b.role==='user'))fail('不能停用或降级当前管理员');if(!(await query('SELECT id FROM users WHERE id=?',[uid])).length)fail('用户不存在',404);
      if(b.status)await query('UPDATE users SET status=? WHERE id=?',[oneOf(b.status,['active','disabled']),uid]);if(b.role)await query('UPDATE users SET role=? WHERE id=?',[oneOf(b.role,['user','admin']),uid]);return result({ok:true});
    }
    if(route==='admin/resources'&&method==='GET')return result({items:await resources(user,{admin:true,status:search.get('status')||undefined,q:string(search.get('q'),100)})});
    if(part==='resources'&&path.length===3&&method==='PATCH'){
      const rid=id(path[2]),r=(await query('SELECT * FROM resources WHERE id=?',[rid]))[0];if(!r)fail('资源不存在',404);const status=oneOf(resourceStatus(b.status),['approved','pending','rejected','archived']);const reason=status==='rejected'?requireString(b.reason||b.reviewNote,'拒绝原因',1500):string(b.reason||b.reviewNote,1500);await query('UPDATE resources SET status=?,review_note=? WHERE id=?',[status,reason,rid]);await notify(r.user_id,'资源审核状态已更新',`「${r.title}」：${{approved:'审核通过',pending:'待审核',rejected:'未通过',archived:'已下架'}[status]}${reason?'。原因：'+reason:''}`,'/dashboard/resources');return result({ok:true,reviewNote:reason});
    }
    if(route==='admin/posts'&&method==='GET')return result({items:await posts(user,{admin:true,status:string(search.get('status'),30),q:string(search.get('q'),100)})});
    if(part==='posts'&&path.length===3&&method==='PATCH'){
      const pid=id(path[2]),post=(await query('SELECT * FROM posts WHERE id=?',[pid]))[0];if(!post)fail('动态不存在',404);const status=oneOf(b.status,['published','hidden']);await query('UPDATE posts SET status=? WHERE id=?',[status,pid]);await notify(post.user_id,'动态展示状态已更新',`「${post.title}」已${status==='published'?'恢复展示':'由管理员隐藏'}`,'/community');return result({ok:true});
    }
    if(route==='admin/demands'&&method==='GET')return result(list(await query('SELECT d.*,u.name AS owner_name FROM demands d JOIN users u ON u.id=d.user_id ORDER BY d.id DESC LIMIT 300')));
    if(part==='demands'&&path.length===3&&method==='PATCH'){await query('UPDATE demands SET status=? WHERE id=?',[oneOf(demandStatus(b.status),['open','closed','pending','rejected']),id(path[2])]);return result({ok:true});}
    if(route==='admin/matches'&&method==='GET')return result(list(await query('SELECT m.*,r.title AS resource_title,d.title AS demand_title,u.name AS requester_name,o.name AS owner_name FROM matches m LEFT JOIN resources r ON r.id=m.resource_id LEFT JOIN demands d ON d.id=m.demand_id JOIN users u ON u.id=m.requester_id JOIN users o ON o.id=m.owner_id ORDER BY m.id DESC LIMIT 300')));
    if(part==='matches'&&path.length===3&&method==='PATCH'){await query('UPDATE matches SET status=? WHERE id=?',[oneOf(b.status,['cancelled','completed','rejected']),id(path[2])]);return result({ok:true});}
    if(route==='admin/leads'&&method==='GET')return result(list(await query('SELECT * FROM leads ORDER BY id DESC LIMIT 300')));
    if(part==='leads'&&path.length===3&&method==='PATCH'){await query('UPDATE leads SET status=? WHERE id=?',[oneOf(b.status,['new','contacted','closed']),id(path[2])]);return result({ok:true});}
    if(route==='admin/settings'&&method==='GET')return result(await settings());
    if(route==='admin/settings'&&method==='PATCH'){
      for(const key of ['siteName','siteTagline','siteDescription','contactEmail','supportEmail','contactPhone','demoNotice','registrationEnabled','requireReview','aiDailyLimit','announcement'])if(b[key]!==undefined){let value=['registrationEnabled','requireReview'].includes(key)?boolean(b[key]):key==='aiDailyLimit'?Number(b[key]):string(b[key],2000);if(key==='aiDailyLimit'&&(!Number.isInteger(value)||value<1||value>10000))fail('AI 每日上限必须是 1–10000 的整数');if(key==='supportEmail'&&value&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value))fail('请输入有效服务邮箱');await query('INSERT INTO settings(setting_key,setting_value) VALUES(?,?) ON DUPLICATE KEY UPDATE setting_value=VALUES(setting_value)',[key,JSON.stringify(value)]);}
      return result(await settings());
    }
    if(route==='admin/models'&&method==='GET')return result({items:(await query('SELECT * FROM ai_models ORDER BY is_default DESC,id')).map(safeModel)});
    if(route==='admin/models'&&method==='POST'){
      const base=await validateBaseUrl(requireString(b.baseUrl,'API 地址',500));
      if(b.isDefault)await query('UPDATE ai_models SET is_default=0');
      const ins=await query('INSERT INTO ai_models(name,base_url,model,api_key,enabled,is_default) VALUES(?,?,?,?,?,?)',[requireString(b.name,'模型显示名称',100),base,requireString(b.model,'模型标识',160),encrypt(requireString(b.apiKey,'API 密钥',500)),b.enabled===false?0:1,b.isDefault?1:0]);return result({item:safeModel((await query('SELECT * FROM ai_models WHERE id=?',[ins.insertId]))[0])},201);
    }
    if(part==='models'&&path.length===3&&method==='PATCH'){
      const mid=id(path[2]),old=(await query('SELECT * FROM ai_models WHERE id=?',[mid]))[0];if(!old)fail('模型不存在',404);if(b.isDefault)await query('UPDATE ai_models SET is_default=0');
      await query('UPDATE ai_models SET name=?,base_url=?,model=?,api_key=?,enabled=?,is_default=? WHERE id=?',[b.name!==undefined?requireString(b.name,'显示名称',100):old.name,b.baseUrl!==undefined?await validateBaseUrl(b.baseUrl):old.base_url,b.model!==undefined?requireString(b.model,'模型标识',160):old.model,b.apiKey?encrypt(string(b.apiKey,500)):old.api_key,b.enabled!==undefined?(b.enabled?1:0):old.enabled,b.isDefault!==undefined?(b.isDefault?1:0):old.is_default,mid]);return result({item:safeModel((await query('SELECT * FROM ai_models WHERE id=?',[mid]))[0])});
    }
    if(part==='models'&&path.length===3&&method==='DELETE'){await query('DELETE FROM ai_models WHERE id=?',[id(path[2])]);return result({ok:true});}
    if(part==='models'&&path[3]==='test'&&method==='POST'){
      rateLimit('modeltest:'+user.id,30,3600000);const model=(await query('SELECT * FROM ai_models WHERE id=?',[id(path[2])]))[0];if(!model)fail('模型不存在',404);return result(await testModel(model,user.id));
    }
    if(route==='admin/ai-logs'&&method==='GET')return result(list(await query('SELECT l.*,m.name AS model_name,m.model,u.name AS user_name FROM ai_logs l LEFT JOIN ai_models m ON m.id=l.model_id LEFT JOIN users u ON u.id=l.user_id ORDER BY l.id DESC LIMIT 300')));
    if(route==='admin/apk'&&method==='GET')return result({config:await getApkConfig(),builds:await listApkBuilds(),published:await getPublishedApk()});
    if(route==='admin/apk'&&['PATCH','PUT'].includes(method))return result({config:await saveApkConfig(b)});
    if(route==='admin/apk/build'&&method==='POST'){rateLimit('apk:'+user.id,5,3600000);return result({build:await buildApk(b)});}
    if(route==='admin/apk/upload'&&method==='POST'){
      if(Number(req.headers.get('content-length')||0)>50*1024*1024)fail('APK 文件不能超过 50 MB',413);
      const form=await req.formData(),file=form.get('file');if(!file||typeof file.arrayBuffer!=='function')fail('请选择 APK 文件');if(file.size>50*1024*1024)fail('APK 文件不能超过 50 MB',413);
      return result({build:await registerUploadedApk({buffer:Buffer.from(await file.arrayBuffer()),fileName:file.name,versionName:form.get('versionName')||undefined,versionCode:form.get('versionCode')?Number(form.get('versionCode')):undefined})});
    }
    fail('接口不存在',404);
  } catch(error) {
    if(error instanceof ApiError)return result({error:error.message},error.status);
    if(error.code==='BUILD_BUSY')return result({error:error.message},409);
    if(error.code==='ER_DUP_ENTRY')return result({error:'记录已存在，请勿重复提交'},409);
    if(error.code?.startsWith('APK_')||['INVALID_CONFIG','INVALID_APK','BUILD_COMMAND_FAILED'].includes(error.code))return result({error:error.message},400);
    console.error('[api]',error.code||error.name,error.message?.replace(/(?:sk-|ak-)[A-Za-z0-9_-]{10,}/g,'[redacted]').slice(0,300));
    return result({error:'服务暂时无法完成请求，请稍后重试'},500);
  }
}

export { handler as GET, handler as POST, handler as PATCH, handler as PUT, handler as DELETE };
