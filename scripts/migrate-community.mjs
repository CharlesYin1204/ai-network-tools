import {readFile} from 'node:fs/promises';
import {query,db} from '../lib/db.mjs';

if(!(await query("SHOW COLUMNS FROM users LIKE 'hide_title'")).length)await query('ALTER TABLE users ADD hide_title BOOLEAN DEFAULT FALSE AFTER visibility');
if(!(await query("SHOW COLUMNS FROM resources LIKE 'review_note'")).length)await query('ALTER TABLE resources ADD review_note TEXT AFTER status');
const schema=await readFile(new URL('../database/schema.sql',import.meta.url),'utf8');
for(const sql of schema.split(';').map(v=>v.trim()).filter(v=>/^CREATE TABLE IF NOT EXISTS post/.test(v)))await query(sql);
if(!(await query('SELECT id FROM posts LIMIT 1')).length){
 const seed=[['demo@xunfu.local','分享一份品牌梳理工作清单','【演示动态】最近为初创团队整理了品牌定位与视觉表达的工作清单。你更想解决的是“让人看见”，还是“让人记住”？欢迎分享你的想法。','insight','设计创意'],['chen@demo.xunfu.local','一个想法，需要怎样的第一位合作伙伴？','【演示动态】有了初步产品想法后，我通常先确认谁有真实问题，再寻找适合一起验证的设计与技术伙伴。欢迎交流产品验证的经验。','demand','互联网'],['zhou@demo.xunfu.local','周末会客厅，留给有趣的交流','【演示动态】共享空间可以承载产品分享、读书会与小型共创活动。想把空间分享给有好想法的朋友，具体安排可以在站内交流。','resource','空间运营']];
 for(const [email,title,content,type,industry]of seed){const u=(await query('SELECT id FROM users WHERE email=?',[email]))[0];if(u)await query('INSERT INTO posts(user_id,title,content,type,industry,demo) VALUES(?,?,?,?,?,1)',[u.id,title,content,type,industry]);}
}
console.log('Community migration complete: three demonstration posts, title privacy and moderation notes ready. Existing records preserved.');
await db().end();
