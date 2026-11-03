import {query,db} from '../lib/db.mjs';
import {categoryAliases} from '../lib/platform.mjs';

await query("ALTER TABLE users MODIFY visibility ENUM('public','contacts','second_degree','hidden') DEFAULT 'public'");
const columns=await query("SHOW COLUMNS FROM demands LIKE 'visibility'");
if(!columns.length)await query("ALTER TABLE demands ADD visibility ENUM('public','contacts','second_degree') DEFAULT 'public' AFTER location");
await query('CREATE TABLE IF NOT EXISTS ai_daily_usage(user_id INT UNSIGNED NOT NULL,usage_day DATE NOT NULL,calls INT UNSIGNED DEFAULT 0,PRIMARY KEY(user_id,usage_day)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4');
for(const [oldName,newName]of Object.entries(categoryAliases))for(const table of ['resources','demands'])await query(`UPDATE ${table} SET category=? WHERE category=?`,[newName,oldName]);
for(const [key,value]of Object.entries({supportEmail:'hello@example.com',requireReview:true,aiDailyLimit:50,announcement:'欢迎使用 AI人脉工具，完善名片并开始连接可信资源。'}))await query('INSERT IGNORE INTO settings(setting_key,setting_value) VALUES(?,?)',[key,JSON.stringify(value)]);
await query("UPDATE notifications SET link=REPLACE(REPLACE(link,'/dashboard/network','/network'),'/dashboard','/account') WHERE link LIKE '/dashboard%'");
console.log('Contract migration complete: categories preserved, second-degree profiles and private demands enabled, daily AI quota initialized.');
await db().end();
