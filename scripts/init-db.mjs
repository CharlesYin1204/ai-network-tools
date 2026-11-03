import { readFile, writeFile, chmod } from 'node:fs/promises';
import bcrypt from 'bcryptjs';
import { query, db } from '../lib/db.mjs';
import { encrypt } from '../lib/security.mjs';
import { categoryAliases } from '../lib/platform.mjs';

const schema=await readFile(new URL('../database/schema.sql',import.meta.url),'utf8');
for(const sql of schema.split(';').map(v=>v.trim()).filter(Boolean)) await query(sql);
const access=JSON.parse(await readFile(new URL('../data/access.json',import.meta.url),'utf8'));
async function addUser(name,email,password,role='user',extra={}) {
  const existing=await query('SELECT id FROM users WHERE email=?',[email]);if(existing.length)return existing[0].id;
  const result=await query('INSERT INTO users(name,email,password_hash,role,bio,company,city,industry,title,skills) VALUES(?,?,?,?,?,?,?,?,?,?)',[name,email,await bcrypt.hash(password,12),role,extra.bio||'此账号与资料为演示数据，用于展示熟人资源连接流程。',extra.company||'演示企业',extra.city||'深圳',extra.industry||'互联网',extra.title||'产品经理',JSON.stringify(extra.skills||['产品策划','资源连接'])]);return result.insertId;
}
const admin=await addUser('平台管理员',access.admin.email,access.admin.password,'admin');
const demo=await addUser('林知夏',access.demo.email,access.demo.password,'user',{company:'星禾设计工作室（演示）',city:'深圳',industry:'设计创意',title:'品牌设计师',skills:['品牌设计','视觉策略','空间摄影'],bio:'专注品牌与空间的视觉表达，希望用设计连接更多有趣的人。此资料为演示数据。'});
const people=[];
for(const p of [
 ['陈亦舟','chen','深圳','互联网','产品顾问',['产品策略','用户研究']],['周望舒','zhou','广州','空间运营','空间主理人',['活动策划','空间运营']],['许清和','xu','杭州','制造业','设备工程师',['设备管理','工业设计']],['宋予安','song','上海','教育培训','独立讲师',['职场沟通','数据分析']],['沈若水','shen','北京','营销传媒','营销负责人',['内容营销','渠道拓展']],['陆景行','lu','成都','摄影艺术','商业摄影师',['商业摄影','灯光布置']]
]) people.push(await addUser(p[0],p[1]+'@demo.xunfu.local',access.demo.password,'user',{city:p[2],industry:p[3],title:p[4],skills:p[5],company:p[3]+'演示工作室'}));
if(!(await query('SELECT id FROM resources LIMIT 1')).length){
 const seed=[
 ['从定位到视觉，一起让品牌被看见','专业服务','完整品牌视觉方案：品牌梳理、标志设计、核心视觉与基础应用。适合初创企业与品牌升级项目。可先交流目标与预算。','深圳',2800,'项目',['品牌设计','视觉识别'],demo,'photo-1561070791-2526d30994b5'],
 ['留一段安静时光，城中共享会客厅','空间场地','可容纳 12–20 人的小型交流空间，配有投影、白板和咖啡区，适合读书会、产品分享和小型工作坊。','广州',180,'小时',['沙龙空间','线下活动'],people[1],'photo-1497366754035-f200968a6e72'],
 ['把产品想法落地，0–1 产品咨询','专业服务','覆盖用户访谈、需求分析、业务流程与产品原型，以一次清晰的讨论开启合作。提供阶段性交付与复盘。','深圳',680,'次',['产品策略','用户研究'],people[0],'photo-1522071820081-009f0129c71c'],
 ['为灵感留一张桌，灵活共享工位','空间场地','临近地铁的明亮工位，提供高速网络、电话间及会议室预约，支持按天使用。工作日开放。','上海',65,'天',['共享办公','灵活工位'],people[3],'photo-1497366811353-6870744d04b2'],
 ['摄影器材短租，给创作更多可能','设备工具','Sony 全画幅相机及常用定焦镜头，支持当面检查器材。交接与使用规则需双方沟通确认。','成都',150,'天',['摄影器材','同城借用'],people[5],'photo-1516035069371-29a1b244cc32'],
 ['用数据讲清楚业务，Excel 实战辅导','技能知识','围绕真实业务表格，学习数据清洗、透视分析与图表呈现；支持线上一对一课程，课程内容按需求调整。','上海',200,'小时',['数据分析','技能分享'],people[3],'photo-1460925895917-afdab827c52f'],
 ['小批量打样，从草图到第一件作品','设备工具','提供桌面级 3D 打印与建模建议，适用于产品验证、结构演示和设计模型；材料及尺寸需提前沟通。','杭州',120,'件',['3D 打印','产品打样'],people[2],'photo-1581092921461-eab62e97a780'],
 ['让好产品走进更多社群','渠道资源','本地生活方式社群活动合作，适合设计、咖啡、手作与文化体验。合作方式以实际沟通为准。','北京',0,'面议',['社群合作','品牌联动'],people[4],'photo-1511632765486-a01980e01a18'],
 ['把生活的光，拍成品牌的故事','专业服务','为小众品牌、空间和独立创作者提供商业摄影服务，交付可用于官网与社交媒体的精修图片。','成都',1600,'半天',['商业摄影','空间摄影'],people[5],'photo-1452587925148-ce544e77e70d'],
 ['手冲咖啡入门，一起练习风味表达','技能知识','从研磨、水温到萃取，适合对咖啡充满好奇的新手；小班共学，欢迎带上自己的器具。','广州',160,'人',['咖啡体验','兴趣共学'],people[1],'photo-1442512595331-e89e73853f31'],
 ['闲置人体工学椅，给它一个新工位','闲置好物','工作室调整，转让维护良好的人体工学椅，支持同城自提和现场体验；具体状态以当面检查为准。','深圳',380,'件',['办公好物','循环使用'],demo,'photo-1598300042247-d088f8ab3a91'],
 ['独立开发者交流，分享产品与技术','渠道资源','组织小规模独立开发者共创交流，连接产品、设计与技术伙伴；欢迎有明确项目方向的朋友交流。','杭州',0,'面议',['共创伙伴','开发者社区'],people[2],'photo-1519389950473-47ba0277781c']
 ];
 for(const [title,category,description,location,price,unit,tags,uid,img] of seed)await query("INSERT INTO resources(user_id,title,category,description,location,price,unit,tags,image,status,demo) VALUES(?,?,?,?,?,?,?,?,?,'approved',1)",[uid,title,category,'【演示数据】'+description,location,price,unit,JSON.stringify(tags),'https://images.unsplash.com/'+img+'?auto=format&fit=crop&w=900&q=80']);
}
if(!(await query('SELECT id FROM demands LIMIT 1')).length)for(const d of [
 [people[0],'寻找懂教育行业的品牌设计伙伴','专业服务','【演示数据】计划为一个学习社区建立清晰的品牌形象，希望有教育或社区项目经验。',6000,'深圳'],
 [demo,'寻找周末小型产品分享活动空间','空间场地','【演示数据】预计 15 人，需要投影与交流区，希望周六下午使用 3 小时。',800,'深圳'],
 [people[4],'招募独立咖啡品牌联名合作伙伴','渠道资源','【演示数据】计划举办周末生活方式活动，寻找咖啡、手作、生活美学合作伙伴。',3000,'北京'],
 [people[2],'需要一位擅长产品故事的摄影师','专业服务','【演示数据】为新产品拍摄 12 张官网使用图片，欢迎沟通拍摄方案。',2500,'杭州']
])await query('INSERT INTO demands(user_id,title,category,description,budget,location,demo) VALUES(?,?,?,?,?,?,1)',d);
if(!(await query('SELECT id FROM contacts LIMIT 1')).length)for(const [a,b] of [[demo,people[0]],[demo,people[1]],[demo,people[5]],[people[0],people[2]],[people[1],people[4]],[people[5],people[3]]])await query("INSERT INTO contacts(requester_id,recipient_id,message,status,starred_by,hidden_by) VALUES(?,?,?,'accepted','[]','[]')",[a,b,'演示人脉关系']);
if(!(await query('SELECT id FROM messages LIMIT 1')).length){await query('INSERT INTO messages(sender_id,recipient_id,content) VALUES(?,?,?)',[people[0],demo,'你好知夏！看到你的品牌设计资源，想聊聊教育社区项目的合作。此消息为演示数据。']);await query('INSERT INTO notifications(user_id,title,content,link) VALUES(?,?,?,?)',[demo,'欢迎来到询赋','演示账号已准备好资源、需求与人脉。你可以体验发布、收藏、AI 助手和协作流程。','/dashboard']);}
if(!(await query('SELECT id FROM ai_models LIMIT 1')).length)for(const [name,model,def] of [['GPT 5.6 Luna','gpt-5.6-luna',1],['Claude Opus 5 Thinking','claude-opus-5-thinking',0]])await query('INSERT INTO ai_models(name,base_url,model,api_key,is_default) VALUES(?,?,?,?,?)',[name,process.env.AI_BASE_URL,model,encrypt(process.env.AI_API_KEY),def]);
const settings={siteName:'询赋',siteTagline:'让每一份价值，都遇见需要的人',siteDescription:'以 AI 连接可信人脉，让闲置资源、专业能力与真实需求相遇。',contactEmail:'hello@example.com',contactPhone:'',demoNotice:'独立产品演示，非询赋官方产品。站内初始用户、人脉与资源均为演示数据，不提供真实交易或支付。',registrationEnabled:true};
Object.assign(settings,{supportEmail:'hello@example.com',requireReview:true,aiDailyLimit:50,announcement:'欢迎体验询赋独立产品演示，站内初始资料均为演示数据。'});
for(const [k,v]of Object.entries(settings))await query('INSERT IGNORE INTO settings(setting_key,setting_value) VALUES(?,?)',[k,JSON.stringify(v)]);
for(const [oldName,newName]of Object.entries(categoryAliases))for(const table of ['resources','demands'])await query(`UPDATE ${table} SET category=? WHERE category=?`,[newName,oldName]);
await writeFile(new URL('../data/seed-summary.json',import.meta.url),JSON.stringify({adminId:admin,demoId:demo,peopleIds:people,seededAt:new Date().toISOString()},null,2));
await chmod(new URL('../data/seed-summary.json',import.meta.url),0o600);
console.log('Database schema, demonstration data and encrypted AI model configuration initialized.');
await db().end();
