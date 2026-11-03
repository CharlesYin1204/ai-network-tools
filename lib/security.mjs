import { SignJWT, jwtVerify } from 'jose';
import { randomBytes, createCipheriv, createDecipheriv } from 'node:crypto';
import { query, record } from './db.mjs';

export class ApiError extends Error { constructor(message, status = 400) { super(message); this.status = status; } }
export const fail = (message, status = 400) => { throw new ApiError(message, status); };
export function string(value, max = 2000) { return typeof value === 'string' ? value.trim().slice(0, max) : ''; }
export function requireString(value, label, max = 2000) { const result = string(value, max); if (!result) fail(`请填写${label}`); return result; }
export function id(value) { const n = Number(value); if (!Number.isSafeInteger(n) || n < 1) fail('无效的记录编号'); return n; }
export function amount(value) { const n = Number(value ?? 0); if (!Number.isFinite(n) || n < 0 || n > 999999999) fail('金额必须在 0 至 999999999 之间'); return n; }
export function boolean(value, fallback = false) { if(value===undefined||value===null)return fallback;if(typeof value==='boolean')return value;if(value===1||value==='1'||value==='true')return true;if(value===0||value==='0'||value==='false')return false;fail('布尔配置必须为 true 或 false'); }
export function strings(value,max=20) { return (Array.isArray(value)?value:typeof value==='string'?value.split(/[,，、;；\n]/):[]).map(v=>string(v,40)).filter(Boolean).slice(0,max); }
const sessionKey = () => { if (!process.env.SESSION_SECRET) throw new Error('Missing session secret'); return new TextEncoder().encode(process.env.SESSION_SECRET); };
export async function token(user) { return new SignJWT({ role: user.role }).setProtectedHeader({ alg: 'HS256' }).setSubject(String(user.id)).setIssuedAt().setExpirationTime('7d').sign(sessionKey()); }
export async function currentUser(request) {
  const cookie = request.cookies?.get('xunfu_session')?.value || request.headers.get('cookie')?.match(/(?:^|;\s*)xunfu_session=([^;]+)/)?.[1];
  if (!cookie) return null;
  try { const {payload} = await jwtVerify(cookie, sessionKey(), {algorithms:['HS256']}); const rows = await query('SELECT * FROM users WHERE id=? AND status=?', [Number(payload.sub), 'active']); return record(rows[0]); } catch { return null; }
}
export function requireUser(user) { if (!user) fail('请先登录后继续操作', 401); return user; }
export function requireAdmin(user) { requireUser(user); if (user.role !== 'admin') fail('需要管理员权限', 403); }
export function checkOrigin(request) {
  if (['GET','HEAD','OPTIONS'].includes(request.method)) return;
  const origin = request.headers.get('origin');
  const site = request.headers.get('sec-fetch-site');
  if (site === 'cross-site') fail('不允许跨站请求', 403);
  if (origin) { let parsed; try { parsed = new URL(origin); } catch { fail('无效来源',403); } if (parsed.host !== request.headers.get('host')) fail('不允许跨站请求',403); }
}
const limits = globalThis.__xunfuLimits ||= new Map();
export function rateLimit(key, max, period = 60000) {
  const now = Date.now(); let state = limits.get(key);
  if (!state || state.until < now) { state = {until:now+period,count:0}; limits.set(key,state); }
  if (++state.count > max) fail('操作太频繁，请稍后重试',429);
  if (limits.size > 10000) for (const [k,v] of limits) if (v.until < now) limits.delete(k);
}
const encryptionKey = () => { const k = Buffer.from(process.env.ENCRYPTION_KEY || '', 'hex'); if (k.length !== 32) throw new Error('Invalid encryption key'); return k; };
export function encrypt(value) { const iv = randomBytes(12); const cipher = createCipheriv('aes-256-gcm', encryptionKey(), iv); const content = Buffer.concat([cipher.update(value,'utf8'),cipher.final()]); return [iv.toString('base64'),cipher.getAuthTag().toString('base64'),content.toString('base64')].join('.'); }
export function decrypt(value) { const [iv,tag,content] = value.split('.').map(v=>Buffer.from(v,'base64')); const cipher = createDecipheriv('aes-256-gcm',encryptionKey(),iv); cipher.setAuthTag(tag); return Buffer.concat([cipher.update(content),cipher.final()]).toString('utf8'); }
export function safeModel(model) { const clean=record(model); return {...clean,lastStatus:model.last_test_status,enabled:Boolean(model.enabled),isDefault:Boolean(model.is_default),apiKeyMasked:'••••••••（已加密保存）'}; }
export async function notify(userId,title,content,link='/account/notifications') { const target=link.replace('/dashboard/network','/network').replace('/dashboard','/account');await query('INSERT INTO notifications(user_id,title,content,link) VALUES(?,?,?,?)',[userId,title,content,target]); }
