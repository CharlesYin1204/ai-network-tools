import {spawn} from 'node:child_process';
import {mkdir,chmod,open} from 'node:fs/promises';
import path from 'node:path';
const dir=path.resolve('database/backups');await mkdir(dir,{recursive:true,mode:0o700});await chmod(dir,0o700);
const filename=path.join(dir,'xunfu-'+new Date().toISOString().replace(/[:.]/g,'-')+'.sql');const handle=await open(filename,'wx',0o600);
const args=['--host='+process.env.DB_HOST,'--user='+process.env.DB_USER,'--single-transaction','--skip-comments','--set-gtid-purged=OFF',process.env.DB_NAME];
const child=spawn('/usr/bin/mysqldump',args,{env:{...process.env,MYSQL_PWD:process.env.DB_PASSWORD},stdio:['ignore',handle.fd,'pipe']});let error='';child.stderr.on('data',b=>error+=b.toString());
const code=await new Promise(resolve=>child.on('close',resolve));await handle.close();if(code!==0)throw new Error('Database export failed: '+error.replace(/password[^\n]*/gi,'[redacted]'));console.log('Database snapshot saved: '+filename);
